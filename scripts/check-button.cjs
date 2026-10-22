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
        const text = [...surface.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
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

      assert.deepEqual(errors, []);
      await page.close();
      console.log(`${framework}: Button narrow row, full width and ButtonGroup layout passed`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
