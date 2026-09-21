// Run after build-storybook. See README for the external Playwright setup.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { readFileSync, readdirSync } = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(__dirname, '..');
const port = process.env.INPUT_TEST_PORT || '16307';
const base = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['-u', '-m', 'http.server', port, '--bind', '127.0.0.1', '--directory', root], { stdio: ['ignore', 'pipe', 'ignore'] });
let browser;
(async () => {
  try {
    // Only use a server started by this check; an occupied port must fail.
    await new Promise((resolve, reject) => {
      server.stdout.once('data', resolve);
      server.once('error', reject);
      server.once('exit', code => reject(new Error(`Input test server exited (${code}); check port ${port}`)));
    });
    browser = await chromium.launch({ headless: true });
    const axe = readdirSync(`${root}/node_modules/.pnpm`).find(name => name.startsWith('axe-core@'));
    const axeSource = readFileSync(`${root}/node_modules/.pnpm/${axe}/node_modules/axe-core/axe.min.js`, 'utf8');
    for (const framework of ['react', 'vue']) {
      const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
      const input = page.locator('#number-input');
      const story = async name => {
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-input--${name}&viewMode=story`);
        await input.waitFor();
      };
      const notifications = async name => JSON.parse(await page.getByTestId(name).innerText());
      const commits = () => notifications('commits');
      const valid = () => input.evaluate(el => el.validity.valid);
      const accessibility = async () => {
        await page.addScriptTag({ content: axeSource + '\nwindow.inputAxe = window.axe;' });
        assert.deepEqual(await page.evaluate(async () => (await inputAxe.run(document.querySelector('#storybook-root'))).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.failureSummary) }))), []);
      };
      for (const name of ['commit-and-blur', 'commit-and-focus-next']) {
        await story(name);
        await input.focus();
        await input.press('Enter');
        assert.deepEqual(await commits(), [5], `${framework}: ${name} commits once during synchronous focus changes`);
        assert(await input.evaluate(el => el !== document.activeElement));
        if (name === 'commit-and-focus-next') assert(await page.locator('#next-input').evaluate(el => el === document.activeElement));
        await input.focus();
        await input.press('Enter');
        assert.deepEqual(await commits(), [5, 5], 'refocusing starts a new commit');
        await input.fill('6');
        await input.press('Enter');
        assert.deepEqual(await commits(), [5, 5, 6], 'editing starts a new commit');
      }

      await story('progress');
      assert.equal(await page.getByRole('spinbutton', { name: '数値', exact: true }).count(), 1);
      assert.equal(await input.getAttribute('aria-describedby'), 'number-input-description');
      await page.keyboard.press('Tab');
      assert(await input.evaluate(el => el === document.activeElement));
      assert.equal(await input.evaluate(el => getComputedStyle(el).outlineWidth), '2px');
      await input.press('Enter');
      assert.deepEqual(await commits(), [null], 'empty commits as null');
      await input.press('Tab');
      assert.deepEqual(await commits(), [null], 'blur after Enter does not duplicate the commit');
      await input.fill('0');
      assert.deepEqual(await notifications('changes'), ['0'], 'one string change per input');
      assert.deepEqual(await commits(), [null], 'typing does not commit');
      await input.press('Enter');
      await input.press('Enter');
      assert.deepEqual(await commits(), [null, 0], 'zero is a number and repeated Enter does not duplicate');
      await input.fill('100'); await input.press('Tab');
      assert.deepEqual(await commits(), [null, 0, 100], 'max is inclusive; blur commits');
      for (const text of ['-1', '101', '0.5']) {
        await input.fill(text); await input.press('Enter');
        assert.equal(await valid(), false, `invalid progress ${text}`);
        assert.equal(await input.inputValue(), text, 'invalid input is not clamped or rounded');
        assert.equal(await input.getAttribute('aria-invalid'), 'true');
        assert(await page.locator('#number-input-error').innerText(), 'native validation message reaches Field');
        assert.deepEqual(await commits(), [null, 0, 100]);
      }
      await accessibility();
      await page.getByRole('button', { name: '0に戻す' }).click();
      assert.equal(await input.inputValue(), '0', 'external value updates the input');
      assert.equal(await valid(), true);
      assert.deepEqual(await commits(), [null, 0, 100], 'external update does not commit');
      await input.fill(''); await input.press('Enter');
      assert.deepEqual(await commits(), [null, 0, 100, null]);
      assert.equal(await input.getAttribute('aria-invalid'), null);
      await input.fill('5');
      await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true });
      await input.dispatchEvent('keydown', { key: 'Enter', keyCode: 229 });
      assert.deepEqual(await commits(), [null, 0, 100, null], 'IME Enter is not a commit');
      await input.press('ArrowUp');
      assert.equal(await input.inputValue(), '6');
      await input.press('ArrowDown');
      assert.equal(await input.inputValue(), '5');
      assert(await input.evaluate(el => el === document.activeElement));
      await input.press('Enter');
      assert.deepEqual(await commits(), [null, 0, 100, null, 5]);
      await accessibility();

      await story('decimal');
      for (const [text, accepted] of [['-2', true], ['2', true], ['-1.25', true], ['0.25', true], ['0.3', false], ['-2.25', false], ['2.25', false]]) {
        const before = await commits();
        await input.fill(text); await input.press('Enter');
        assert.equal(await valid(), accepted, `decimal boundary ${text}`);
        assert.deepEqual(await commits(), accepted ? [...before, Number(text)] : before);
      }
      await story('default-step');
      await input.fill('0.5'); await input.press('Enter');
      assert.equal(await valid(), false, 'default step is 1');
      assert.deepEqual(await commits(), []);
      await input.press('Tab');
      assert.equal(await valid(), false, 'blur preserves the default step base');
      assert.deepEqual(await commits(), [], 'blur also rejects a fractional value with default step');
      await story('any-step');
      await input.fill('-0.125'); await input.press('Enter');
      assert.deepEqual(await commits(), [-0.125], 'any step allows negative fractions');
      await input.fill('1e2'); await input.press('Enter');
      assert.deepEqual(await commits(), [-0.125, 100], 'native exponent notation');
      for (const partial of ['-', '1e', '1e999']) {
        await input.fill(''); await input.pressSequentially(partial);
        assert.equal(await input.evaluate(el => el.validity.badInput), true, `unfinished/overflow number ${partial}`);
        await input.press('Enter');
        assert.deepEqual(await commits(), [-0.125, 100], 'badInput is not an empty commit');
      }
      await input.fill(''); await input.pressSequentially('-'); await input.pressSequentially('1');
      assert.equal(await input.inputValue(), '-1', 'controlled input preserves native partial editing');
      await input.press('Enter');
      assert.deepEqual(await commits(), [-0.125, 100, -1]);

      await story('required');
      await input.press('Enter');
      assert.equal(await input.evaluate(el => el.validity.valueMissing), true);
      assert.deepEqual(await commits(), []);
      await input.fill('0'); await input.press('Tab');
      assert.deepEqual(await commits(), [0]);
      for (const name of ['disabled', 'read-only']) {
        await story(name);
        assert.equal(await input.isEditable(), false);
        await input.dispatchEvent('input');
        await input.dispatchEvent('keydown', { key: 'Enter' });
        await input.dispatchEvent('blur');
        assert.deepEqual(await commits(), []);
        assert.deepEqual(await notifications('changes'), []);
        assert.equal(await page.locator('#number-input-error').innerText(), '');
        if (name === 'disabled') {
          await page.keyboard.press('Tab');
          assert(await page.getByRole('button', { name: '0に戻す' }).evaluate(el => el === document.activeElement));
        }
        await accessibility();
      }
      await story('out-of-range');
      assert.equal(await input.getAttribute('aria-invalid'), 'true', 'initial numeric validity is exposed');
      await story('text');
      await input.fill('文字列-0.5'); await input.press('Enter'); await input.press('Tab');
      assert.deepEqual(await notifications('changes'), ['文字列-0.5']);
      assert.deepEqual(await commits(), [], 'text input does not send numeric notifications');
      for (const attribute of ['min', 'max', 'step']) assert.equal(await input.getAttribute(attribute), null);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await story('progress');
      assert.equal(await input.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      await page.locator('label').click();
      assert(await input.evaluate(el => el === document.activeElement));
      await accessibility();
      await page.screenshot({ path: `/tmp/ui-7-input-${framework}.png` });
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`${framework}: Input numeric boundaries, partial edits, notifications, IME, labels, focus, disabled/readonly, reduced motion and axe passed`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
