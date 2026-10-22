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
const { createSSRApp } = requireVue('vue');
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
  assert.deepEqual(warnings, [], 'Field の外でも Vue の警告を出さない');
  console.log('vue: Dropdown・Picker・ContextMenu・DatePicker のサーバー描画と topLayer の印、Field の外で警告が出ないことを確認しました。');
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => { console.warn = warn; });
