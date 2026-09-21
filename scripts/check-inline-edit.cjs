// After pnpm build-storybook. Reuses an installed Playwright via PLAYWRIGHT_MODULE.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { readdirSync } = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(__dirname, '..');
const port = process.env.INLINE_EDIT_TEST_PORT || '16308';
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
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      const trigger = page.getByRole('button', { name: /^タイトルを編集/ });
      const input = page.getByRole('textbox', { name: 'タイトル', exact: true });
      const save = page.getByRole('button', { name: '保存', exact: true });
      const cancel = page.getByRole('button', { name: 'キャンセル', exact: true });
      const next = page.getByRole('button', { name: '次の項目' });
      const output = page.locator('output');
      const settle = () => page.waitForTimeout(100);
      const focused = async locator => { await settle(); assert(await locator.evaluate(el => el === document.activeElement), `${framework}: expected focus on ${await locator.evaluate(el => el.outerHTML)}`); };
      const count = async (commits, cancels) => {
        await settle();
        assert((await output.innerText()).startsWith(`確定: ${commits} / 取消: ${cancels} /`), await output.innerText());
      };
      const story = async name => {
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-inlineedit--${name}&viewMode=story`);
        await page.locator('#inline-title').waitFor({ state: 'attached' });
        await settle();
      };
      const start = async () => { await trigger.click(); await focused(input); };
      const axeCheck = async () => {
        const axe = readdirSync(`${root}/node_modules/.pnpm`).find(name => name.startsWith('axe-core@'));
        await page.addScriptTag({ path: `${root}/node_modules/.pnpm/${axe}/node_modules/axe-core/axe.min.js` });
        assert.deepEqual(await page.evaluate(async () => (await axe.run(document.querySelector('#storybook-root'))).violations.map(v => v.id)), []);
      };

      await story('native-form');
      const form = page.locator('form');
      const submit = page.getByRole('button', { name: 'フォームを送信' });
      for (let attempt = 0; attempt < 2; attempt++) {
        assert(await form.evaluate(el => el.checkValidity()), `${framework}: a closed editor must not block form validation`);
        assert.equal(await form.evaluate(el => new FormData(el).has('title')), false);
        await submit.click();
        assert.equal(await output.innerText(), `送信: ${attempt * 2 + 1}`);
        await start();
        assert(await input.evaluate(el => el.willValidate), 'editing restores native validation');
        assert.equal(await form.evaluate(el => el.checkValidity()), false);
        await submit.click();
        await focused(input);
        assert.equal(await output.innerText(), `送信: ${attempt * 2 + 1}`, 'required input blocks submission while editing');
        await input.fill('有効な値');
        assert.equal(await form.evaluate(el => new FormData(el).get('title')), '有効な値');
        await submit.click();
        assert.equal(await output.innerText(), `送信: ${attempt * 2 + 2}`);
        await input.fill('');
        await input.press('Escape');
        await focused(trigger);
      }

      await story('default');
      await axeCheck();
      await trigger.focus();
      await trigger.press(' ');
      await focused(input);
      await input.fill('変更したタイトル');
      await input.press('Enter');
      await focused(trigger);
      await count(1, 0);
      assert((await trigger.innerText()).includes('変更したタイトル'));
      await start();
      await input.fill('取消する下書き');
      await next.click();
      await count(1, 0); // blur confirmation defaults to false.
      assert(await input.isVisible());
      await cancel.click();
      await focused(trigger);
      await count(1, 1);
      await start();
      assert.equal(await input.inputValue(), '変更したタイトル');
      await save.focus();
      await save.press('Enter');
      await focused(trigger);
      await count(2, 1); // Enter on a button follows native activation exactly once.

      await story('commit-on-blur');
      await start();
      await input.fill('破棄する');
      await input.press('Escape');
      // Regression: focusout can follow cancellation/hiding, after state has changed.
      await page.locator('#inline-title').dispatchEvent('focusout', { relatedTarget: null });
      await focused(trigger);
      await count(0, 1);
      await start();
      assert.equal(await input.inputValue(), '請求書を送る');
      await cancel.click();
      await focused(trigger);
      await count(0, 2); // input -> cancel must not commit on blur.
      await start();
      await input.fill('blurで保存');
      await input.press('Tab');
      await focused(save);
      await count(0, 2);
      await save.press('Tab');
      await focused(cancel);
      await cancel.press('Tab');
      await focused(next);
      await count(1, 2);
      assert((await output.innerText()).includes('理由: blur'));
      await start();
      await input.fill('クリックで保存');
      await next.click();
      await focused(next);
      await count(2, 2);

      await start();
      await input.fill('日本語入力');
      await input.dispatchEvent('compositionstart', { data: 'に' });
      await input.dispatchEvent('keydown', { key: 'Enter' });
      await input.dispatchEvent('keydown', { key: 'Escape' });
      await count(2, 2);
      await input.dispatchEvent('compositionend', { data: '日本語' });
      await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true });
      await input.dispatchEvent('keydown', { key: 'Enter', keyCode: 229 });
      await count(2, 2);
      assert(await input.isVisible());
      await input.press('Enter');
      await focused(trigger);
      await count(3, 2);

      await story('multiline');
      await start();
      await input.fill('一行目');
      await input.press('End');
      await input.press('Enter');
      await input.press('2');
      assert.equal(await input.inputValue(), '一行目\n2');
      await count(0, 0);
      await input.press('Control+Enter');
      await focused(trigger);
      await count(1, 0);
      await start();
      await input.press('Meta+Enter');
      await count(2, 0);
      await focused(trigger);

      await story('empty');
      assert((await trigger.innerText()).includes('未入力'));
      await start();
      await input.press('Enter');
      await focused(input);
      assert.equal(await input.getAttribute('aria-invalid'), 'true');
      assert((await input.getAttribute('aria-describedby')).includes('inline-title-error'));
      await axeCheck();
      await input.fill('');
      await save.click();
      await count(2, 0); // Repeating the same validation error must allow retry.
      await input.fill('有効な値');
      await save.click();
      await focused(trigger);
      await count(3, 0);

      await story('async-save');
      await start();
      await input.fill('保持する下書き');
      await input.press('Enter');
      await count(1, 0);
      assert(await input.isDisabled());
      assert(await save.isDisabled());
      assert(await cancel.isDisabled());
      assert.equal(await page.getByRole('status').first().innerText(), '保存中…');
      await input.dispatchEvent('keydown', { key: 'Enter' });
      await input.dispatchEvent('keydown', { key: 'Escape' });
      await input.dispatchEvent('focusout');
      await count(1, 0);
      // Simulate completion without moving focus to the demo's response buttons.
      await page.getByRole('button', { name: '保存を失敗させる' }).dispatchEvent('click');
      await focused(input);
      assert.equal(await input.inputValue(), '保持する下書き');
      assert.equal(await input.getAttribute('aria-invalid'), 'true');
      await axeCheck();
      await input.press('Enter');
      await count(2, 0);
      await page.getByRole('button', { name: '保存を成功させる' }).dispatchEvent('click');
      await focused(trigger);
      assert((await trigger.innerText()).includes('保持する下書き'));
      await start();
      await input.press('Enter');
      await next.click();
      await page.getByRole('button', { name: '保存を成功させる' }).dispatchEvent('click');
      await focused(next); // Async completion does not steal focus from elsewhere.

      await story('initially-editing');
      await focused(input);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await input.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      assert.equal(await save.locator('span').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      await page.setViewportSize({ width: 320, height: 640 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= 320));
      await story('disabled');
      assert(await trigger.isDisabled());
      await trigger.dispatchEvent('click');
      await count(0, 0);
      assert.equal(await input.count(), 0);
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`${framework}: InlineEdit commit/cancel, blur, IME, multiline, validation, async retry, focus, accessibility and reduced motion passed`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
