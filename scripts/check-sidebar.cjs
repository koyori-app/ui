// No browser needed: node scripts/check-sidebar.cjs（pnpm build のあとに実行する）
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync, readFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const compiled = mkdtempSync(join(tmpdir(), 'koyori-sidebar-'));
let sidebar;
try {
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--ignoreConfig',
    '--module', 'commonjs', '--target', 'ES2022', '--skipLibCheck', '--outDir', compiled,
    resolve(root, 'components/Sidebar/sidebar.ts')], { stdio: 'inherit' });
  sidebar = require(join(compiled, 'Sidebar/sidebar.js'));
} finally {
  rmSync(compiled, { recursive: true, force: true });
}
const { restoreFocus } = sidebar;

function page({ focusInside, controls }) {
  const focused = [];
  const inside = { name: 'link' };
  const toggle = { getAttribute: () => controls, focus: () => focused.push('toggle') };
  const doc = { activeElement: focusInside ? inside : { name: 'outside' }, querySelectorAll: () => controls ? [toggle] : [] };
  return { focused, root: { ownerDocument: doc, contains: (node) => node === inside } };
}

restoreFocus(null, 'nav');
const inside = page({ focusInside: true, controls: 'other nav' });
restoreFocus(inside.root, 'nav');
assert.deepEqual(inside.focused, ['toggle'], '中にフォーカスがあれば、aria-controls で指すボタンへ戻す');
const outside = page({ focusInside: false, controls: 'nav' });
restoreFocus(outside.root, 'nav');
assert.deepEqual(outside.focused, [], '外にフォーカスがあれば動かさない');
const partial = page({ focusInside: true, controls: 'navigation' });
restoreFocus(partial.root, 'nav');
assert.deepEqual(partial.focused, [], 'id の一部一致ではボタンとみなさない');
const missing = page({ focusInside: true, controls: null });
restoreFocus(missing.root, 'nav');
restoreFocus(inside.root, undefined);

const read = (path) => readFileSync(resolve(root, path), 'utf8');
for (const [name, path] of [['Vue', 'packages/vue/src/generated/components/Sidebar/Sidebar.vue'], ['React', 'packages/react/src/generated/components/Sidebar/Sidebar.tsx']]) {
  const source = read(path);
  assert.match(source, /data-open/, `${name} 版 Sidebar が開閉状態を属性で出す`);
  assert.match(source, /open: undefined/, `${name} 版 Sidebar が open 未指定を保つ（常に表示）`);
  assert.match(source, /restoreFocus/, `${name} 版 Sidebar が閉じるときにフォーカスを戻す`);
  assert.match(source, /data-sidebar-rail/, `${name} 版 Sidebar がアイコンだけの表示を属性で出す`);
  assert.match(source, /rail: undefined/, `${name} 版 Sidebar が rail 未指定を保つ`);
  assert.match(source, /aria-pressed/, `${name} 版 Sidebar のつまみが状態を aria-pressed で伝える`);
  assert.match(source, /onRailChange\?\.\(!\s*(props\.)?rail\)/, `${name} 版 Sidebar のつまみが rail を反転して知らせる`);
  assert.match(source, /placement !== ['"]top['"]/, `${name} 版 Sidebar が上下配置ではつまみを出さない`);
}
for (const [name, path] of [['Vue', 'packages/vue/src/generated/components/Button/Button.vue'], ['React', 'packages/react/src/generated/components/Button/Button.tsx']]) {
  const source = read(path);
  assert.match(source, /aria-expanded/, `${name} 版 Button が aria-expanded を出す`);
  assert.match(source, /aria-controls/, `${name} 版 Button が aria-controls を出す`);
  assert.match(source, /aria-expanded=["{]\s*\(?(props\.)?ariaControls \? (props\.)?ariaExpanded : undefined/, `${name} 版 Button が開閉対象のないボタンに aria-expanded を付けない`);
}

for (const framework of ['vue', 'react']) {
  const css = read(`packages/${framework}/dist/style.css`);
  assert.match(css, /\[data-open=['"]?false['"]?\]\{visibility:hidden/, `${framework}: 閉じた Sidebar を Tab 移動と読み上げから外す`);
  for (const placement of ['left', 'right']) {
    assert.match(css, new RegExp(`\\[data-open=['"]?false['"]?\\]\\[data-placement=['"]?${placement}['"]?\\][^{]*\\{[^}]*\\bwidth:0`), `${framework}: ${placement} は幅を畳む`);
  }
  for (const placement of ['top', 'bottom']) {
    assert.match(css, new RegExp(`\\[data-open=['"]?false['"]?\\]\\[data-placement=['"]?${placement}['"]?\\][^{]*\\{[^}]*\\bheight:0`), `${framework}: ${placement} は高さを畳む`);
  }
  assert.match(css, /prefers-reduced-motion[^}]*\[data-open\][^{]*\{[^}]*transition:none/, `${framework}: 動きを減らす設定で開閉の動きを止める`);
  assert.match(css, /display:contents/, `${framework}: 開閉しない Sidebar の外枠はレイアウトに影響しない`);
  assert.match(css, /--koyori-sidebar-rail-width:\s*\d+px/, `${framework}: アイコンだけの表示の幅トークンがある`);
  const railRules = css.match(/[^{}]*\[data-sidebar-rail=['"]?true['"]?\][^{}]*\{[^}]*\}/g) ?? [];
  const clipped = railRules.filter((rule) => /clip-path:\s*inset\(50%\)/.test(rule));
  assert.ok(clipped.length >= 2, 'リンクと Accordion のラベルを、読み上げに残したまま見た目だけ隠す');
  assert.ok(railRules.every((rule) => !/\bdisplay:none/.test(rule) || /chevron/.test(rule)),
    'ラベルを display:none で消さない（読み上げ名が失われるため）');
  assert.match(css, /\[data-sidebar-rail=['"]?true['"]?\][^{}]*:has\([^)]*badge[^)]*\):after\{/, `${framework}: 隠した badge の代わりに点を出す`);
  assert.match(css, /prefers-reduced-motion[^}]*\[data-sidebar-rail\]/, `${framework}: 動きを減らす設定で幅の遷移も止める`);
  assert.match(css, /_frame[^{]*\{[^}]*--sidebar-handle-width:/, `${framework}: つまみの幅は clip-path を持つ外枠に定義する`);
  assert.match(css, /\[data-open\][^{]*\{[^}]*clip-path:inset\(0 calc\(-1 \* var\(--sidebar-handle-width\)\)/,
    `${framework}: つまみの側だけカードの外まで見せる`);
  assert.doesNotMatch(css, /\[data-open\][^{]*\{[^}]*overflow:clip/, `${framework}: つまみを切り落とさない`);
  assert.match(css, /position:absolute[^}]*left:100%|left:100%[^}]*position:absolute/, `${framework}: つまみがカードの右端から張り出す`);
  assert.match(css, /\[data-placement=['"]?right['"]?\][^{]*\{[^}]*right:100%/, `${framework}: 右に置くと反対側へ張り出す`);
  assert.match(css, /\[data-open=['"]?false['"]?\][^{]*\{[^}]*opacity:0/, `${framework}: 閉じる間はつまみを消す`);
  assert.match(css, /\[data-sidebar-rail=['"]?true['"]?\][^{]*\{[^}]*rotate\(-90deg\)/, `${framework}: アイコンだけの表示で山括弧が反転する`);
  assert.match(css, /display:var\(--koyori-sidebar-handle-display/, `${framework}: つまみの表示を親から消せる`);
  assert.match(css, /--koyori-sidebar-handle-display:\s*none/, `${framework}: モーダルの Drawer の中ではつまみを出さない`);
  assert.doesNotMatch(css, /\[data-open=['"]?false['"]?\][^{]*\{[^}]*padding-inline:0/, `${framework}: 閉じるときにカードの余白を潰さない`);
}

console.log('Sidebar の開閉・フォーカスの戻し先・生成物・配布 CSS の規則を確認しました。');
