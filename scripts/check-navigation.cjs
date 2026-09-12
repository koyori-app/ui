// Run after typecheck and build-storybook; uses the browser setup documented in README.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { readdirSync } = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(__dirname, '..');
const port = process.env.NAVIGATION_TEST_PORT || '6283';
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
    const axe = readdirSync(`${root}/node_modules/.pnpm`).find(name => name.startsWith('axe-core@'));
    for (const framework of ['react', 'vue']) {
      const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
      const story = async (component, name) => {
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-${component}--${name}&viewMode=story`);
        await page.locator('#storybook-root > *').first().waitFor();
        await page.waitForTimeout(100);
      };
      const accessibility = async () => {
        await page.addScriptTag({ path: `${root}/node_modules/.pnpm/${axe}/node_modules/axe-core/axe.min.js` });
        assert.deepEqual(await page.evaluate(async () => (await axe.run(document.querySelector('#storybook-root'))).violations.map(v => v.id)), []);
      };

      await story('accordion', 'default');
      const trigger = page.getByRole('button', { name: '通知の設定', exact: true });
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      const panelId = await trigger.getAttribute('aria-controls');
      assert(await page.locator(`#${panelId}`).evaluate(el => el.hidden));
      assert.equal(await page.getByRole('link').count(), 0, 'closed content is excluded from the accessibility tree');
      await page.locator('#storybook-root').evaluate(el => el.insertAdjacentHTML('beforeend', '<button id="after-accordion">次の操作</button>'));
      await trigger.focus(); await page.keyboard.press('Tab');
      assert(await page.locator('#after-accordion').evaluate(el => el === document.activeElement), 'Tab skips closed content');
      await trigger.focus(); await trigger.press('Enter');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
      await page.keyboard.press('Tab');
      assert(await page.getByRole('link', { name: '通知のガイド' }).evaluate(el => el === document.activeElement));
      await trigger.focus(); await trigger.press('Space');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      await accessibility();

      await story('accordion', 'controlled');
      const external = page.getByRole('button', { name: '外側から切り替え' });
      await external.click();
      const input = page.getByRole('textbox', { name: 'メモ' });
      await input.fill('入力した内容');
      await external.evaluate(el => el.click());
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      assert(await trigger.evaluate(el => el === document.activeElement), 'external collapse restores focus from the content');
      await trigger.click();
      assert.equal(await input.inputValue(), '入力した内容', 'closing preserves the input and its DOM');
      assert.equal(await page.locator('output').innerText(), '開いています');

      await story('accordion', 'single-open');
      await page.getByRole('button', { name: 'メンバー', exact: true }).click();
      assert.equal(await page.getByRole('button', { expanded: true }).count(), 1);
      assert.equal(await page.getByRole('link', { name: '基本設定を編集' }).count(), 0);
      assert(await page.getByRole('link', { name: 'メンバーを管理' }).isVisible());
      await story('accordion', 'multiple-open');
      assert.equal(await page.getByRole('button', { expanded: true }).count(), 2);
      await page.getByRole('button', { name: '基本設定' }).click();
      assert.equal(await page.getByRole('button', { name: 'メンバー' }).getAttribute('aria-expanded'), 'true');
      for (const name of ['disabled', 'disabled-open']) {
        await story('accordion', name);
        assert(await trigger.isDisabled());
        assert.equal(await trigger.getAttribute('aria-expanded'), name === 'disabled-open' ? 'true' : 'false');
      }

      await story('sidebar', 'default');
      const nav = page.getByRole('navigation', { name: 'メインナビゲーション' });
      const sidebar = nav.locator('..');
      assert.equal((await sidebar.boundingBox()).width, 240);
      assert.equal((await sidebar.boundingBox()).height, 460);
      assert.equal(await sidebar.evaluate(el => getComputedStyle(el).borderRadius), '16px');
      const current = nav.getByRole('link', { name: 'Koyori UI', exact: true });
      assert.equal(await current.getAttribute('aria-current'), 'page');
      const selectedColor = await current.evaluate(el => getComputedStyle(el).backgroundColor);
      await current.hover(); await page.waitForTimeout(200);
      assert.equal(await current.evaluate(el => getComputedStyle(el).backgroundColor), selectedColor, 'hover does not change the selected color');
      assert.equal(await nav.getByRole('link', { name: 'メンバー', exact: true }).count(), 0);
      await nav.getByRole('button', { name: 'チーム', exact: true }).click();
      assert(await nav.getByRole('link', { name: 'メンバー', exact: true }).isVisible());
      const overview = nav.getByRole('link', { name: '概要', exact: true });
      await overview.click();
      assert(page.url().endsWith('#overview'), 'links keep native navigation');
      await accessibility();
      await sidebar.screenshot({ path: `/tmp/koyori-sidebar-${framework}.png` });

      await story('sidebar', 'links-only');
      const emptySlots = await nav.locator('..').evaluate(el => [el.firstElementChild, el.lastElementChild].map(slot => getComputedStyle(slot).display));
      assert.deepEqual(emptySlots, ['none', 'none']);
      const disabled = nav.getByRole('link', { name: '準備中' });
      assert.equal(await disabled.getAttribute('href'), null);
      assert.equal(await disabled.getAttribute('tabindex'), '-1');
      assert.equal(await disabled.getAttribute('aria-disabled'), 'true');
      const originalUrl = page.url();
      await disabled.evaluate(el => el.click());
      assert.equal(page.url(), originalUrl);

      await story('sidebar', 'scrollable');
      assert(await nav.evaluate(el => el.scrollHeight > el.clientHeight));
      const top = await page.getByText('プロジェクト一覧', { exact: true }).boundingBox();
      const bottom = await page.getByText('ワークスペース設定', { exact: true }).boundingBox();
      await nav.getByRole('link').last().focus();
      assert(await nav.evaluate(el => el.scrollTop > 0));
      assert.deepEqual(await page.getByText('プロジェクト一覧', { exact: true }).boundingBox(), top);
      assert.deepEqual(await page.getByText('ワークスペース設定', { exact: true }).boundingBox(), bottom);

      await page.setViewportSize({ width: 320, height: 700 });
      await story('sidebar', 'narrow');
      assert.equal((await sidebar.boundingBox()).width, 180);
      assert(await nav.evaluate(el => el.scrollWidth <= el.clientWidth), 'long labels wrap without horizontal overflow');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await story('accordion', 'open');
      assert.equal(await page.locator('#accordion-open-panel').evaluate(el => getComputedStyle(el).animationName), 'none');
      assert.equal(await trigger.locator('svg').evaluate(el => getComputedStyle(el.parentElement).transitionDuration), '0s');
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`${framework}: Accordion state, keyboard, focus and retention; Sidebar links, current/disabled state, scrolling, sizing, reduced motion and axe passed.`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
