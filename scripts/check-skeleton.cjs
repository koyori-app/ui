// No browser needed: node scripts/check-skeleton.cjs（pnpm build のあとに実行する）
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync, readFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const compiled = mkdtempSync(join(tmpdir(), 'koyori-skeleton-'));
let skeleton;
try {
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--ignoreConfig',
    '--module', 'commonjs', '--target', 'ES2022', '--skipLibCheck', '--outDir', compiled,
    resolve(root, 'components/Skeleton/skeleton.ts')], { stdio: 'inherit' });
  skeleton = require(join(compiled, 'skeleton.js'));
} finally {
  rmSync(compiled, { recursive: true, force: true });
}
const { skeletonLineCount, skeletonLines } = skeleton;

// 行数は必ず 1 以上の整数にする。行の配列が空や小数長になると描画が壊れる。
assert.equal(skeletonLineCount(undefined), 1, '未指定は 1 行');
assert.equal(skeletonLineCount(0), 1, '0 は 1 行');
assert.equal(skeletonLineCount(-1), 1, '負の値は 1 行');
assert.equal(skeletonLineCount(Number.NaN), 1, '数値でない値は 1 行');
assert.equal(skeletonLineCount(Number.POSITIVE_INFINITY), 1, 'Infinity は 1 行');
assert.equal(skeletonLineCount(2.7), 2, '小数は切り捨てる');
assert.equal(skeletonLineCount(3), 3, '整数はそのまま使う');
assert.deepEqual(skeletonLines(3), [0, 1, 2], '行数ぶんの添字を返す');
assert.deepEqual(skeletonLines(undefined), [0], '未指定でも 1 行ぶん返す');

const read = (path) => readFileSync(resolve(root, path), 'utf8');

for (const [name, path] of [['Vue', 'packages/vue/src/generated/components/Skeleton/Skeleton.vue'], ['React', 'packages/react/src/generated/components/Skeleton/Skeleton.tsx']]) {
  const source = read(path);
  assert.match(source, /aria-hidden="true"/, `${name} 版は飾りとして読み上げから外す`);
  assert.doesNotMatch(source, /\brole=/, `${name} 版は role を持たない`);
  assert.doesNotMatch(source, /aria-live/, `${name} 版は live region を作らない`);
  assert.match(source, /data-last/, `${name} 版は最後の行に目印を付ける`);
  assert.match(source, /skeletonLineCount/, `${name} 版も行数を同じ補正に通す`);
}

for (const framework of ['vue', 'react']) {
  const css = read(`packages/${framework}/dist/style.css`);
  assert.match(css, /@keyframes/, `${framework}: 点滅のアニメーションがある`);
  assert.match(css, /prefers-reduced-motion[^}]*animation:none/, `${framework}: 動きを減らす設定で止める`);
  assert.ok(/forced-colors[^{]*\{[^@]*?border:[^;}]*graytext/i.test(css),
    `${framework}: 強制配色で枠線を引き、位置が分かるようにする`);
  assert.match(css, /--skeleton-background:/, `${framework}: 塗りを上書きできる`);
  assert.match(css, /--skeleton-border:/, `${framework}: 縁を上書きできる`);
}

console.log('Skeleton の行数の計算、生成物、配布 CSS の規則を確認しました。');

// ここから先は Storybook のビルドが要る。未ビルドなら静的な検証だけで終える。
const { existsSync } = require('node:fs');
const { spawn } = require('node:child_process');
const { readdirSync } = require('node:fs');
if (!['vue', 'react'].every((framework) => existsSync(resolve(root, `packages/${framework}/storybook-static/iframe.html`)))) {
  console.log('storybook-static がないため、ブラウザー検証は省きました（pnpm build-storybook のあとに再実行してください）。');
  return;
}

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const port = process.env.SKELETON_TEST_PORT || '16320';
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
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-skeleton--${name}&viewMode=story`);
        await page.locator('#storybook-root [aria-hidden="true"]').first().waitFor();
      };
      const shapes = page.locator('#storybook-root [aria-hidden="true"]');

      await story('card');
      assert.equal(await page.locator('[aria-busy="true"]').count(), 1, '読み込み中は領域が伝える');
      assert.equal(await shapes.locator('[role], [aria-live]').count(), 0, 'Skeleton は読み上げ対象を持たない');
      // Keep our instance separate from the addon, which may replace window.axe.
      await page.addScriptTag({ content: `${axeSource}\nwindow.skeletonAxe = window.axe;` });
      const violations = await page.evaluate(async () => (await window.skeletonAxe.run(document.querySelector('#storybook-root'))).violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })));
      assert.deepEqual(violations, []);
      assert.notEqual(await shapes.first().evaluate((el) => getComputedStyle(el).animationName), 'none', '既定では点滅する');

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await story('card');
      assert.equal(await shapes.first().evaluate((el) => getComputedStyle(el).animationName), 'none', '動きを減らす設定で点滅を止める');
      await page.emulateMedia({ reducedMotion: 'no-preference' });

      await story('text');
      const lines = page.locator('#storybook-root [data-lines] > div');
      assert.equal(await lines.count(), 3, 'lines の数だけ行を描く');
      const widths = await lines.evaluateAll((elements) => elements.map((el) => el.getBoundingClientRect().width));
      assert.equal(widths[0], widths[1], '途中の行は同じ幅');
      assert(widths[2] < widths[0], '最後の行だけ短くする');

      assert.deepEqual(errors, []);
      await page.close();
      console.log(`${framework}: Skeleton の読み上げ属性、行の幅、動きを減らす設定、axe を確認しました。`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
