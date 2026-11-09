// No browser needed: node scripts/check-tokens.cjs（pnpm build のあとに実行する）
// tokens.css のライト・ダークのコントラストと、配布 CSS のダークのブロックを検証する。
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const root = resolve(__dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const tokens = read('components/tokens.css');

const block = (selector) => {
  const start = tokens.indexOf(`${selector} {`);
  assert(start >= 0, `tokens.css に ${selector} のブロックがある`);
  return tokens.slice(start, tokens.indexOf('}', start));
};
const colors = (css) => Object.fromEntries(
  [...css.matchAll(/--koyori-color-([a-z-]+):\s*(#[0-9a-f]{6,8})\b/gi)].map(([, name, value]) => [name, value]),
);

const lightBlock = block(':root');
const darkBlock = block("[class~='dark'], [data-theme='dark']");
const themes = { ライト: colors(lightBlock), ダーク: colors(darkBlock) };

assert.match(darkBlock, /color-scheme:\s*dark/, 'ダークのブロックに color-scheme: dark がある');
assert.doesNotMatch(lightBlock, /color-scheme/, 'ライトは color-scheme を強制しない');
assert.deepEqual(
  Object.keys(themes.ダーク).sort(),
  Object.keys(themes.ライト).sort(),
  'ダークはライトと同じ色トークンを全部持つ',
);
assert.deepEqual(
  [...darkBlock.matchAll(/--koyori-([a-z-]+):/g)].map(([, name]) => name).filter((name) => !name.startsWith('color-') && name !== 'shadow-panel'),
  [],
  'ダークのブロックは色と影以外のトークンを再定義しない',
);
assert.match(lightBlock, /--koyori-focus-color:\s*var\(--koyori-color-text-muted\)/, 'フォーカス色は text-muted');

const channel = (value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((index) => channel(parseInt(hex.slice(index, index + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

const meanings = ['danger', 'warning', 'info', 'success'];
const surfaces = ['surface', 'surface-hover', 'surface-active', 'surface-raised'];
const rules = [
  [4.5, ['text', 'text-secondary', 'text-muted'], surfaces],
  [4.5, ['text'], ['selection']],
  [4.5, ['on-accent'], ['accent', 'accent-hover']],
  [4.5, ['on-danger'], ['danger', 'danger-hover']],
  [4.5, meanings, ['surface']],
  ...meanings.map((name) => [4.5, [name, 'text'], [`${name}-subtle`]]),
  [3, ['border-strong'], ['surface', 'surface-hover']],
  // 入力欄の枠だけでなく、フォーカス色（text-muted）がどの地でも 3:1 を保つ。
  [3, ['text-muted'], ['surface', 'surface-hover', 'surface-active', 'selection']],
  [3, ['selection-indicator'], ['surface', 'accent-subtle']],
  [3, ['danger', 'warning', 'success'], ['accent-subtle']],
];
for (const [theme, values] of Object.entries(themes)) {
  for (const [minimum, foregrounds, backgrounds] of rules) {
    for (const foreground of foregrounds) {
      for (const background of backgrounds) {
        assert(values[foreground] && values[background], `${theme}: ${foreground} と ${background} がある`);
        const ratio = contrast(values[foreground], values[background]);
        assert(ratio >= minimum, `${theme}: ${foreground} × ${background} が ${minimum}:1 以上（${ratio.toFixed(2)}）`);
      }
    }
  }
}

for (const framework of ['vue', 'react']) {
  const css = read(`packages/${framework}/dist/style.css`);
  const found = [...css.matchAll(/\[class~=["']?dark["']?\],\s*\[data-theme=["']?dark["']?\]\s*\{([^}]*)\}/g)];
  assert.equal(found.length, 1, `${framework}: 配布 CSS にダークのブロックが 1 回だけある（.dark が CSS Modules で別名にならず、重複もしない）`);
  assert.match(found[0][1], /color-scheme:\s*dark/, `${framework}: 配布 CSS のダークに color-scheme: dark がある`);
}

console.log('トークンのライト・ダークの色とコントラスト、配布 CSS のダークのブロックを確認しました。');
