// No browser needed: node scripts/check-meter.cjs（pnpm build のあとに実行する）
// Storybook をビルド済みなら、続けてブラウザーでの検証も行う。
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync, readFileSync, readdirSync, existsSync } = require('node:fs');
const { execFileSync, spawn } = require('node:child_process');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const compiled = mkdtempSync(join(tmpdir(), 'koyori-meter-'));
let meter;
try {
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--ignoreConfig',
    '--module', 'commonjs', '--target', 'ES2022', '--skipLibCheck', '--outDir', compiled,
    resolve(root, 'components/Meter/meter.ts')], { stdio: 'inherit' });
  meter = require(join(compiled, 'meter.js'));
} finally {
  rmSync(compiled, { recursive: true, force: true });
}
const { meterMax, meterValue, meterTone, meterSegments } = meter;

// 段の数は必ず 1..20 の整数。表示と aria-valuemax が同じ値を使う。
assert.equal(meterMax(undefined), 3, '未指定は 3 段');
assert.equal(meterMax(0), 3, '0 は 3 段');
assert.equal(meterMax(0.5), 3, '1 未満は 3 段');
assert.equal(meterMax(-2), 3, '負の値は 3 段');
assert.equal(meterMax(Number.NaN), 3, 'NaN は 3 段');
assert.equal(meterMax(Number.POSITIVE_INFINITY), 3, 'Infinity は 3 段');
assert.equal(meterMax(1), 1, '1 段も描ける');
assert.equal(meterMax(5.9), 5, '小数は切り捨てる');
assert.equal(meterMax(20), 20, '上限ちょうどは許す');
assert.equal(meterMax(21), 20, '上限を超えたら 20 段');

// 満たした段は 0..max の整数。
assert.equal(meterValue(2, 3), 2);
assert.equal(meterValue(2.9, 3), 2, '小数は切り捨てる');
assert.equal(meterValue(-1, 3), 0, '負の値は 0');
assert.equal(meterValue(-0.5, 3), 0, '負の小数も 0');
assert.equal(meterValue(5, 3), 3, 'max を超えたら max');
assert.equal(meterValue(Number.NaN, 3), 0, 'NaN は 0');
assert.equal(meterValue(Number.POSITIVE_INFINITY, 3), 0, 'Infinity は 0');
assert.equal(meterValue(30, 25), 20, '段の数の補正を先に通す');
assert.equal(meterValue(2, undefined), 2, 'max 未指定は 3 段として収める');

// auto の色は割合で決まる。境界ちょうどは低い側。
assert.equal(meterTone(undefined, 0, 3), 'neutral', '0 段は neutral');
assert.equal(meterTone('auto', 1, 3), 'danger', '1/3 は danger');
assert.equal(meterTone('auto', 2, 3), 'warning', '2/3 は warning');
assert.equal(meterTone('auto', 3, 3), 'success', '満たしたら success');
assert.equal(meterTone(undefined, 1, 5), 'danger', '1/5 は danger');
assert.equal(meterTone(undefined, 2, 5), 'warning', '2/5 は warning');
assert.equal(meterTone(undefined, 3, 5), 'warning', '3/5 は warning');
assert.equal(meterTone(undefined, 4, 5), 'success', '4/5 は success');
assert.equal(meterTone(undefined, 2, 6), 'danger', '2/6 は境界ちょうどで danger');
assert.equal(meterTone(undefined, 4, 6), 'warning', '4/6 は境界ちょうどで warning');
assert.equal(meterTone(undefined, 1, 1), 'success', '1 段だけでも満たせば success');
assert.equal(meterTone(undefined, Number.NaN, 3), 'neutral', '非有限は 0 段として扱う');
assert.equal(meterTone(undefined, 9, 3), 'success', 'max を超えた値は満たした扱い');
for (const tone of ['neutral', 'danger', 'warning', 'success']) {
  assert.equal(meterTone(tone, 3, 3), tone, `明示した ${tone} はそのまま使う`);
}
assert.deepEqual(meterSegments(3), [0, 1, 2], '段の数ぶんの添字を返す');
assert.deepEqual(meterSegments(undefined), [0, 1, 2], '未指定は 3 段');
assert.equal(meterSegments(100).length, 20, '上限で止める');

const read = (path) => readFileSync(resolve(root, path), 'utf8');

for (const [name, path] of [['Vue', 'packages/vue/src/generated/components/Meter/Meter.vue'], ['React', 'packages/react/src/generated/components/Meter/Meter.tsx']]) {
  const source = read(path);
  assert.match(source, /role="meter"/, `${name} 版は meter として読み上げる`);
  assert.doesNotMatch(source, /role="progressbar"/, `${name} 版は進捗ではない`);
  for (const attribute of ['aria-label', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext']) {
    assert.match(source, new RegExp(attribute), `${name} 版は ${attribute} を持つ`);
  }
  assert.doesNotMatch(source, /aria-live/, `${name} 版は値の変化を読み上げない`);
  assert.match(source, /data-tone/, `${name} 版は色を属性で出す`);
  assert.match(source, /data-filled/, `${name} 版は満たした段に目印を付ける`);
  for (const helper of ['meterMax', 'meterValue', 'meterTone', 'meterSegments']) {
    assert.match(source, new RegExp(helper), `${name} 版も ${helper} の補正に通す`);
  }
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
// 満たした段と溝の区別は非テキストのコントラスト（3:1）で見る。
const track = token('accent-subtle');
for (const [tone, name] of [['neutral', 'selection-indicator'], ['danger', 'danger'], ['warning', 'warning'], ['success', 'success']]) {
  const fill = token(name);
  assert(contrast(fill, track) >= 3, `${tone}: 塗りが溝に対して 3:1 以上（${contrast(fill, track).toFixed(2)}）`);
}

for (const framework of ['vue', 'react']) {
  const css = read(`packages/${framework}/dist/style.css`);
  assert.match(css, /--meter-fill:/, `${framework}: 塗りを上書きできる`);
  assert.match(css, /--meter-track:/, `${framework}: 溝を上書きできる`);
  for (const tone of ['danger', 'warning', 'success']) {
    assert.match(css, new RegExp(`data-tone=['"]?${tone}['"]?\\][^{]*\\{--meter-fill:var\\(--koyori-color-${tone}\\)`), `${framework}: ${tone} の塗り`);
  }
  assert.ok(/prefers-reduced-motion[^@]*?_segment[^{]*\{[^}]*transition:none/i.test(css), `${framework}: 動きを減らす設定で止める`);
  assert.ok(/forced-colors[^{]*\{[^@]*?_segment[^{]*\{[^}]*border:[^;}]*canvastext/i.test(css), `${framework}: 強制配色で段の枠を描く`);
  assert.ok(/forced-colors[^{]*\{[^@]*?data-filled[^{]*\{[^}]*forced-color-adjust:none[^}]*highlight/i.test(css), `${framework}: 強制配色で満たした段を Highlight で塗る`);
}

console.log('Meter の段の補正・色の判定、生成物、トークンのコントラスト、配布 CSS の規則を確認しました。');

if (!['vue', 'react'].every((framework) => existsSync(resolve(root, `packages/${framework}/storybook-static/iframe.html`)))) {
  console.log('storybook-static がないため、ブラウザー検証は省きました（pnpm build-storybook のあとに再実行してください）。');
  return;
}

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const port = process.env.METER_TEST_PORT || '16327';
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
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-meter--${name}&viewMode=story`);
        await page.locator('#storybook-root [role="meter"]').first().waitFor();
      };
      const a11y = async () => {
        // Keep our instance separate from the addon, which may replace window.axe.
        await page.addScriptTag({ content: `${axeSource}\nwindow.meterAxe = window.axe;` });
        const violations = await page.evaluate(async () => (await window.meterAxe.run(document.querySelector('#storybook-root'))).violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })));
        assert.deepEqual(violations, []);
      };

      await story('default');
      const bar = page.getByRole('meter', { name: 'パスワードの強度' });
      assert.equal(await bar.count(), 1, 'label を読み上げ名にする');
      assert.equal(await bar.getAttribute('aria-valuenow'), '1');
      assert.equal(await bar.getAttribute('aria-valuemax'), '3');
      assert.equal(await bar.getAttribute('aria-valuetext'), '弱い', '段の意味を文で読ませる');
      assert.equal(await bar.locator('[data-filled="true"]').count(), 1, '満たした段の数だけ塗る');
      assert.equal(await bar.locator('span').count(), 3, '段の数だけ区切る');
      await a11y();

      await story('tones');
      const tones = await page.locator('#storybook-root [data-tone]').evaluateAll((elements) => elements.map((el) => el.getAttribute('data-tone')));
      assert.deepEqual(tones, ['neutral', 'danger', 'warning', 'success', 'neutral'], 'auto は割合で色を決め、明示した色はそのまま');
      const fills = await page.locator('#storybook-root [data-filled="true"]').evaluateAll((elements) => elements.map((el) => getComputedStyle(el).backgroundColor));
      assert.equal(new Set(fills.slice(0, 1 + 2 + 3)).size, 3, 'danger・warning・success は別の色');
      await a11y();

      await story('five-segments');
      const quota = page.getByRole('meter', { name: '今月の残り枠' });
      assert.equal(await quota.getAttribute('aria-valuemax'), '5');
      assert.equal(await page.locator('#storybook-root [data-tone]').getAttribute('data-tone'), 'success', '明示した色を使う');
      await a11y();

      await story('password-strength');
      const status = page.locator('#storybook-root [role="status"]');
      const input = page.locator('#storybook-root input');
      const announced = [];
      await page.exposeFunction(`meterAnnounce_${framework}`, (text) => announced.push(text));
      await status.evaluate((el, name) => {
        new MutationObserver(() => window[name](el.textContent)).observe(el, { childList: true, characterData: true, subtree: true });
      }, `meterAnnounce_${framework}`);
      await input.pressSequentially('abcdefghijkl', { delay: 10 });
      await page.waitForTimeout(100);
      const strength = page.getByRole('meter', { name: 'パスワードの強度' });
      assert.equal(await strength.getAttribute('aria-valuenow'), '3');
      assert.deepEqual([...new Set(announced)], ['パスワードの強度: 弱い', 'パスワードの強度: 普通', 'パスワードの強度: 強い'], '段が変わった時だけ文が変わる');
      await a11y();

      assert.deepEqual(errors, []);
      await page.close();
      console.log(`${framework}: Meter の読み上げ属性、段と色、段が変わった時だけの通知、axe を確認しました。`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
