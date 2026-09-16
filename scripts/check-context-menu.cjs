// No browser needed: node scripts/check-context-menu.cjs（pnpm build のあとに実行する）
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync, readFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const compiled = mkdtempSync(join(tmpdir(), 'koyori-context-menu-'));
let menu;
let contextMenu;
try {
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--ignoreConfig',
    '--module', 'commonjs', '--target', 'ES2022', '--skipLibCheck', '--outDir', compiled,
    resolve(root, 'components/shared/menu.ts'), resolve(root, 'components/ContextMenu/context-menu.ts')], { stdio: 'inherit' });
  menu = require(join(compiled, 'shared/menu.js'));
  contextMenu = require(join(compiled, 'ContextMenu/context-menu.js'));
} finally {
  rmSync(compiled, { recursive: true, force: true });
}
const { nextMenuIndex, typeaheadTarget } = menu;
const { contextMenuPosition, placeContextMenu } = contextMenu;

// 矢印キーは循環し、Home/End は端へ飛ぶ。Dropdown と共有する。
assert.equal(nextMenuIndex('ArrowDown', 0, 3), 1, '下へ 1 つ進む');
assert.equal(nextMenuIndex('ArrowDown', 2, 3), 0, '末尾の次は先頭');
assert.equal(nextMenuIndex('ArrowUp', 0, 3), 2, '先頭の前は末尾');
assert.equal(nextMenuIndex('ArrowUp', -1, 3), 2, 'どこにもいなければ末尾');
assert.equal(nextMenuIndex('ArrowDown', -1, 3), 0, 'どこにもいなければ先頭');
assert.equal(nextMenuIndex('Home', 2, 3), 0, 'Home は先頭');
assert.equal(nextMenuIndex('End', 0, 3), 2, 'End は末尾');
assert.equal(nextMenuIndex('ArrowDown', -1, 0), -1, '項目がなければ移動しない');

// 先頭文字の移動は現在位置の次から探し、末尾まで来たら先頭へ回る。
const labels = ['編集', '複製', 'ふりがな', '削除する'];
assert.equal(typeaheadTarget(labels, -1, 'ふ'), 2, '先頭文字で移動する');
assert.equal(typeaheadTarget(labels, 2, 'ふ'), 2, '一巡して自分自身に戻る');
assert.equal(typeaheadTarget(labels, 0, '削'), 3, '現在位置の次から探す');
assert.equal(typeaheadTarget(labels, 3, '編'), 0, '末尾まで来たら先頭へ回る');
assert.equal(typeaheadTarget(labels, 0, 'ん'), -1, '一致しなければ移動しない');
assert.equal(typeaheadTarget(['編集', 'ふりがな', 'ふせん'], 1, 'ふ'), 2, '同じ文字で始まる項目が続くと、今の項目ではなく次へ進む');
assert.equal(typeaheadTarget(['Edit'], -1, 'ｅ'), 0, '全角と大文字を正規化して比べる');
assert.equal(typeaheadTarget([], -1, 'a'), -1, '項目がなければ移動しない');

// 右クリックの座標。キーボードでは 0,0 で来るため対象の左下に出す。
assert.deepEqual(contextMenuPosition({ clientX: 120, clientY: 40 }), { x: 120, y: 40 }, 'ポインタの位置をそのまま使う');
const row = { getBoundingClientRect: () => ({ left: 16, bottom: 72 }) };
assert.deepEqual(contextMenuPosition({ clientX: 0, clientY: 0, currentTarget: row }), { x: 16, y: 72 }, 'キーボードでは対象の左下');
assert.deepEqual(contextMenuPosition({ clientX: 0, clientY: 0, currentTarget: null }), { x: 0, y: 0 }, '対象がなければ 0,0');

// transform を持つ祖先があると fixed の基準がずれる。置いたあと実際の位置との差で補正する。
function shiftedElement(offsetX, offsetY) {
  return {
    style: { left: '', top: '' },
    getBoundingClientRect() {
      return { left: parseFloat(this.style.left) + offsetX, top: parseFloat(this.style.top) + offsetY };
    },
  };
}
const shifted = shiftedElement(156, 509);
placeContextMenu(shifted, 204, 537);
assert.deepEqual(shifted.getBoundingClientRect(), { left: 204, top: 537 }, '祖先の transform でずれても、ポインタの位置に起点を置く');
const plain = shiftedElement(0, 0);
placeContextMenu(plain, 30, 40);
assert.deepEqual([plain.style.left, plain.style.top], ['30px', '40px'], 'ずれがなければ座標をそのまま使う');
placeContextMenu(null, 1, 2);

const read = (path) => readFileSync(resolve(root, path), 'utf8');

for (const [name, path] of [['Vue', 'packages/vue/src/generated/components/ContextMenu/ContextMenu.vue'], ['React', 'packages/react/src/generated/components/ContextMenu/ContextMenu.tsx']]) {
  const source = read(path);
  assert.match(source, /role="menu"/, `${name} 版がメニューとして読み上げられる`);
  assert.match(source, /role="menuitem"/, `${name} 版の項目がメニュー項目になる`);
  assert.match(source, /tab(index|Index)="?\{?-1/, `${name} 版の項目は Tab 移動の対象外`);
  assert.match(source, /data-menu-top-layer/, `${name} 版が最前面に出る`);
  assert.match(source, /data-destructive/, `${name} 版が取り消せない操作を属性で出す`);
  assert.match(source, /[Cc]ontext[Mm]enu[\s\S]{0,120}?preventDefault/, `${name} 版がメニュー内の右クリックを抑止する`);
  assert.doesNotMatch(source, /aria-haspopup|aria-controls/, `${name} 版は対象と紐づけない（トリガーを持たないため）`);
  assert.match(source, /placeContextMenu/, `${name} 版が座標を実際の位置で補正する`);
  assert.match(source, /function select[\s\S]*?onSelect\?\.\([\s\S]*?onClose\?\.\(/, `${name} 版が実行してから閉じる（onSelect の後に onClose）`);
  assert.doesNotMatch(source, /:not\(\[aria-disabled="true"\]\)/, `${name} 版が無効な項目も含めて先頭にフォーカスする`);
  assert.match(source, /項目がありません/, `${name} 版が 0 件のときもフォーカスできる項目を出す`);
  assert.doesNotMatch(source, /left: `\$\{(props\.)?x\}px`/, `${name} 版が座標を style で直接渡さない`);
  assert.match(source, /if \((props\.)?open\) \{\s*cleanupRef(\.current|\.value)? = listenToMenu/,
    `${name} 版は開いている間だけ外側クリックを受け、開くたびにその時点の props で登録する`);
}

for (const [name, path] of [['Vue', 'packages/vue/src/generated/components/Dropdown/Dropdown.vue'], ['React', 'packages/react/src/generated/components/Dropdown/Dropdown.tsx']]) {
  const source = read(path);
  assert.match(source, /nextMenuIndex/, `${name} 版 Dropdown が共有の移動計算を使う`);
  assert.match(source, /typeaheadTarget/, `${name} 版 Dropdown が共有の先頭文字検索を使う`);
}

for (const framework of ['vue', 'react']) {
  const css = read(`packages/${framework}/dist/style.css`);
  assert.match(css, /\[data-destructive=['"]?true['"]?\][^{]*\{[^}]*--koyori-color-danger/, `${framework}: 取り消せない操作の色がある`);
  assert.match(css, /position:fixed[^}]*width:0|width:0[^}]*position:fixed/, `${framework}: 座標に置く起点の規則がある`);
}

console.log('ContextMenu の移動・座標・生成物・配布 CSS の規則を確認しました。');
