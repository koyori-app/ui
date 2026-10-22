// Run after pnpm --filter @koyori-app/ui-vue build. Vue の配布物をサーバー描画して落ちないことを確かめる。
// 依存付き onUpdate は Vue では watch(..., { immediate: true }) になり setup 中に走るため、
// requestAnimationFrame などブラウザーにしか無いものを呼ぶと SSR で ReferenceError になる。
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const root = resolve(__dirname, '..');
const requireVue = createRequire(resolve(root, 'packages/vue/package.json'));
const { createSSRApp } = requireVue('vue');
const { renderToString } = requireVue('vue/server-renderer');

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
  console.log('vue: Dropdown・Picker・ContextMenu・DatePicker のサーバー描画と topLayer の印を確認しました。');
})().catch((error) => { console.error(error); process.exitCode = 1; });
