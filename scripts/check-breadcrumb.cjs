// No browser needed: node scripts/check-breadcrumb.cjs（pnpm build のあとに実行する）
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const root = resolve(__dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

for (const [name, path] of [['Vue', 'packages/vue/src/generated/components/Breadcrumb/Breadcrumb.vue'], ['React', 'packages/react/src/generated/components/Breadcrumb/Breadcrumb.tsx']]) {
  const source = read(path);
  assert.match(source, /<nav/, `${name} 版がランドマークになる`);
  assert.match(source, /aria-label/, `${name} 版がランドマークに名前を付ける`);
  assert.match(source, /<ol/, `${name} 版が順序付きリストで階層を出す`);
  assert.match(source, /role="list"/, `${name} 版が list の意味論を保つ`);
  assert.match(source, /items\.length - 1 \? ["']page["']/, `${name} 版が最後の項目だけを現在地にする`);
  assert.match(source, /items\.length > 0/, `${name} 版が 0 件で空のランドマークを出さない`);
  assert.match(source, /href/, `${name} 版が href をリンクに渡す`);
  assert.doesNotMatch(source, /aria-hidden/, `${name} 版が区切りを要素で置かない`);
  for (const api of ['onMount', 'addEventListener', 'useRef']) {
    assert.ok(!source.includes(api), `${name} 版は表示専用で ${api} を使わない`);
  }
}

for (const framework of ['vue', 'react']) {
  const css = read(`packages/${framework}/dist/style.css`);
  // 代替テキスト付きの content。minify で引用符が変わりうるので緩く見る。
  assert.match(css, /content:\s*["']\/["']\s*\/\s*["']["']/, `${framework}: 区切りを読み上げから外す`);
  assert.match(css, /flex-wrap:\s*wrap/, `${framework}: 狭い幅で折り返す`);
  assert.match(css, /_link_\w+\[aria-current=(?:"|')?page(?:"|')?\][^{]*\{[^}]*font-weight:\s*600/i, `${framework}: 現在地を太字でも示す`);
  assert.match(css, /_link_\w+:hover\{[^}]*text-decoration:underline/i, `${framework}: ホバーで下線を出す`);
  assert.match(css, /_link_\w+:focus-visible\{[^}]*outline:var\(--koyori-focus-width\)/i, `${framework}: フォーカス枠を共通トークンで出す`);
  assert.match(css, /prefers-reduced-motion:reduce\)\{\._link_\w+\{transition:none/, `${framework}: 動きを減らす設定で色の遷移を止める`);
}

console.log('Breadcrumb の生成物と配布 CSS の規則を確認しました。');
