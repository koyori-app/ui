// Run after pnpm --filter @koyori-app/ui-vue build. Vue の配布物をサーバー描画して落ちないことを確かめる。
// 依存付き onUpdate は Vue では watch(..., { immediate: true }) になり setup 中に走るため、
// requestAnimationFrame などブラウザーにしか無いものを呼ぶと SSR で ReferenceError になる。
// Field の外で描いても inject の警告（[Vue warn]）を出さないことも確かめる。
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const root = resolve(__dirname, '..');
const requireVue = createRequire(resolve(root, 'packages/vue/package.json'));
const { createSSRApp, h } = requireVue('vue');
const { renderToString } = requireVue('vue/server-renderer');

const warnings = [];
const warn = console.warn;
console.warn = (...args) => { warnings.push(args.join(' ')); };

(async () => {
  const ui = await import(pathToFileURL(resolve(root, 'packages/vue/dist/index.js')));
  const items = [{ value: 'design', label: 'デザイン' }, { value: 'frontend', label: 'Frontend' }];
  const cases = [
    ['Dropdown', { label: '操作', items }],
    ['Dropdown', { label: '操作', items, defaultOpen: true }],
    ['Picker', { label: '担当チーム', items }],
    ['Picker', { label: '担当チーム', items, searchable: false, defaultSelectedValues: ['design'] }],
    ['ContextMenu', { label: '行の操作', open: false, x: 0, y: 0, items }],
    ['DatePicker', { label: '期日' }],
  ];
  for (const [name, props] of cases) {
    const html = await renderToString(createSSRApp(ui[name], props));
    assert.match(html, /<button/, `${name} はサーバー描画でトリガーを出す`);
  }
  // topLayer は root に印を付け、menu.ts がパネルを top layer に出す。指定しなければ付けない。
  for (const name of ['Dropdown', 'Picker']) {
    const props = { label: '操作', items };
    assert.match(await renderToString(createSSRApp(ui[name], { ...props, topLayer: true })), /^<div[^>]*\sdata-menu-top-layer[\s>=]/, `${name} topLayer`);
    assert.doesNotMatch(await renderToString(createSSRApp(ui[name], props)), /data-menu-top-layer/, `${name} は既定で top layer に出さない`);
  }
  // Field の外の入力部品。inject に既定値が無いと Vue が `injection "Symbol()" not found` を出す。
  for (const [name, props] of [
    ['Input', { ariaLabel: '件名' }],
    ['Textarea', { ariaLabel: '説明' }],
    ['PasswordInput', { ariaLabel: 'パスワード' }],
    ['Switch', { label: '通知' }],
  ]) await renderToString(createSSRApp(ui[name], props));
  const toaster = await renderToString(createSSRApp(ui.Toaster, {}));
  assert.match(toaster, /<section[^>]*aria-label="通知"/, 'Toaster はサーバー描画で空の領域を出す');
  assert.match(toaster, /<div[^>]*role="status"[^>]*><span><\/span><\/div>/, 'Toaster はサーバー描画でも空の status 領域を出す');
  assert.match(toaster, /<div[^>]*role="alert"[^>]*><span><\/span><\/div>/, 'Toaster はサーバー描画でも空の alert 領域を出す');
  // HoverCard は container の型が HTMLElement でも、サーバー描画で HTMLElement を参照しない。
  const card = await renderToString(createSSRApp(ui.HoverCard, { label: 'プロフィール' }));
  assert.match(card, /role="dialog"/, 'HoverCard はサーバー描画でカードの器を出す');
  assert.match(card, /\shidden/, 'HoverCard のカードはサーバー描画では閉じている');
  // IconTile は src・emoji・頭文字のどれか 1 つ。読み上げは包む側が持つ。
  const tile = await renderToString(createSSRApp(ui.IconTile, { name: '𠮷野', emoji: '🍵' }));
  assert.match(tile, /^<span[^>]*aria-hidden="true"/, 'IconTile は読み上げから外す');
  assert.match(tile, /🍵/, 'IconTile は src が無ければ絵文字を出す');
  assert.match(await renderToString(createSSRApp(ui.IconTile, { name: '𠮷野' })), />𠮷<\/span>/, 'IconTile は先頭の 1 書記素を出す');
  const rail = await renderToString(createSSRApp({
    render: () => h(ui.IconRail, { label: 'テナント' }, () => [
      h(ui.IconRailItem, { id: 'rail-a', label: 'Acme', selected: true }),
      h(ui.IconRailSeparator),
      h(ui.IconRailItem, { id: 'rail-add', label: '追加', variant: 'action' }),
    ]),
  }));
  assert.match(rail, /^<nav[^>]*aria-label="テナント"/, 'IconRail は nav のランドマーク');
  assert.equal((rail.match(/aria-current="true"/g) || []).length, 1, 'IconRailItem は選択中の 1 つだけ aria-current');
  assert.match(rail, /role="tooltip"[^>]*hidden/, 'IconRailItem のツールチップはサーバー描画では隠れている');
  const panelItems = [{ value: 'profile', label: 'プロフィール', href: '/me', icon: 'user' }, { value: 'logout', label: 'ログアウト', destructive: true }];
  const panel = await renderToString(createSSRApp(ui.UserPanel, { name: 'hanako', description: 'hanako@example.com', cardLabel: 'hanako のプロフィール', items: panelItems }));
  assert.match(panel, /aria-haspopup="dialog"[^>]*aria-expanded="false"|aria-expanded="false"[^>]*aria-haspopup="dialog"/, 'UserPanel はサーバー描画では閉じている');
  assert.match(panel, /<div[^>]*role="dialog"[^>]*hidden/, 'UserPanel のカードはサーバー描画では隠れている');
  assert.match(panel, /<a[^>]*href="\/me"/, 'UserPanel の href の項目は <a>');
  assert.doesNotMatch(panel, /_itemIcon_/, 'item-icon を渡さない UserPanel はアイコンの箱を出さない');
  const iconPanel = await renderToString(createSSRApp({
    render: () => h(ui.UserPanel, { name: 'hanako', cardLabel: 'hanako のプロフィール', items: panelItems }, { 'item-icon': ({ item }) => h('i', { 'data-icon': item.icon }) }),
  }));
  assert.equal((iconPanel.match(/_itemIcon_/g) || []).length, 2, 'item-icon を渡すと全部の項目に同じ幅の箱を出す');
  assert.equal((iconPanel.match(/data-icon=/g) || []).length, 1, 'item-icon は icon のある項目だけ');
  // Combobox は札の × で <button を出すが、ここで確かめるのは combobox の属性。
  const combo = await renderToString(createSSRApp(ui.Combobox, {
    ariaLabel: '検索', tags: [{ label: 'bug' }], options: [{ value: 'a', label: 'alpha', highlight: [[0, 1]] }],
  }));
  assert.match(combo, /role="combobox"/, 'Combobox は入力欄に combobox の役割を付ける');
  assert.match(combo, /aria-expanded="false"/, 'Combobox はサーバー描画では閉じている');
  assert.match(combo, /role="listbox"/, 'Combobox は listbox を出す');
  assert.match(combo, /\shidden/, 'Combobox の一覧はサーバー描画では隠れている');
  assert.doesNotMatch(combo, /undefined/, 'Combobox の markup に undefined が出ない');
  assert.deepEqual(warnings, [], 'Field の外でも Vue の警告を出さない');
  console.log('vue: Dropdown・Picker・ContextMenu・DatePicker・HoverCard・IconTile・IconRail・UserPanel・Combobox のサーバー描画と topLayer の印、Field の外で警告が出ないことを確認しました。');
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => { console.warn = warn; });
