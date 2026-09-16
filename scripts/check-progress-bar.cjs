// No browser needed: node scripts/check-progress-bar.cjs（pnpm build のあとに実行する）
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync, readFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const compiled = mkdtempSync(join(tmpdir(), 'koyori-progress-'));
let progress;
try {
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--ignoreConfig',
    '--module', 'commonjs', '--target', 'ES2022', '--skipLibCheck', '--outDir', compiled,
    resolve(root, 'components/ProgressBar/progress.ts')], { stdio: 'inherit' });
  progress = require(join(compiled, 'progress.js'));
} finally {
  rmSync(compiled, { recursive: true, force: true });
}
const { progressRatio, formatPercent } = progress;

assert.equal(progressRatio(3, 5), 0.6, '値と最大値の割合を返す');
assert.equal(progressRatio(7, 5), 1, '最大値を超えても満たした扱いにする');
assert.equal(progressRatio(-1, 5), 0, '負の値は 0 にする');
assert.equal(progressRatio(Number.NaN, 5), 0, '数値でない値は 0 にする');
assert.equal(progressRatio(50, 0), 0.5, '最大値が 0 以下なら 100 として扱う');
assert.equal(progressRatio(50, Number.NaN), 0.5, '最大値が数値でなければ 100 として扱う');
assert.equal(formatPercent(0), '0%', '0 は 0%');
assert.equal(formatPercent(0.6), '60%', '割合を百分率にする');
assert.equal(formatPercent(199 / 200), '99%', '満たしていないうちは 100% と言わない');
assert.equal(formatPercent(1), '100%', '満たしたときだけ 100%');

const read = (path) => readFileSync(resolve(root, path), 'utf8');

for (const [name, path] of [['Vue', 'packages/vue/src/generated/components/ProgressBar/ProgressBar.vue'], ['React', 'packages/react/src/generated/components/ProgressBar/ProgressBar.tsx']]) {
  const source = read(path);
  assert.match(source, /role="progressbar"/, `${name} 版が進捗として読み上げられる`);
  assert.match(source, /aria-valuenow/, `${name} 版が現在値を伝える`);
  assert.match(source, /aria-valuemax/, `${name} 版が最大値を伝える`);
  assert.match(source, /aria-valuetext/, `${name} 版が valueText を読み上げる値にする`);
  assert.match(source, /aria-label/, `${name} 版が読み上げ名を持つ`);
  assert.doesNotMatch(source, /aria-live/, `${name} 版が値の変化を読み上げない`);
  assert.match(source, /data-complete/, `${name} 版が満たした状態を属性で出す`);
}

for (const framework of ['vue', 'react']) {
  const css = read(`packages/${framework}/dist/style.css`);
  assert.match(css, /--koyori-progress-height:\s*\d+px/, `${framework}: 高さのトークンがある`);
  assert.match(css, /transition:width/, `${framework}: 棒の伸び縮みを遷移させる`);
  assert.doesNotMatch(css, /scaleX/, `${framework}: 角丸が潰れる scaleX を使わない`);
  assert.match(css, /prefers-reduced-motion[^}]*transition:none/, `${framework}: 動きを減らす設定で止める`);
  const forcedRules = css.match(/\{[^}]*forced-color-adjust:\s*none[^}]*\}/gi) ?? [];
  assert.ok(forcedRules.some((rule) => /background:\s*Highlight/i.test(rule)),
    `${framework}: 強制配色で塗りを強調色にし、色を保つ`);
  assert.ok(/forced-colors[^{]*\{[^@]*?_track[^{]*\{[^}]*border:[^}]*canvastext/i.test(css),
    `${framework}: 強制配色で溝に枠線を引く`);
}

console.log('ProgressBar の値の計算、生成物、配布 CSS の規則を確認しました。');
