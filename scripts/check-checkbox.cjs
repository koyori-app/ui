// Run after build-storybook. Browser setup is documented in README.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { readdirSync, readFileSync } = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(__dirname, '..');
const port = process.env.CHECKBOX_TEST_PORT || '6288';
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
    const axeSource = readFileSync(`${root}/node_modules/.pnpm/${axe}/node_modules/axe-core/axe.min.js`, 'utf8');
    for (const framework of ['react', 'vue']) {
      const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      const checkbox = page.getByRole('checkbox').first();
      const story = async name => {
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-checkbox--${name}&viewMode=story`);
        await checkbox.waitFor();
      };
      const accessibility = async () => {
        // The Storybook addon also assigns window.axe; keep our instance separate.
        await page.addScriptTag({ content: axeSource + '\nwindow.checkboxAxe = window.axe;' });
        const violations = await page.evaluate(async () => (await checkboxAxe.run(document.querySelector('#storybook-root'))).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })));
        assert.deepEqual(violations, []);
      };
      await story('default');
      assert.equal(await checkbox.getAttribute('type'), 'checkbox');
      assert.equal(await checkbox.isChecked(), false);
      const geometry = await checkbox.locator('..').boundingBox();
      assert(geometry.width >= 24 && geometry.height >= 24, 'checkbox has a usable target');
      await page.keyboard.press('Tab');
      assert(await checkbox.evaluate(el => el === document.activeElement));
      assert.equal(await checkbox.locator('+ span').evaluate(el => getComputedStyle(el).outlineWidth), '2px');

      // Sample the actual SVG transition in browser time, independent of test runner latency.
      const drawing = await checkbox.evaluate(input => {
        const path = input.parentElement.querySelector('path');
        const before = Number.parseFloat(getComputedStyle(path).strokeDashoffset);
        input.click();
        getComputedStyle(path).strokeDashoffset;
        const animations = path.getAnimations();
        const animation = animations[0];
        if (!animation) return { before, count: 0 };
        animation.pause();
        const duration = Number(animation.effect.getTiming().duration);
        animation.currentTime = duration / 2;
        const middle = Number.parseFloat(getComputedStyle(path).strokeDashoffset);
        animation.finish();
        const end = Number.parseFloat(getComputedStyle(path).strokeDashoffset);
        return { before, count: animations.length, duration, middle, end };
      });
      assert.equal(drawing.count, 1, `${framework}: SVG draws its check stroke`);
      assert.equal(drawing.before, 1);
      assert(drawing.duration > 0 && drawing.middle > 0 && drawing.middle < 1);
      assert.equal(drawing.end, 0);
      assert(await checkbox.isChecked());
      assert.equal(await page.locator('output').innerText(), '1', 'one change notification per action');
      assert.deepEqual(await checkbox.locator('..').boundingBox(), geometry, 'checking preserves geometry');
      await accessibility();
      await page.screenshot({ path: `/tmp/koyori-checkbox-${framework}.png` });
      await checkbox.press('Space');
      assert.equal(await checkbox.isChecked(), false);
      assert.equal(await page.locator('output').innerText(), '2');
      assert.equal(await checkbox.locator('..').locator('path').evaluate(el => getComputedStyle(el).opacity), '0');
      await page.getByText('タスクを完了', { exact: true }).click();
      assert(await checkbox.isChecked(), 'clicking the visible label toggles the input');
      assert.equal(await page.locator('output').innerText(), '3');

      await story('controlled');
      await checkbox.check();
      assert.equal(await page.locator('output').innerText(), '完了');
      await page.getByRole('button', { name: '外側から切り替え' }).click();
      assert.equal(await checkbox.isChecked(), false);
      await story('rejected');
      await checkbox.click();
      assert.equal(await checkbox.isChecked(), false, 'controlled state survives a rejected change');
      assert.equal(await page.locator('output').innerText(), '1');
      await checkbox.press('Space');
      assert.equal(await checkbox.isChecked(), false);
      assert.equal(await page.locator('output').innerText(), '2');
      await story('checked');
      assert(await checkbox.isChecked());
      assert.equal(await checkbox.locator('..').locator('path').evaluate(el => el.getAnimations().length), 0, 'initial checked state does not animate');

      for (const name of ['disabled', 'disabled-checked']) {
        await story(name);
        assert(await checkbox.isDisabled());
        await checkbox.evaluate(el => el.click());
        assert.equal(await checkbox.isChecked(), name === 'disabled-checked');
        assert.equal(await page.locator('output').innerText(), '0');
        await page.locator('#storybook-root').evaluate(el => el.insertAdjacentHTML('beforeend', '<button id="after-checkbox">次へ</button>'));
        await page.keyboard.press('Tab');
        assert(await page.locator('#after-checkbox').evaluate(el => el === document.activeElement));
        await accessibility();
      }
      await story('without-label');
      assert.equal(await page.getByRole('checkbox', { name: 'TASK-140 を選択', exact: true }).count(), 1);
      await accessibility();
      await story('form');
      assert.equal(await page.locator('form').evaluate(el => el.checkValidity()), false);
      await checkbox.check();
      await page.getByRole('button', { name: '送信', exact: true }).click();
      assert.equal(await page.locator('output').innerText(), '[["notifications","enabled"]]');
      await page.getByRole('button', { name: 'リセット', exact: true }).click();
      assert.equal(await checkbox.isChecked(), false, 'native form reset clears uncontrolled state');
      assert.equal(await page.locator('form').evaluate(el => el.checkValidity()), false);

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await story('default');
      await checkbox.check();
      assert.deepEqual(await checkbox.locator('..').locator('path').evaluate(el => [getComputedStyle(el).strokeDashoffset, getComputedStyle(el).transitionDuration, el.getAnimations().length]), ['0px', '0s', 0]);
      await page.emulateMedia({ forcedColors: 'active' });
      const colors = await checkbox.locator('+ span').evaluate(el => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]);
      assert.notEqual(colors[0], colors[1], 'check remains visible in forced colors');
      await page.emulateMedia({ forcedColors: 'none' });
      await page.setViewportSize({ width: 320, height: 600 });
      await story('long-label');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await accessibility();
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`${framework}: Checkbox native controls, SVG drawing, fixed size, controlled/uncontrolled state, labels, disabled, forms, reduced motion, forced colors and axe passed`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
