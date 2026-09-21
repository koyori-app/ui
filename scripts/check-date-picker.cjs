// Run after typecheck and build-storybook. Uses the same Playwright setup as check-picker.cjs.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { readdirSync } = require('node:fs');
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(__dirname, '..');
const port = process.env.DATE_PICKER_TEST_PORT || '16306';
const base = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['-m', 'http.server', port, '--bind', '127.0.0.1', '--directory', root], { stdio: 'ignore' });
let browser;
(async () => {
  try {
    for (let i = 0; i < 40; i++) {
      assert.equal(server.exitCode, null, 'the dedicated test server must start');
      try { if ((await fetch(base)).ok) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    browser = await chromium.launch({ headless: true });
    const axe = readdirSync(`${root}/node_modules/.pnpm`).find(name => name.startsWith('axe-core@'));
    for (const framework of ['react', 'vue']) {
      const requirePackage = createRequire(resolve(root, `packages/${framework}/package.json`));
      const { DatePicker } = await import(pathToFileURL(resolve(root, `packages/${framework}/dist/index.js`)));
      const props = { label: '期限', locale: 'ja-JP', today: '2026-12-31', value: '2026-09-18' };
      const ssr = framework === 'react'
        ? requirePackage('react-dom/server').renderToString(requirePackage('react').createElement(DatePicker, props))
        : await requirePackage('vue/server-renderer').renderToString(requirePackage('vue').createSSRApp(DatePicker, props));
      assert(ssr.includes('2026年9月18日金曜日'), `${framework} renders the selected date on the server`);
      assert(!ssr.includes('role="grid"'), 'the calendar is mounted when opened');

      const page = await browser.newPage({ viewport: { width: 800, height: 700 }, timezoneId: 'America/Los_Angeles' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
      const trigger = page.getByRole('button', { name: /^期限/ });
      const panel = page.getByRole('dialog', { name: '期限', exact: true });
      const grid = panel.getByRole('grid', { name: '期限' });
      const date = value => grid.locator(`[data-date="${value}"]`);
      const focused = () => page.evaluate(() => document.activeElement?.getAttribute('data-date'));
      const settle = () => page.waitForTimeout(80);
      const story = async name => {
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-datepicker--${name}&viewMode=story`);
        await trigger.waitFor();
        await settle();
      };
      const open = async () => {
        await trigger.press('Enter');
        await grid.waitFor();
        await settle();
      };
      const closed = async () => {
        assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
        assert.equal(await panel.count(), 0);
        assert(await trigger.evaluate(el => el === document.activeElement));
      };

      await story('default');
      assert.equal(await trigger.innerText(), '未設定');
      assert.equal(await trigger.getAttribute('aria-haspopup'), 'dialog');
      await open();
      assert.equal(await focused(), '2026-12-31');
      assert.equal(await panel.getAttribute('id'), await trigger.getAttribute('aria-controls'));
      assert.equal(await panel.getAttribute('aria-modal'), null, 'the popup does not claim to be modal');
      assert.equal(await grid.locator('[tabindex="0"]').count(), 1);
      assert(await panel.getByRole('button', { name: 'クリア', exact: true }).isDisabled());
      await page.keyboard.press('ArrowRight');
      await settle();
      assert.equal(await focused(), '2027-01-01');
      await page.keyboard.press('Enter');
      await closed();
      assert.equal(await trigger.innerText(), '2027年1月1日金曜日');
      await open();
      assert.equal(await focused(), '2027-01-01');
      await panel.getByRole('button', { name: 'クリア', exact: true }).click();
      await closed();
      assert.equal(await trigger.innerText(), '未設定');
      await open();
      assert.equal(await focused(), '2026-12-31');
      await page.keyboard.press('PageDown');
      await settle();
      assert.equal(await focused(), '2027-01-31');
      await page.keyboard.press('PageDown');
      await settle();
      assert.equal(await focused(), '2027-02-28', 'month end is clamped by Calendar');
      await page.keyboard.press('Escape');
      await closed();
      await open();
      assert.equal(await focused(), '2026-12-31', 'cancelled navigation is reset on reopening');
      await date('2026-12-31').dispatchEvent('keydown', { key: 'Enter', isComposing: true });
      await date('2026-12-31').dispatchEvent('keydown', { key: 'Escape', keyCode: 229 });
      assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
      await panel.getByRole('button', { name: 'キャンセル' }).click();
      await closed();

      await story('controlled');
      await open();
      assert.equal(await focused(), '2026-09-18');
      await page.keyboard.press('ArrowRight');
      await settle();
      await page.keyboard.press('Space');
      await closed();
      assert.equal(await page.locator('output').innerText(), '選択: 2026-09-19 / 通知: 1');
      await open();
      await panel.getByRole('button', { name: 'クリア', exact: true }).click();
      await closed();
      assert.equal(await page.locator('output').innerText(), '選択: なし / 通知: 2');
      await open();
      await panel.getByRole('button', { name: 'キャンセル' }).click();
      await closed();
      assert.equal(await page.locator('output').innerText(), '選択: なし / 通知: 2');
      await open();
      await grid.locator('[tabindex="0"]').evaluate(el => el.blur());
      await settle();
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false', 'a real focus departure with null relatedTarget still closes');
      await open();
      await panel.getByRole('button', { name: 'キャンセル' }).focus();
      await page.keyboard.press('Tab');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      assert(await page.getByRole('button', { name: '外側の操作' }).evaluate(el => el === document.activeElement));
      await open();
      await panel.getByRole('button', { name: '前の月' }).focus();
      await page.keyboard.press('Shift+Tab');
      assert(await trigger.evaluate(el => el === document.activeElement));
      await page.keyboard.press('Shift+Tab');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      assert(await page.getByRole('button', { name: '前の操作' }).evaluate(el => el === document.activeElement));
      await open();
      await panel.getByRole('button', { name: '前の月' }).focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Escape');
      await closed();
      await open();
      await page.getByRole('button', { name: '外側の操作' }).click();
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      assert(await page.getByRole('button', { name: '外側の操作' }).evaluate(el => el === document.activeElement));
      assert.equal(await trigger.innerText(), '2027年1月1日金曜日');
      await open();
      assert.equal(await focused(), '2027-01-01');
      await page.keyboard.press('Escape');
      await closed();

      await story('presets');
      await trigger.press('ArrowDown');
      await grid.waitFor();
      await settle();
      await panel.getByRole('button', { name: '明日', exact: true }).focus();
      await page.keyboard.press('Space');
      await closed();
      assert.equal(await trigger.innerText(), '2027年1月1日金曜日');
      await open();
      await panel.getByRole('button', { name: '来月末' }).click();
      await closed();
      assert.equal(await trigger.innerText(), '2027年1月31日日曜日');
      await open();
      const preset = panel.getByRole('button', { name: '今日', exact: true });
      await preset.hover();
      assert.equal(await preset.evaluate(el => el.parentElement.style.getPropertyValue('--highlight-opacity')), '1');
      await page.addScriptTag({ path: `${root}/node_modules/.pnpm/${axe}/node_modules/axe-core/axe.min.js` });
      assert.deepEqual(await page.evaluate(async () => (await axe.run(document.querySelector('#storybook-root'))).violations.map(v => v.id)), []);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      for (const highlight of await panel.locator('[data-hover-highlight]').all()) {
        assert.equal(await highlight.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      }
      await page.emulateMedia({ reducedMotion: 'no-preference' });

      await story('range');
      await open();
      assert.equal(await focused(), '2026-09-16');
      for (const label of ['範囲外', '選択不可', '無効な候補', '不正な日付']) {
        assert(await panel.getByRole('button', { name: label, exact: true }).isDisabled());
      }
      await date('2026-09-18').click({ force: true });
      assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
      assert.equal(await trigger.innerText(), '未設定');
      await date('2026-09-18').focus();
      await page.keyboard.press('Enter');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
      await panel.getByRole('button', { name: '最小日' }).click();
      await closed();
      await open();
      await page.keyboard.press('ArrowLeft');
      await settle();
      assert.equal(await focused(), '2026-09-10');
      await panel.getByRole('button', { name: '最大日' }).click();
      await closed();
      await open();
      await page.keyboard.press('ArrowRight');
      await settle();
      assert.equal(await focused(), '2026-09-20');

      await story('disabled');
      assert(await trigger.isDisabled());
      assert.equal(await panel.count(), 0);
      await story('invalid-value');
      assert.equal(await trigger.innerText(), '未設定');
      await open();
      assert.equal(await grid.locator('[aria-selected="true"]').count(), 0);
      assert(await focused(), 'invalid today falls back to the device date');
      await story('in-field');
      assert.equal(await trigger.getAttribute('id'), 'due');
      assert.equal(await trigger.getAttribute('aria-invalid'), 'true');
      assert(await trigger.getAttribute('aria-describedby'));
      await open();
      await page.addScriptTag({ path: `${root}/node_modules/.pnpm/${axe}/node_modules/axe-core/axe.min.js` });
      assert.deepEqual(await page.evaluate(async () => (await axe.run(document.querySelector('#storybook-root'))).violations.map(v => v.id)), []);

      await story('in-dialog');
      await open();
      assert(await panel.evaluate(el => el.matches(':popover-open')));
      await page.keyboard.press('Escape');
      await closed();
      assert(await page.getByRole('dialog', { name: 'タスクの編集', exact: true }).isVisible());

      await story('bottom-edge');
      await open();
      assert.equal(await panel.getAttribute('data-side'), 'top');
      assert(await panel.evaluate(el => el.matches(':popover-open')), 'top layer escapes overflow hidden');
      for (const width of [320, 210]) {
        await page.setViewportSize({ width, height: 600 });
        await settle();
        const bounds = await panel.boundingBox();
        assert(bounds.x >= 7 && bounds.x + bounds.width <= width - 7, 'panel stays inside the viewport');
        assert(bounds.y >= 7 && bounds.y + bounds.height <= 600 - 7);
        const activeBounds = await grid.locator('[tabindex="0"]').boundingBox();
        assert(activeBounds.width >= 36, 'narrow screens preserve readable calendar cells');
        assert(activeBounds.x >= bounds.x && activeBounds.x + activeBounds.width <= bounds.x + bounds.width, 'the focused date is scrolled into view');
      }
      await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-datepicker--english&viewMode=story`);
      const englishTrigger = page.getByRole('button', { name: 'Due date: No date' });
      await englishTrigger.click();
      const englishPanel = page.getByRole('dialog', { name: 'Due date' });
      await englishPanel.getByRole('button', { name: 'Previous month' }).waitFor();
      await englishPanel.locator('[data-date="2026-12-31"]').click();
      const selectedEnglish = page.getByRole('button', { name: 'Due date: 2026-12-31' });
      await selectedEnglish.click();
      await englishPanel.getByRole('button', { name: 'Clear', exact: true }).click();
      assert(await englishTrigger.isVisible());
      assert.deepEqual(errors, []);
      await page.close();

      for (const timezoneId of ['UTC', 'Asia/Tokyo']) {
        const zoned = await browser.newPage({ timezoneId });
        await zoned.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-datepicker--selected&viewMode=story`);
        const button = zoned.getByRole('button', { name: /^期限/ });
        await button.waitFor();
        assert.equal(await button.innerText(), '2026年9月18日金曜日');
        await button.click();
        await zoned.locator('[data-date="2026-09-18"][tabindex="0"]').waitFor();
        await zoned.locator('[data-date="2026-09-19"]').click();
        assert.equal(await button.innerText(), '2026年9月19日土曜日');
        await zoned.close();
      }
      console.log(`${framework}: DatePicker SSR, selection/clear, presets, date boundaries/timezones, keyboard/focus, placement, Field/Dialog and accessibility passed.`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
