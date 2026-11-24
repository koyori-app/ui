// Dropdown の項目のアイコン（DropdownItem.icon）のサーバー描画の検査。ブラウザー不要で、CI（.github/workflows/check.yml）でも走る。
//   pnpm generate && pnpm --filter './packages/*' build
//   node scripts/check-dropdown-item-icon.cjs
// 見た目（文字の位置・行の高さ・操作）は scripts/check-dropdown.cjs の item-icons で見る。
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

const root = resolve(__dirname, '..');

// Vue の v-if が残すコメントを除いて、Vue と React の出力を同じ形で比べる。
const normalize = html => html.replace(/<!--[\s\S]*?-->/g, '').replace(/=""/g, '');
const count = (html, pattern) => (html.match(pattern) || []).length;
// 項目の行（button）ごとの開始タグと中身。行の中に button は入れ子にならない。
const rows = html => [...html.matchAll(/<button([^>]*role="menuitem(?:radio|checkbox)?"[^>]*)>([\s\S]*?)<\/button>/g)]
  .map(([, attributes, body]) => ({ attributes, body }));
const boxes = html => [...html.matchAll(/<span([^>]*class="[^"]*_itemIcon_[^"]*"[^>]*)>/g)].map(match => match[1]);
// 行の中で、class の現れる位置。無ければ -1。
const at = (body, name) => body.search(new RegExp(`class="[^"]*_${name}_`));

const status = [
  { value: 'todo', label: '未着手', kind: 'radio', icon: 'gray' },
  { value: 'doing', label: '進行中', kind: 'radio', checked: true, icon: 'blue' },
  { value: 'none', label: 'なし', kind: 'radio' },
];

async function main() {
  const requireVue = createRequire(resolve(root, 'packages/vue/package.json'));
  const { createSSRApp, h } = requireVue('vue');
  const { renderToString } = requireVue('vue/server-renderer');
  const requireReact = createRequire(resolve(root, 'packages/react/package.json'));
  const { createElement } = requireReact('react');
  const { renderToStaticMarkup } = requireReact('react-dom/server');
  const vueUi = await import(pathToFileURL(resolve(root, 'packages/vue/dist/index.js')));
  const reactUi = await import(pathToFileURL(resolve(root, 'packages/react/dist/index.js')));

  const warnings = [];
  const warn = console.warn;
  console.warn = (...args) => { warnings.push(args.join(' ')); };
  const mapItems = (items, map) => items.map(entry => ('items' in entry ? { ...entry, items: entry.items.map(map) } : map(entry)));

  // slot: Vue で item-icon スロットを渡すか。React は icon に <i data-icon> を入れる。
  const renders = {
    Vue: async (items, slot = true) => normalize(await renderToString(createSSRApp({
      render: () => h(vueUi.Dropdown, { label: 'ステータス', defaultOpen: true, items },
        slot ? { 'item-icon': ({ item }) => h('i', { 'data-icon': String(item.icon) }) } : {}),
    }))),
    React: async items => normalize(renderToStaticMarkup(createElement(reactUi.Dropdown, {
      label: 'ステータス', defaultOpen: true,
      items: mapItems(items, item => (item.icon === undefined ? item : { ...item, icon: createElement('i', { 'data-icon': String(item.icon) }) })),
    }))),
  };

  try {
    for (const [name, render] of Object.entries(renders)) {
      // アイコンのある項目と無い項目が混ざったラジオ。
      const html = await render(status);
      assert.equal(count(html, /<i data-icon/g), 2, `${name}: アイコンは icon のある項目の数だけ出る`);
      assert.equal(boxes(html).length, 3, `${name}: アイコンの箱は全項目に出る（icon の無い項目も幅を空ける）`);
      for (const attributes of boxes(html)) assert.match(attributes, /aria-hidden="true"/, `${name}: 箱は読み上げから外す`);
      const lines = rows(html);
      assert.equal(lines.length, 3, `${name}: 行が 3 つ`);
      lines.forEach(({ attributes, body }, index) => {
        const item = status[index];
        assert.match(attributes, new RegExp(`aria-checked="${item.checked ? 'true' : 'false'}"`), `${name}: ${item.label} の aria-checked`);
        assert(at(body, 'itemIcon') >= 0 && at(body, 'itemIcon') < at(body, 'itemLabel'), `${name}: ${item.label} の箱は label より前`);
        assert(at(body, 'check') > at(body, 'itemLabel'), `${name}: ${item.label} のラジオの印は label の後（右端の ✓）`);
        assert.equal(at(body, 'dot'), -1, `${name}: ${item.label} に先頭の点を出さない`);
        assert.equal(count(body, /_check_/g), 1, `${name}: ${item.label} の印は 1 つ`);
        assert.match(body, /<svg/, `${name}: ${item.label} の ✓ は CheckIcon`);
      });
      assert.doesNotMatch(html, /undefined/, `${name}: undefined の文字を出さない`);

      // セクションの片方にだけ icon がある。判定はメニュー全体で 1 つ。
      const sections = await render([
        { heading: '進行', items: status.slice(0, 2) },
        { items: [{ value: 'archive', label: 'アーカイブ' }, { value: 'delete', label: '削除', destructive: true }] },
      ]);
      assert.equal(boxes(sections).length, 4, `${name}: セクションをまたいで全項目に箱が出る`);

      // どの項目にも icon が無いメニューは今のまま（箱なし、ラジオは先頭の点）。
      const plain = await render(status.map(({ icon: _, ...item }) => item));
      assert.equal(boxes(plain).length, 0, `${name}: icon が無ければ箱を出さない`);
      for (const { body } of rows(plain)) {
        assert(at(body, 'dot') >= 0 && at(body, 'check') < at(body, 'itemLabel'), `${name}: icon が無ければラジオの印は先頭の点`);
      }
    }

    // Vue: icon を入れてもスロットが無ければ、アイコンの無いメニューと同じ出力。
    const plainVue = await renders.Vue(status.map(({ icon: _, ...item }) => item), false);
    assert.equal(await renders.Vue(status, false), plainVue, 'Vue: スロットが無ければ icon の無いメニューと同じ');
    assert.equal(boxes(plainVue).length, 0, 'Vue: スロットが無ければ箱を出さない');

    // Vue: icon が偽値（0・空文字・false）の項目にはスロットを呼ばない。箱は幅をそろえるため出す。
    const falsy = await renders.Vue([
      { value: 'zero', label: 'ゼロ', icon: 0 },
      { value: 'empty', label: '空', icon: '' },
      { value: 'false', label: '偽', icon: false },
      { value: 'on', label: 'あり', icon: 'on' },
    ]);
    assert.equal(count(falsy, /<i data-icon/g), 1, 'Vue: 偽値の項目にはスロットを呼ばない');
    assert.equal(boxes(falsy).length, 4, 'Vue: 偽値の項目も箱で幅を空ける');

    assert.deepEqual(warnings, [], '描画中に警告を出さない');
  } finally {
    console.warn = warn;
  }
}

main().then(() => {
  console.log('Dropdown の項目のアイコン: 箱と文字そろえ、右端の ✓、Vue のスロットの有無と偽値をサーバー描画で確認しました');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
