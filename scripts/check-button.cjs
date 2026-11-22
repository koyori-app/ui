// Run after build-storybook. See README for the external Playwright setup.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { readFileSync } = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(__dirname, '..');
const port = process.env.BUTTON_TEST_PORT || '16330';
const base = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['-u', '-m', 'http.server', port, '--bind', '127.0.0.1', '--directory', root], { stdio: ['ignore', 'pipe', 'ignore'] });
let browser;

// Vue は親（as-child など）と利用側の @click を配列で onClick に渡す。
assert.match(readFileSync(resolve(root, 'packages/vue/src/generated/components/Button/Button.vue'), 'utf8'), /Array\.isArray\(onClick\)/, 'Vue 版の Button が配列の onClick を順に呼ぶ');

(async () => {
  try {
    // Only use a server started by this check; an occupied port must fail.
    await new Promise((resolve, reject) => {
      server.stdout.once('data', resolve);
      server.once('error', reject);
      server.once('exit', code => reject(new Error(`Button test server exited (${code}); check port ${port}`)));
    });
    browser = await chromium.launch({ headless: true });
    for (const framework of ['react', 'vue']) {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
      const story = async id => {
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=${id}&viewMode=story`);
        await page.locator('#storybook-root button').first().waitFor();
      };
      // button と内側の面の位置・寸法、ラベルの行数、面の四隅の角丸。
      const boxes = () => page.locator('#storybook-root button').evaluateAll(buttons => buttons.map(button => {
        const surface = button.firstElementChild;
        const rect = el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, height: r.height }; };
        // ラベルは .surface の中の span にある。
        const text = [...surface.querySelectorAll('span'), surface].flatMap(el => [...el.childNodes]).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
        const range = document.createRange();
        range.selectNodeContents(text);
        const line = range.getBoundingClientRect();
        const style = getComputedStyle(surface);
        return {
          label: text.textContent.trim(), button: rect(button), surface: rect(surface),
          lines: new Set([...range.getClientRects()].map(r => Math.round(r.top))).size,
          labelCenter: line.left + line.width / 2,
          radius: [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius],
        };
      }));

      await story('components-button--narrow-row');
      const row = await boxes();
      assert.deepEqual(row.map(b => b.label), ['保存', '重大', 'キャンセル']);
      for (const b of row) {
        assert.equal(b.lines, 1, `${framework}: 狭い行でも「${b.label}」が折れない`);
        assert.equal(b.button.height, row[0].button.height, `${framework}: 「${b.label}」の高さが 1 行分`);
        assert.equal(b.surface.width, b.button.width, `${framework}: 「${b.label}」の button が縮まず、面が収まる`);
      }

      await story('components-button--full-width');
      const [wide] = await boxes();
      assert.equal(wide.button.width, 320, `${framework}: button が行の幅に広がる`);
      assert.deepEqual([wide.surface.left, wide.surface.width], [wide.button.left, wide.button.width], `${framework}: 色の付いた面が button と同じ幅になる`);
      assert(Math.abs(wide.labelCenter - (wide.surface.left + wide.surface.width / 2)) < 1, `${framework}: 広がってもラベルは中央`);

      // ButtonGroup: 隣り合う枠線を 1px 重ね、外側の角だけを丸める。
      await story('components-buttongroup--default');
      const group = await boxes();
      assert.equal(group.length, 3);
      group.forEach((b, index) => {
        assert.equal(b.surface.width, b.button.width, `${framework}: グループ内の面が button と同じ幅`);
        if (index > 0) assert.equal(b.button.left, group[index - 1].button.right - 1, `${framework}: 隣の枠線と 1px 重なる`);
        const [topLeft, topRight, bottomRight, bottomLeft] = b.radius.map(value => value !== '0px');
        assert.deepEqual([topLeft, bottomLeft, topRight, bottomRight], [index === 0, index === 0, index === 2, index === 2], `${framework}: 外側の角だけが丸い`);
      });

      // tone="danger": ghost と tertiary の文字（tertiary は枠も）を危険の色に、hover の地を danger-subtle にする。
      const token = name => page.evaluate(name => {
        const probe = document.createElement('span');
        probe.style.color = `var(${name})`;
        document.body.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      }, name);
      const open = async (id, selector) => {
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=${id}&viewMode=story`);
        await page.locator(`#storybook-root ${selector}`).first().waitFor();
        await page.mouse.move(0, 0);
        return page.locator(`#storybook-root ${selector}`).first();
      };
      const look = control => control.evaluate(el => {
        const surface = getComputedStyle(el.firstElementChild);
        return { color: getComputedStyle(el).color, background: surface.backgroundColor, border: surface.borderTopColor };
      });
      const settled = async control => { await page.waitForTimeout(250); return look(control); };
      const transparent = 'rgba(0, 0, 0, 0)';

      let control = await open('components-button--ghost-danger', 'button');
      assert.equal(await control.getAttribute('data-tone'), 'danger');
      assert.deepEqual(await look(control), { color: await token('--koyori-color-danger'), background: transparent, border: transparent }, `${framework}: ghost danger`);
      await control.hover();
      assert.equal((await settled(control)).background, await token('--koyori-color-danger-subtle'), `${framework}: ghost danger hover`);
      await page.mouse.move(0, 0);
      await page.keyboard.press('Tab');
      await page.waitForTimeout(300); // フォーカスの輪は透明から締まって現れる。
      assert.equal(await control.evaluate(el => getComputedStyle(el).outlineColor), await token('--koyori-focus-color'), `${framework}: focus ring is unchanged`);

      control = await open('components-button--tertiary-danger', 'button');
      assert.deepEqual(await look(control), { color: await token('--koyori-color-danger'), background: transparent, border: await token('--koyori-color-danger') }, `${framework}: tertiary danger`);
      await control.hover();
      assert.equal((await settled(control)).background, await token('--koyori-color-danger-subtle'), `${framework}: tertiary danger hover`);

      // 無効では赤を残さない。
      control = await open('components-button--ghost-danger-disabled', 'button');
      assert.deepEqual(await look(control), { color: await token('--koyori-color-text-disabled'), background: await token('--koyori-color-surface-disabled'), border: transparent }, `${framework}: disabled danger keeps no red`);

      // primary・secondary・danger では tone は効かない。
      control = await open('components-button--primary-with-danger-tone', 'button');
      assert.deepEqual(await look(control), { color: await token('--koyori-color-on-accent'), background: await token('--koyori-color-accent'), border: transparent }, `${framework}: tone is ignored on primary`);

      // tone を省くと data-tone を出さず、今の見た目のまま。
      control = await open('components-button--ghost', 'button');
      assert.equal(await control.getAttribute('data-tone'), null);
      assert.equal(await control.evaluate(el => getComputedStyle(el).color), await token('--koyori-color-text-secondary'));
      const tertiary = await look(await open('components-button--tertiary', 'button'));

      // href: 同じクラスと data-* の <a>。type と disabled は出さない。_blank では rel を補う。
      control = await open('components-button--link', 'a');
      assert.equal(await page.locator('#storybook-root button').count(), 0, `${framework}: href renders no <button>`);
      assert.equal(await control.getAttribute('href'), 'https://github.com/koyori-app/ui');
      assert.equal(await control.getAttribute('target'), '_blank');
      assert.equal(await control.getAttribute('rel'), 'noopener noreferrer');
      assert.equal(await control.getAttribute('data-variant'), 'tertiary');
      for (const name of ['type', 'disabled', 'aria-disabled', 'role', 'tabindex']) assert.equal(await control.getAttribute(name), null, `${framework}: link has no ${name}`);
      assert.deepEqual(await look(control), tertiary, `${framework}: a link looks like the button`);
      assert.equal(await control.evaluate(el => getComputedStyle(el).textDecorationLine), 'none');
      await control.hover();
      assert.equal((await settled(control)).background, await token('--koyori-color-accent-subtle'), `${framework}: link hover`);
      await page.mouse.move(0, 0);
      await page.keyboard.press('Tab');
      assert(await control.evaluate(el => el === document.activeElement && el.matches(':focus-visible')), `${framework}: link takes focus`);
      assert.equal(await control.evaluate(el => getComputedStyle(el).outlineWidth), '2px');

      // 無効のリンク: href を外し、aria-disabled と role="link" を付け、Tab で止まらない。見た目は無効のボタンと同じ。
      control = await open('components-button--link-disabled', 'a');
      assert.equal(await control.getAttribute('href'), null);
      assert.equal(await control.getAttribute('aria-disabled'), 'true');
      assert.equal(await control.getAttribute('role'), 'link');
      assert.equal(await control.getAttribute('tabindex'), '-1');
      const disabledLook = { color: await token('--koyori-color-text-disabled'), background: await token('--koyori-color-surface-disabled'), border: transparent };
      assert.deepEqual(await look(control), disabledLook, `${framework}: disabled link`);
      await control.hover();
      assert.deepEqual(await settled(control), disabledLook, `${framework}: disabled link has no hover`);
      await page.mouse.move(0, 0);
      await page.keyboard.press('Tab');
      assert.equal(await control.evaluate(el => el === document.activeElement), false, `${framework}: disabled link is skipped by Tab`);

      assert.deepEqual(errors, []);
      await page.close();
      console.log(`${framework}: Button narrow row, full width, ButtonGroup layout, danger tone and links passed`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
