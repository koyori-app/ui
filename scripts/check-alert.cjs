// No browser needed: node scripts/check-alert.cjs（pnpm build のあとに実行する）
// Storybook をビルド済みなら、続けてブラウザーでの検証も行う。
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync, readFileSync, readdirSync, existsSync } = require('node:fs');
const { execFileSync, spawn } = require('node:child_process');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const compiled = mkdtempSync(join(tmpdir(), 'koyori-alert-'));
let alert;
try {
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--ignoreConfig',
    '--module', 'commonjs', '--target', 'ES2022', '--skipLibCheck', '--outDir', compiled,
    resolve(root, 'components/Alert/alert.ts')], { stdio: 'inherit' });
  alert = require(join(compiled, 'alert.js'));
} finally {
  rmSync(compiled, { recursive: true, force: true });
}
const { alertPrefix, alertRole } = alert;

// 接頭辞は色だけに意味を頼らないための必須表示。消えてはいけない。
assert.equal(alertPrefix(undefined, undefined), 'エラー', '既定の種類はエラー');
assert.equal(alertPrefix('danger', undefined), 'エラー', 'danger の既定');
assert.equal(alertPrefix('warning', undefined), '注意', 'warning の既定');
assert.equal(alertPrefix('info', undefined), 'お知らせ', 'info の既定');
assert.equal(alertPrefix('success', undefined), '完了', 'success の既定');
assert.equal(alertPrefix('warning', '確認'), '確認', '明示した接頭辞を使う');
assert.equal(alertPrefix('info', ''), 'お知らせ', '空文字は既定に戻す');
assert.equal(alertPrefix('success', '   '), '完了', '空白だけも既定に戻す');

// 失敗と注意は割り込み、案内と完了は待たせる。
assert.equal(alertRole(undefined), 'alert', '既定は割り込んで読ませる');
assert.equal(alertRole('danger'), 'alert');
assert.equal(alertRole('warning'), 'alert');
assert.equal(alertRole('info'), 'status');
assert.equal(alertRole('success'), 'status');

const read = (path) => readFileSync(resolve(root, path), 'utf8');

for (const [name, path] of [['Vue', 'packages/vue/src/generated/components/Alert/Alert.vue'], ['React', 'packages/react/src/generated/components/Alert/Alert.tsx']]) {
  const source = read(path);
  assert.match(source, /aria-atomic="true"/, `${name} 版は接頭辞と本文をまとめて読ませる`);
  assert.doesNotMatch(source, /aria-live/, `${name} 版は role の暗黙値に任せ、aria-live を重ねない`);
  assert.match(source, /data-variant/, `${name} 版は種類を属性で出す`);
  assert.match(source, /data-variant="tertiary"/, `${name} 版の再試行は色付き背景でも読みやすい tertiary`);
  assert.match(source, /aria-label/, `${name} 版の閉じるボタンに読み上げ名がある`);
  assert.match(source, /alertRole/, `${name} 版も role を同じ判定に通す`);
}

// トークンのコントラストは値をベタ書きせず、tokens.css を読んで計算する。
const tokens = read('components/tokens.css');
const token = (name) => {
  const found = tokens.match(new RegExp(`--koyori-color-${name}:\\s*(#[0-9a-f]{6})`, 'i'));
  assert(found, `--koyori-color-${name} が tokens.css にある`);
  return found[1];
};
const channel = (value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((index) => channel(parseInt(hex.slice(index, index + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};
const text = token('text');
for (const variant of ['danger', 'warning', 'info', 'success']) {
  const color = token(variant);
  const background = token(`${variant}-subtle`);
  assert(contrast(color, background) >= 4.5, `${variant}: 接頭辞と枠線が背景に対して 4.5:1 以上（${contrast(color, background).toFixed(2)}）`);
  assert(contrast(text, background) >= 4.5, `${variant}: 本文が背景に対して 4.5:1 以上（${contrast(text, background).toFixed(2)}）`);
}

for (const framework of ['vue', 'react']) {
  const css = read(`packages/${framework}/dist/style.css`);
  assert.match(css, /--alert-color:/, `${framework}: 文字と枠線を上書きできる`);
  assert.match(css, /--alert-background:/, `${framework}: 背景を上書きできる`);
  assert.ok(/forced-colors[^{]*\{[^@]*?border-color:\s*canvastext/i.test(css), `${framework}: 強制配色で枠線を残す`);
}

console.log('Alert の接頭辞・role、生成物、トークンのコントラスト、配布 CSS の規則を確認しました。');

if (!['vue', 'react'].every((framework) => existsSync(resolve(root, `packages/${framework}/storybook-static/iframe.html`)))) {
  console.log('storybook-static がないため、ブラウザー検証は省きました（pnpm build-storybook のあとに再実行してください）。');
  return;
}

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const port = process.env.ALERT_TEST_PORT || '16322';
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
      const story = async (name) => {
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-alert--${name}&viewMode=story`);
        await page.locator('#storybook-root [data-variant]').first().waitFor();
      };
      const a11y = async () => {
        // Keep our instance separate from the addon, which may replace window.axe.
        await page.addScriptTag({ content: `${axeSource}\nwindow.alertAxe = window.axe;` });
        const violations = await page.evaluate(async () => (await window.alertAxe.run(document.querySelector('#storybook-root'))).violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })));
        assert.deepEqual(violations, []);
      };

      await story('danger');
      const live = page.getByRole('alert');
      assert.equal(await live.count(), 1, 'danger は割り込んで読ませる');
      assert.match(await live.innerText(), /^エラー保存できませんでした。/, '接頭辞と本文をまとめて読ませる');
      assert.equal(await live.getByRole('button').count(), 0, 'ボタンはライブ領域の外にある');
      assert.equal(await page.getByRole('button', { name: '再試行', exact: true }).count(), 1);
      await a11y();

      // Tab の順は 再試行 → 閉じる。
      await story('dismissible');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement?.textContent), '再試行', '最初の Tab は再試行');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), '閉じる', '次の Tab は閉じる');
      await page.keyboard.press('Enter');
      const restore = page.getByRole('button', { name: 'もう一度表示', exact: true });
      assert(await restore.evaluate((el) => el === document.activeElement), '閉じたあとのフォーカス先は利用側が決める');
      await a11y();

      await story('multiple');
      assert.equal(await page.getByRole('alert').count(), 2, 'danger と warning は alert');
      assert.equal(await page.getByRole('status').count(), 1, 'info は status');
      await a11y();

      assert.deepEqual(errors, []);
      await page.close();
      console.log(`${framework}: Alert の role の出し分け、読み上げ範囲、Tab の順、axe を確認しました。`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
