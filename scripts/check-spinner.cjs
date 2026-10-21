// No browser needed: node scripts/check-spinner.cjs（pnpm build のあとに実行する）
// Storybook をビルド済みなら、続けてブラウザーでの検証も行う。
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync, readFileSync, readdirSync, existsSync } = require('node:fs');
const { execFileSync, spawn } = require('node:child_process');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const compiled = mkdtempSync(join(tmpdir(), 'koyori-spinner-'));
let spinner;
try {
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--ignoreConfig',
    '--module', 'commonjs', '--target', 'ES2022', '--skipLibCheck', '--outDir', compiled,
    resolve(root, 'components/Spinner/spinner.ts')], { stdio: 'inherit' });
  spinner = require(join(compiled, 'spinner.js'));
} finally {
  rmSync(compiled, { recursive: true, force: true });
}
const { SPINNER_DEFAULT_LABEL, spinnerLabel, spinnerSize } = spinner;

// 読み上げ名が空の status は何も伝えない。必ず文が残ること。
assert.equal(SPINNER_DEFAULT_LABEL, '読み込み中');
assert.equal(spinnerLabel(undefined), '読み込み中', '未指定は既定');
assert.equal(spinnerLabel(''), '読み込み中', '空文字は既定に戻す');
assert.equal(spinnerLabel('   '), '読み込み中', '空白だけも既定に戻す');
assert.equal(spinnerLabel('保存中'), '保存中', '明示した文を使う');

// 直径はアイコンと同じ 16px が既定。描けない値は既定に戻す。
assert.equal(spinnerSize(undefined), 16, '未指定は 16');
assert.equal(spinnerSize(0), 16, '0 は 16');
assert.equal(spinnerSize(-4), 16, '負の値は 16');
assert.equal(spinnerSize(Number.NaN), 16, 'NaN は 16');
assert.equal(spinnerSize(Number.POSITIVE_INFINITY), 16, 'Infinity は 16');
assert.equal(spinnerSize(24), 24, '正の値はそのまま');
assert.equal(spinnerSize(20.5), 20.5, '小数もそのまま');

const read = (path) => readFileSync(resolve(root, path), 'utf8');

for (const [name, path] of [['Vue', 'packages/vue/src/generated/components/Spinner/Spinner.vue'], ['React', 'packages/react/src/generated/components/Spinner/Spinner.tsx']]) {
  const source = read(path);
  assert.match(source, /role="status"/, `${name} 版は status として読み上げる`);
  assert.doesNotMatch(source, /aria-live/, `${name} 版は role の暗黙値に任せ、aria-live を重ねない`);
  assert.match(source, /<svg[^>]*aria-hidden="true"/, `${name} 版のリングは飾りとして読み上げから外す`);
  assert.doesNotMatch(source, /xmlns/, `${name} 版の SVG に xmlns を付けない`);
  assert.match(source, /spinnerLabel/, `${name} 版も文を同じ補正に通す`);
  assert.match(source, /spinnerSize/, `${name} 版も直径を同じ補正に通す`);
  assert.match(source, /visuallyHidden/, `${name} 版は hideLabel で見た目だけ隠す`);
}

assert.match(read('components/tokens.css'), /--koyori-spinner-duration:\s*900ms/, '回転の周期はトークンで持つ');

for (const framework of ['vue', 'react']) {
  const css = read(`packages/${framework}/dist/style.css`);
  // CSS Modules はキーフレーム名にもハッシュを付ける。
  assert.match(css, /@keyframes _?koyori-spinner-rotate/, `${framework}: 回転のアニメーションがある`);
  assert.match(css, /animation:_?koyori-spinner-rotate\S* var\(--koyori-spinner-duration\) linear infinite/, `${framework}: 周期はトークンを使う`);
  assert.match(css, /--spinner-color/, `${framework}: 色を上書きできる`);
  assert.ok(/prefers-reduced-motion[^@]*?_ring[^{]*\{[^}]*animation:none/i.test(css), `${framework}: 動きを減らす設定で止める`);
  assert.ok(/forced-colors[^{]*\{[^@]*?_ring[^{]*\{[^}]*forced-color-adjust:none[^}]*canvastext/i.test(css), `${framework}: 強制配色で弧を CanvasText で描く`);
  assert.ok(/forced-colors[^{]*\{[^@]*?_track[^{]*\{[^}]*graytext/i.test(css), `${framework}: 強制配色で溝を GrayText で描く`);
}

console.log('Spinner の文言・直径の補正、生成物、配布 CSS の規則を確認しました。');

if (!['vue', 'react'].every((framework) => existsSync(resolve(root, `packages/${framework}/storybook-static/iframe.html`)))) {
  console.log('storybook-static がないため、ブラウザー検証は省きました（pnpm build-storybook のあとに再実行してください）。');
  return;
}

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const port = process.env.SPINNER_TEST_PORT || '16326';
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
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-spinner--${name}&viewMode=story`);
        await page.locator('#storybook-root svg').first().waitFor();
      };
      const a11y = async () => {
        // Keep our instance separate from the addon, which may replace window.axe.
        await page.addScriptTag({ content: `${axeSource}\nwindow.spinnerAxe = window.axe;` });
        const violations = await page.evaluate(async () => (await window.spinnerAxe.run(document.querySelector('#storybook-root'))).violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })));
        assert.deepEqual(violations, []);
      };
      const status = page.getByRole('status');
      // status は内容から名前を取らないので、ライブ領域として読まれる文（中身の文字）を見る。
      const spoken = () => status.evaluate((el) => el.textContent.trim());

      await story('default');
      assert.equal(await status.count(), 1, '読み込み中は status で伝える');
      assert.equal(await spoken(), '読み込み中', '既定の文を読ませる');
      assert.equal(await status.locator('svg').getAttribute('aria-hidden'), 'true', 'リングは飾り');
      assert.notEqual(await status.locator('svg').evaluate((el) => getComputedStyle(el).animationName), 'none', '既定では回る');
      await a11y();

      await story('hidden-label');
      assert.equal(await spoken(), '読み込み中', 'hideLabel でも読み上げの文は残る');
      const box = await status.locator('span').evaluate((el) => el.getBoundingClientRect());
      assert(box.width <= 1 && box.height <= 1, '文字は見た目だけ隠す');
      await a11y();

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await story('default');
      assert.equal(await status.locator('svg').evaluate((el) => getComputedStyle(el).animationName), 'none', '動きを減らす設定で止める');
      await page.emulateMedia({ reducedMotion: 'no-preference' });

      await story('in-button');
      const button = page.getByRole('button', { name: '保存中', exact: true });
      assert.equal(await button.count(), 1, 'ボタンの名前で状態を伝える');
      const colors = await button.evaluate((el) => [getComputedStyle(el).color, getComputedStyle(el.querySelector('svg')).color]);
      assert.equal(colors[1], colors[0], 'ボタンの中ではボタンの文字色と同じ');
      await a11y();

      await story('centered');
      assert.equal(await page.locator('[aria-busy="true"]').count(), 1, '領域全体の読み込み中は親が aria-busy で伝える');
      await a11y();

      assert.deepEqual(errors, []);
      await page.close();
      console.log(`${framework}: Spinner の読み上げ文、見た目だけ隠す文字、動きを減らす設定、ボタン内の色、axe を確認しました。`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
