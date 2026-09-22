// No browser needed: node scripts/check-switch.cjs（pnpm build のあとに実行する）
// Storybook をビルド済みなら、続けてブラウザーでの検証も行う。
const assert = require('node:assert/strict');
const { readFileSync, readdirSync, existsSync } = require('node:fs');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');

const root = resolve(__dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

for (const [name, path] of [['Vue', 'packages/vue/src/generated/components/Switch/Switch.vue'], ['React', 'packages/react/src/generated/components/Switch/Switch.tsx']]) {
  const source = read(path);
  assert.match(source, /role="switch"/, `${name} 版はスイッチとして読み上げられる`);
  assert.match(source, /aria-checked/, `${name} 版は入切を伝える`);
  assert.doesNotMatch(source, /type="checkbox"/, `${name} 版はチェックボックスではない`);
  assert.match(source, /aria-describedby/, `${name} 版は Field の説明を受け取る`);
}

// 連打しても途中から戻れるよう、キーフレームではなく transition で動かす。
const css = read('components/Switch/switch.module.css');
assert.doesNotMatch(css, /@keyframes/, 'Switch はキーフレームを使わない');

for (const framework of ['vue', 'react']) {
  const dist = read(`packages/${framework}/dist/style.css`);
  // 最小化で translateX(16px) は translate(16px) に書き換わる。どちらでも X 方向の移動だけ。
  assert.match(dist, /transform:translate(X)?\(16px\)/, `${framework}: つまみは transform だけで動く`);
  const transitions = dist.match(/transition:[^;}]*/g) ?? [];
  assert.ok(transitions.some((rule) => /transform var\(--koyori-motion-fast\)/.test(rule)), `${framework}: つまみの移動を遷移させる`);
  assert.ok(transitions.some((rule) => /background-color var\(--koyori-motion-fast\)/.test(rule)), `${framework}: トラックの色を遷移させる`);
  assert.ok(/prefers-reduced-motion[^@]*?_track[^{]*\{[^}]*transition:none/i.test(dist), `${framework}: 動きを減らす設定で止める`);
  assert.ok(/forced-colors[^@]*?_track[^{]*\{[^}]*canvas/i.test(dist), `${framework}: 強制配色に対応する`);
}

console.log('Switch の生成物と配布 CSS の規則を確認しました。');

if (!['vue', 'react'].every((framework) => existsSync(resolve(root, `packages/${framework}/storybook-static/iframe.html`)))) {
  console.log('storybook-static がないため、ブラウザー検証は省きました（pnpm build-storybook のあとに再実行してください）。');
  return;
}

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const port = process.env.SWITCH_TEST_PORT || '16324';
const base = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['-u', '-m', 'http.server', port, '--bind', '127.0.0.1', '--directory', root], { stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
(async () => {
  try {
    // 自分が立てたサーバーの起動だけを待つ。別のポートの取り違えを避ける。
    await new Promise((ready, fail) => {
      let errors = '';
      const timeout = setTimeout(() => fail(new Error(`Server ${port} did not start: ${errors}`)), 5000);
      server.stderr.on('data', (chunk) => { errors += chunk; });
      server.once('error', (error) => { clearTimeout(timeout); fail(error); });
      server.once('exit', (code) => { clearTimeout(timeout); fail(new Error(`Server ${port} exited (${code}): ${errors}`)); });
      server.stdout.on('data', (chunk) => { if (chunk.toString().includes('Serving HTTP')) { clearTimeout(timeout); ready(); } });
    });
    const axe = readdirSync(resolve(root, 'node_modules/.pnpm')).find((name) => name.startsWith('axe-core@'));
    assert(axe, 'Storybook が入れた axe-core を使う');
    const axeSource = readFileSync(resolve(root, `node_modules/.pnpm/${axe}/node_modules/axe-core/axe.min.js`), 'utf8');
    browser = await chromium.launch({ headless: true });

    for (const framework of ['react', 'vue']) {
      const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      const control = page.getByRole('switch');
      const story = async (name) => {
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-switch--${name}&viewMode=story`);
        await control.waitFor();
      };
      const a11y = async (options) => {
        // Keep our instance separate from the addon, which may replace window.axe.
        await page.addScriptTag({ content: `${axeSource}\nwindow.switchAxe = window.axe;` });
        const violations = await page.evaluate(async (options) => (await window.switchAxe.run(document.querySelector('#storybook-root'), options)).violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })), options ?? {});
        assert.deepEqual(violations, []);
      };

      await story('default');
      assert.equal(await control.getAttribute('aria-checked'), 'false');
      await control.click();
      assert.equal(await control.getAttribute('aria-checked'), 'true', 'click で切り替わる');
      await control.press('Space');
      assert.equal(await control.getAttribute('aria-checked'), 'false', 'Space で切り替わる');
      await control.press('Enter');
      assert.equal(await control.getAttribute('aria-checked'), 'true', 'Enter で切り替わる');
      // ラベルの文字を押しても切り替わる。button は labelable。
      await page.getByText('メール通知', { exact: true }).click();
      assert.equal(await control.getAttribute('aria-checked'), 'false', 'ラベルの文字でも切り替わる');
      await a11y();

      await story('disabled');
      assert(await control.isDisabled());
      await control.evaluate((el) => el.click());
      assert.equal(await control.getAttribute('aria-checked'), 'true', '無効なら変わらない');
      // 無効な部品の文字は WCAG 1.4.3 の対象外。axe はこの除外を input / select / textarea の
      // ラベルでしか判定できないため、色の検査だけ外して値を直接確かめる。
      await a11y({ rules: { 'color-contrast': { enabled: false } } });
      assert.equal(await page.getByText('メール通知', { exact: true }).evaluate((el) => getComputedStyle(el).color), 'rgb(160, 155, 165)', '無効なラベルは Checkbox と同じ色');

      await story('in-field');
      const describedBy = await control.getAttribute('aria-describedby');
      assert(describedBy, 'Field の説明を指す');
      assert.equal(await page.locator(`#${describedBy}`).innerText(), '変更するとすぐに反映されます。');
      assert.equal(await control.getAttribute('id'), 'switch-notifications', 'Field の id を使う');
      await a11y();

      await story('rapid-toggle');
      for (let i = 0; i < 10; i++) await control.dispatchEvent('click');
      await page.waitForFunction(() => document.querySelector('output')?.textContent === '10');
      assert.equal(await control.getAttribute('aria-checked'), 'false', '10 回の連打で元の状態へ戻る');
      await page.getByRole('button', { name: '10 回切り替える', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('output')?.textContent === '20');
      assert.equal(await control.getAttribute('aria-checked'), 'false', '外側から 10 回動かしても状態は一致する');
      await a11y();

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await story('default');
      assert.equal(await control.locator('span').evaluate((el) => getComputedStyle(el).transitionDuration), '0s');
      await page.emulateMedia({ reducedMotion: 'no-preference' });

      assert.deepEqual(errors, []);
      await page.close();
      console.log(`${framework}: Switch の click / Space / Enter、ラベル、無効、Field 連携、連打、動きを減らす設定、axe を確認しました。`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
