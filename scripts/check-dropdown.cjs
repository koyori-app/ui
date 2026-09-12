// Run after build-storybook. PLAYWRIGHT_MODULE may point to an existing Playwright installation.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { readdirSync } = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(__dirname, '..');
const port = process.env.DROPDOWN_TEST_PORT || '6183';
const base = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['-m', 'http.server', port, '--bind', '127.0.0.1', '--directory', root], { stdio: 'ignore' });
let browser;
(async () => {
  try {
    for (let i = 0; i < 40; i++) {
      try { if ((await fetch(base)).ok) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    browser = await chromium.launch({ headless: true });
    for (const framework of ['react', 'vue']) {
      const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const story = async name => {
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-dropdown--${name}&viewMode=story`);
        await page.getByRole('button', { name: 'ワークスペース' }).waitFor();
      };
      const trigger = page.getByRole('button', { name: 'ワークスペース' });
      const panel = page.getByRole('menu', { name: 'ワークスペース' });
      await story('default');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      assert.equal(await trigger.getAttribute('aria-haspopup'), 'menu');
      const icon = trigger.locator('svg');
      assert.equal(await icon.count(), 1);
      assert.equal(await icon.evaluate(el => getComputedStyle(el.parentElement).transform), 'none');
      await trigger.click();
      await panel.waitFor();
      assert.equal(await trigger.getAttribute('aria-controls'), await panel.getAttribute('id'));
      assert(await panel.getByRole('menuitem').first().evaluate(el => el === document.activeElement));
      // Let Storybook's initial accessibility audit settle before timing motion.
      await page.waitForTimeout(1000);
      assert.equal(await icon.evaluate(el => getComputedStyle(el.parentElement).transform), 'none');
      assert.equal(await panel.getAttribute('data-side'), 'bottom');
      const rows = panel.getByRole('menuitem');
      const scrollList = panel.locator(':scope > div');
      const surface = scrollList.locator(':scope > span').first();
      // Enter from each edge: the surface should grow from that side.
      for (const side of ['left', 'right', 'top', 'bottom']) {
        const box = await panel.boundingBox();
        const x = side === 'left' ? box.x + 8 : side === 'right' ? box.x + box.width - 8 : box.x + box.width / 2;
        const y = side === 'top' ? box.y + 8 : side === 'bottom' ? box.y + box.height - 8 : box.y + box.height / 2 + 12;
        await page.mouse.move(side === 'left' ? box.x - 20 : side === 'right' ? box.x + box.width + 20 : x,
          side === 'top' ? box.y - 4 : side === 'bottom' ? box.y + box.height + 20 : y);
        await page.waitForTimeout(160);
        await page.mouse.move(x, y);
        await page.waitForTimeout(50);
        const entering = await surface.boundingBox();
        await page.waitForTimeout(350);
        const full = await surface.boundingBox();
        assert(entering.width > 0 && entering.width < full.width, `${framework}/${side}: background must grow from entry: ${JSON.stringify({entering, full, errors, css: await surface.evaluate(el => ({ transition: getComputedStyle(el).transition, style: el.parentElement.style.cssText }))})}`);
        if (side === 'right') assert(entering.x > full.x);
        if (side === 'bottom') assert(entering.y > full.y);
      }
      await rows.nth(0).hover();
      await page.waitForTimeout(350);
      const start = await surface.boundingBox();
      await rows.nth(3).hover();
      await page.waitForTimeout(70);
      const middle = await surface.boundingBox();
      await page.waitForTimeout(350);
      const end = await surface.boundingBox();
      assert(start.y < middle.y && middle.y < end.y, 'background must travel through intermediate positions');
      assert.equal(end.y, (await rows.nth(3).boundingBox()).y);
      await page.mouse.click(700, 600);
      assert.equal(await panel.count(), 0);
      await trigger.focus();
      await page.keyboard.press('ArrowDown');
      await rows.nth(0).waitFor();
      await page.waitForTimeout(60);
      assert(await rows.nth(0).evaluate(el => el === document.activeElement));
      await page.keyboard.press('End');
      await page.waitForTimeout(60);
      assert(await rows.nth(3).evaluate(el => el === document.activeElement));
      await page.keyboard.press('Enter');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      assert(await trigger.evaluate(el => el === document.activeElement));
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(60);
      assert(await rows.nth(3).evaluate(el => el === document.activeElement));
      await page.keyboard.press('Escape');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      await story('disabled-item');
      await trigger.focus();
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(60);
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(60);
      const unavailable = panel.getByRole('menuitem', { name: '共有（権限が必要）' });
      assert(await unavailable.evaluate(el => el === document.activeElement));
      assert.equal(await unavailable.getAttribute('aria-disabled'), 'true');
      await page.keyboard.press('Enter');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
      await page.keyboard.press('ArrowDown');
      assert(await panel.getByRole('menuitem', { name: '複製' }).evaluate(el => el === document.activeElement));
      await page.keyboard.press('Tab');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      await story('empty');
      await trigger.focus();
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(60);
      assert(await page.getByText('項目がありません').isVisible());
      await page.keyboard.press('Escape');
      await story('disabled');
      assert(await trigger.isDisabled());
      assert.equal(await panel.count(), 0);
      await story('long-label');
      await panel.getByRole('menuitem').nth(1).hover();
      await page.waitForTimeout(350);
      assert.equal((await surface.boundingBox()).height, (await panel.getByRole('menuitem').nth(1).boundingBox()).height);
      for (const viewportWidth of [232, 231, 180]) {
        await page.setViewportSize({ width: viewportWidth, height: 700 });
        await page.waitForTimeout(350);
        assert.equal((await panel.boundingBox()).width, Math.min(200, viewportWidth - 32));
        assert(await panel.evaluate(el => el.scrollWidth <= el.clientWidth), 'long items must wrap inside the menu');
      }
      await page.setViewportSize({ width: 800, height: 700 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await surface.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      const axe = readdirSync(`${root}/node_modules/.pnpm`).find(name => name.startsWith('axe-core@'));
      await page.addScriptTag({ path: `${root}/node_modules/.pnpm/${axe}/node_modules/axe-core/axe.min.js` });
      const violations = await page.evaluate(async () => (await axe.run(document.querySelector('#storybook-root'))).violations);
      assert.deepEqual(violations.map(v => v.id), []);
      await story('custom-icon');
      assert.equal(await icon.locator('circle').count(), 3);
      assert.equal(await icon.locator('path').count(), 0);
      await trigger.click();
      await panel.waitFor();
      assert.equal(await icon.evaluate(el => getComputedStyle(el.parentElement).transform), 'none');
      await story('no-icon');
      assert.equal(await icon.count(), 0);
      assert.equal(await trigger.locator('[aria-hidden]').count(), 0);
      await trigger.click();
      await panel.waitFor();
      await story('bottom-edge');
      await panel.waitFor();
      assert.equal(await panel.getAttribute('data-side'), 'top');
      let panelBox = await panel.boundingBox();
      let triggerBox = await trigger.boundingBox();
      assert(panelBox.y >= 8 && panelBox.y + panelBox.height <= triggerBox.y - 8);
      await page.keyboard.press('Escape');
      await trigger.focus();
      await page.keyboard.press('ArrowDown');
      await panel.waitFor();
      await page.waitForTimeout(60);
      assert.equal(await panel.getAttribute('data-side'), 'top');
      assert(await panel.getByRole('menuitem').first().evaluate(el => el === document.activeElement));

      // Exact-fit boundary, one pixel less, and an open panel following resize/scroll.
      await story('open');
      await panel.waitFor();
      panelBox = await panel.boundingBox();
      triggerBox = await trigger.boundingBox();
      const exactTop = 700 - triggerBox.height - panelBox.height - 16;
      const moveTrigger = async top => {
        await trigger.evaluate((el, top) => {
          el.parentElement.style.cssText = `position: fixed; top: ${top}px; left: 16px`;
          window.dispatchEvent(new Event('resize'));
        }, top);
      };
      await moveTrigger(exactTop);
      assert.equal(await panel.getAttribute('data-side'), 'bottom');
      await moveTrigger(exactTop + 1);
      assert.equal(await panel.getAttribute('data-side'), 'top');
      await moveTrigger(300);
      assert.equal(await panel.getAttribute('data-side'), 'bottom');
      await page.setViewportSize({ width: 800, height: 500 });
      await page.waitForTimeout(60);
      assert.equal(await panel.getAttribute('data-side'), 'top');
      await page.setViewportSize({ width: 800, height: 700 });
      await page.waitForTimeout(60);
      assert.equal(await panel.getAttribute('data-side'), 'bottom');
      await trigger.evaluate(el => {
        document.body.style.height = '1400px';
        el.parentElement.style.cssText = 'position: absolute; top: 500px; left: 16px';
        window.dispatchEvent(new Event('resize'));
      });
      assert.equal(await panel.getAttribute('data-side'), 'top');
      await page.evaluate(() => window.scrollTo(0, 400));
      await page.waitForTimeout(60);
      assert.equal(await panel.getAttribute('data-side'), 'bottom');

      await story('scrollable');
      await panel.waitFor();
      await moveTrigger(130);
      await page.setViewportSize({ width: 800, height: 240 });
      await page.waitForTimeout(60);
      assert.equal(await panel.getAttribute('data-side'), 'top');
      panelBox = await panel.boundingBox();
      assert(panelBox.y >= 8 && panelBox.y + panelBox.height <= 240 - 8);
      assert(await scrollList.evaluate(el => el.scrollHeight > el.clientHeight));
      await trigger.focus();
      await page.keyboard.press('End');
      await page.waitForTimeout(60);
      assert(await panel.getByRole('menuitem').last().evaluate(el => el === document.activeElement));
      assert(await scrollList.evaluate(el => el.scrollTop > 0));

      await page.setViewportSize({ width: 800, height: 700 });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await story('actions');
      await trigger.focus();
      await trigger.press('Enter');
      await rows.first().waitFor();
      await page.waitForTimeout(80);
      assert(await rows.first().evaluate(el => el === document.activeElement));
      await page.keyboard.press('Tab');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      assert(await page.getByRole('button', { name: '次の操作' }).evaluate(el => el === document.activeElement));
      await trigger.focus();
      await trigger.press('Space');
      await rows.first().waitFor();
      await page.waitForTimeout(80);
      await page.keyboard.press('Shift+Tab');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      assert(await page.getByRole('button', { name: '前の操作' }).evaluate(el => el === document.activeElement));
      await trigger.click();
      await rows.first().waitFor();
      await rows.first().click();
      assert.equal(await page.locator('output').innerText(), '操作: recent');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      assert.equal(await trigger.innerText(), 'ワークスペース');
      await trigger.click();
      await rows.first().waitFor();
      assert.equal(await panel.locator('[aria-selected], [aria-pressed], [data-selected]').count(), 0);
      await rows.first().dispatchEvent('keydown', { key: 'プ' });
      assert(await rows.last().evaluate(el => el === document.activeElement));
      await page.keyboard.press('Space');
      assert.equal(await page.locator('output').innerText(), '操作: private');

      await story('two-menus');
      const other = page.getByRole('button', { name: '別の操作' });
      assert.notEqual(await trigger.getAttribute('aria-controls'), await other.getAttribute('aria-controls'));
      await trigger.click();
      await panel.waitFor();
      await other.click();
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      await page.getByRole('menu', { name: '別の操作' }).waitFor();
      await page.addScriptTag({ path: `${root}/node_modules/.pnpm/${axe}/node_modules/axe-core/axe.min.js` });
      assert.deepEqual(await page.evaluate(async () => (await axe.run(document.querySelector('#storybook-root'))).violations.map(v => v.id)), []);
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`${framework}: action menus, ARIA, focus/Tab, icons, placement, hover, keyboard, disabled/empty, reduced motion and axe passed`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
