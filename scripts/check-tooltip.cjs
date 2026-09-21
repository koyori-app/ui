// Run after build-storybook. See README for the external Playwright setup.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { readFileSync, readdirSync } = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(__dirname, '..');
const port = process.env.TOOLTIP_TEST_PORT || '16307';
const base = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['-u', '-m', 'http.server', port, '--bind', '127.0.0.1', '--directory', root], { stdio: ['ignore', 'pipe', 'ignore'] });
let browser;
(async () => {
  try {
    await new Promise((resolve, reject) => {
      server.stdout.once('data', resolve);
      server.once('error', reject);
      server.once('exit', code => reject(new Error(`Tooltip test server exited (${code}); check port ${port}`)));
    });
    browser = await chromium.launch({ headless: true });
    const axe = readdirSync(`${root}/node_modules/.pnpm`).find(name => name.startsWith('axe-core@'));
    const axeSource = readFileSync(`${root}/node_modules/.pnpm/${axe}/node_modules/axe-core/axe.min.js`, 'utf8');
    for (const framework of ['react', 'vue']) {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
      const tooltip = page.locator('[role="tooltip"]').first();
      const trigger = page.getByRole('button').first();
      const story = async name => {
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-tooltip--${name}&viewMode=story`);
        await page.locator('[role="tooltip"]').first().waitFor({ state: 'attached' });
      };
      const visible = () => tooltip.waitFor({ state: 'visible' });
      const hidden = () => tooltip.waitFor({ state: 'hidden' });
      const accessibility = async () => {
        await page.addScriptTag({ content: axeSource + '\nwindow.tooltipAxe = window.axe;' });
        assert.deepEqual(await page.evaluate(async () => (await tooltipAxe.run(document.querySelector('#storybook-root'))).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.failureSummary) }))), []);
      };
      const insideViewport = async locator => {
        const bounds = await locator.boundingBox();
        const { width, height } = page.viewportSize();
        assert(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width + 1 && bounds.y + bounds.height <= height + 1, `tooltip within ${width}x${height}: ${JSON.stringify(bounds)}`);
      };

      await story('default');
      await hidden();
      assert.equal(await trigger.getAttribute('aria-label'), 'その他の操作', 'button retains its own accessible name');
      assert.equal(await trigger.getAttribute('aria-describedby'), 'action-help');
      const cdp = await page.context().newCDPSession(page);
      const { root: domRoot } = await cdp.send('DOM.getDocument');
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: domRoot.nodeId, selector: '#storybook-root button' });
      const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
      assert.equal(nodes[0].name.value, 'その他の操作');
      assert.equal(nodes[0].description.value, 'タスクの移動・複製などを選びます。', 'hidden tooltip is already exposed as an accessible description');
      await cdp.detach();
      await trigger.hover(); await visible();
      assert.equal(await page.evaluate(() => document.activeElement.tagName), 'BODY', 'hover never takes focus');
      assert(await tooltip.evaluate(el => el.matches(':popover-open')));
      await tooltip.hover();
      await page.waitForTimeout(200);
      await visible();
      await page.mouse.move(799, 599); await hidden();
      await page.keyboard.press('Tab'); await visible();
      assert(await trigger.evaluate(el => el === document.activeElement));
      assert.equal(await trigger.evaluate(el => getComputedStyle(el).outlineWidth), '2px');
      await trigger.press('Escape'); await hidden();
      assert(await trigger.evaluate(el => el === document.activeElement), 'Escape preserves focus');
      await trigger.hover();
      await page.waitForTimeout(200); await hidden();
      await page.mouse.move(799, 599);
      await trigger.press('Tab'); await hidden();
      assert(await page.getByRole('button', { name: '次へ' }).evaluate(el => el === document.activeElement));
      await page.keyboard.press('Shift+Tab'); await visible();
      await accessibility();
      await page.mouse.move(799, 599);
      await trigger.press('Tab'); await hidden();

      for (const placement of ['top', 'bottom', 'left', 'right']) {
        await story(placement === 'top' ? 'default' : placement);
        // Place the trigger away from the edges so each requested side has room.
        await trigger.locator('..').evaluate(el => { el.style.position = 'fixed'; el.style.top = '280px'; el.style.left = '380px'; });
        await trigger.hover(); await visible();
        assert.equal(await tooltip.getAttribute('data-side'), placement);
        await insideViewport(tooltip);
      }
      await story('existing-description');
      assert.equal(await trigger.getAttribute('aria-describedby'), 'existing-description action-help');
      await trigger.focus(); await visible();
      const snapshot = await trigger.ariaSnapshot();
      assert(snapshot.includes('編集'), 'the description does not rename the button');
      await accessibility();

      for (const name of ['empty', 'disabled', 'disabled-trigger']) {
        await story(name);
        await trigger.hover({ force: true });
        await page.waitForTimeout(200); await hidden();
        assert.equal(await trigger.getAttribute('aria-describedby'), null);
        if (name !== 'disabled-trigger') { await trigger.focus(); await hidden(); }
        else assert(await trigger.isDisabled());
        await accessibility();
      }
      await story('disabled-wrapper');
      const wrapper = page.getByRole('group', { name: '削除できない理由' });
      await page.keyboard.press('Tab'); await visible();
      assert(await wrapper.evaluate(el => el === document.activeElement));
      assert.equal(await wrapper.evaluate(el => getComputedStyle(el).outlineWidth), '2px');
      assert(await page.getByRole('button', { name: '削除', exact: true }).isDisabled());
      assert.equal(await wrapper.getAttribute('aria-describedby'), 'action-help');
      await accessibility();

      await page.setViewportSize({ width: 320, height: 480 });
      await story('edges');
      for (const name of ['top', 'bottom', 'left', 'right']) {
        const button = page.getByRole('button', { name, exact: true });
        const panel = page.locator(`#edge-${name}`);
        await button.hover(); await panel.waitFor({ state: 'visible' });
        await insideViewport(panel);
        if (name === 'top') assert.equal(await panel.getAttribute('data-side'), 'bottom');
        if (name === 'right') assert.equal(await panel.getAttribute('data-side'), 'left');
        await page.keyboard.press('Escape');
        await page.mouse.move(160, 240);
        await page.waitForTimeout(180);
      }
      await story('long-text');
      await trigger.focus(); await visible();
      await insideViewport(tooltip);
      assert(await tooltip.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'long words wrap without horizontal clipping');
      await accessibility();
      await page.mouse.move(319, 479);
      await trigger.press('Tab');
      assert(await page.getByRole('button', { name: '次へ' }).evaluate(el => el === document.activeElement), 'scrollable tooltip does not add a tab stop');
      await hidden();
      await trigger.focus(); await visible();
      await page.setViewportSize({ width: 800, height: 600 });
      await insideViewport(tooltip);
      await page.mouse.move(799, 599);
      await trigger.press('Tab'); await hidden();
      assert(await page.getByRole('button', { name: '次へ' }).evaluate(el => el === document.activeElement), 'long tooltip does not add a tab stop');

      await story('clipped');
      await trigger.hover(); await visible();
      await insideViewport(tooltip);
      assert(await tooltip.evaluate(el => {
        const r = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      }), 'top layer escapes clipped and transformed ancestors');
      await page.evaluate(() => { document.body.style.height = '1800px'; });
      await page.mouse.move(799, 599);
      await trigger.focus(); await visible();
      await page.evaluate(() => window.scrollTo(0, 40));
      await insideViewport(tooltip);

      await story('in-dialog');
      await page.locator('dialog').evaluate(el => el.showModal());
      await visible();
      await trigger.press('Escape'); await hidden();
      assert(await page.locator('dialog').evaluate(el => el.open), 'Escape closes only the tooltip');
      assert(await trigger.evaluate(el => el === document.activeElement));
      await trigger.press('Escape');
      assert.equal(await page.locator('dialog').evaluate(el => el.open), false, 'next Escape still reaches the dialog');

      await story('dynamic');
      await trigger.focus(); await visible();
      await page.getByRole('button', { name: '内容を変更' }).click();
      await trigger.focus(); await visible();
      assert.equal(await tooltip.innerText(), '変更した説明');
      await page.getByRole('button', { name: '無効を切り替え' }).click();
      assert.equal(await trigger.getAttribute('aria-describedby'), null, 'disabling removes the owned description token');
      await trigger.focus(); await hidden();
      await page.getByRole('button', { name: '無効を切り替え' }).click();
      await trigger.focus(); await visible();
      assert.equal(await trigger.getAttribute('aria-describedby'), 'changing-help');
      await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
      await accessibility();
      assert.equal(await tooltip.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      assert.equal(await tooltip.evaluate(el => el.getAnimations().length), 0);
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`${framework}: Tooltip hover/focus/Escape, descriptions, disabled triggers, placements, long text, clipping, dialog, updates, reduced motion and axe passed`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
