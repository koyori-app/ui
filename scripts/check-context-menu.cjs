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
const { nextMenuIndex, typeaheadTarget, listenToMenu } = menu;
const { contextMenuPosition, menuButtonPosition, placeContextMenu, submenuPlacement, submenuKeyAction, SUBMENU_DELAY } = contextMenu;

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

// メニューボタンから開くときはボタンの左下に出し、ボタンにフォーカスする（Safari はクリックでフォーカスしないため）。
{
  let focused = 0;
  const button = { getBoundingClientRect: () => ({ left: 300, bottom: 48 }), focus: () => { focused += 1; } };
  assert.deepEqual(menuButtonPosition({ currentTarget: button }), { x: 300, y: 48 }, 'ボタンの左下の座標を返す');
  assert.equal(focused, 1, 'ボタンにフォーカスする');
  assert.deepEqual(menuButtonPosition({ currentTarget: null }), { x: 0, y: 0 }, 'ボタンがなければ 0,0');
  let options;
  menuButtonPosition({ currentTarget: { getBoundingClientRect: () => ({ left: 0, bottom: 0 }), focus: (value) => { options = value; } } });
  assert.deepEqual(options, { preventScroll: true }, 'フォーカスでページをスクロールさせない（iOS で背景が揺れるため）');
}

// transform を持つ祖先があると fixed の基準がずれる。置いたあと実際の位置との差で補正する。
function shiftedElement(offsetX, offsetY) {
  return {
    style: { left: '', top: '' },
    getBoundingClientRect() {
      return { left: (parseFloat(this.style.left) || 0) + offsetX, top: (parseFloat(this.style.top) || 0) + offsetY };
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
// 既に置けていれば書き換えない。スクロールのたびに仮の位置へ戻すと揺れて見える。
{
  const placed = shiftedElement(156, 509);
  placeContextMenu(placed, 204, 537);
  let writes = 0;
  const style = placed.style;
  placed.style = new Proxy(style, { set(target, key, value) { writes += 1; target[key] = value; return true; } });
  placeContextMenu(placed, 204, 537);
  assert.equal(writes, 0, '位置が合っていれば style を書き換えない');
  placeContextMenu(placed, 210, 537);
  assert.deepEqual(placed.getBoundingClientRect(), { left: 210, top: 537 }, 'ずれた分だけ動かす');
  assert.equal(writes, 1, '動いた軸だけ書き換える');
}

// サブメニューは親メニューの右に出し、右に入らなければ左へ反転する。縦は親項目に揃え、はみ出したら上へずらす。
const viewport = { width: 1280, height: 800 };
const size = { width: 200, height: 120 };
const right = submenuPlacement({ panel: { left: 100, right: 300 }, itemTop: 150, inset: 5, size, viewport, margin: 8 });
assert.deepEqual([right.side, right.left, right.top], ['right', 300, 145], '右に入れば親の右辺に接し、項目の上端に揃える');
const flipped = submenuPlacement({ panel: { left: 1000, right: 1200 }, itemTop: 150, inset: 5, size, viewport, margin: 8 });
assert.deepEqual([flipped.side, flipped.left], ['left', 800], '右に入らなければ左へ反転する');
const edgeRight = submenuPlacement({ panel: { left: 900, right: 1072 }, itemTop: 150, inset: 5, size, viewport, margin: 8 });
assert.deepEqual([edgeRight.side, edgeRight.left], ['right', 1072], '右端ちょうどに収まるなら反転しない');
const low = submenuPlacement({ panel: { left: 100, right: 300 }, itemTop: 760, inset: 5, size, viewport, margin: 8 });
assert.equal(low.top, 800 - 8 - 120, '下にはみ出すなら上へずらす');
const tall = submenuPlacement({ panel: { left: 100, right: 300 }, itemTop: 300, inset: 5, size: { width: 200, height: 2000 }, viewport, margin: 8 });
assert.deepEqual([tall.top, tall.maxHeight], [8, 784], '画面より高ければ上端から置き、高さを画面内に制限する');
const narrow = submenuPlacement({ panel: { left: 40, right: 240 }, itemTop: 100, inset: 5, size: { width: 200, height: 120 }, viewport: { width: 400, height: 800 }, margin: 8 });
assert.deepEqual([narrow.side, narrow.left], ['right', 192], '左右どちらにも入らなければ広い側に出し、画面内へ寄せる');

// サブメニューのキー操作（APG Menu）。
const at = (inSubmenu, isParent = false, disabled = false) => ({ inSubmenu, isParent, disabled });
assert.equal(submenuKeyAction('ArrowRight', at(false, true)), 'open', '親の項目で → は開く');
assert.equal(submenuKeyAction('Enter', at(false, true)), 'open', '親の項目で Enter は開く');
assert.equal(submenuKeyAction(' ', at(false, true)), 'open', '親の項目で Space は開く');
assert.equal(submenuKeyAction('ArrowRight', at(false, true, true)), 'none', '無効な親は開かない');
assert.equal(submenuKeyAction('ArrowRight', at(false, false)), 'none', '親でない項目で → は何もしない');
assert.equal(submenuKeyAction('Enter', at(false, false)), 'none', '親でない項目の Enter は通常の実行に任せる');
assert.equal(submenuKeyAction('ArrowRight', at(true)), 'none', 'サブメニュー内の → は何もしない');
assert.equal(submenuKeyAction('ArrowLeft', at(true)), 'closeSubmenu', 'サブメニュー内の ← は親へ戻る');
assert.equal(submenuKeyAction('Escape', at(true)), 'closeSubmenu', 'サブメニュー内の Escape は親へ戻る');
assert.equal(submenuKeyAction('ArrowLeft', at(false)), 'none', 'ルートの ← は何もしない');
assert.equal(submenuKeyAction('Escape', at(false)), 'closeAll', 'ルートの Escape は全体を閉じる');
assert.equal(submenuKeyAction('Tab', at(true)), 'closeAll', 'Tab はどこでも全体を閉じる');
assert.ok(SUBMENU_DELAY > 0, 'ホバーで開閉するまで待つ');

// サブメニューの popover が閉じたときの toggle で、全体まで閉じない。
{
  const listeners = {};
  const target = () => ({ addEventListener(type, handler) { listeners[type] = handler; }, removeEventListener() {} });
  const saved = { document: globalThis.document, window: globalThis.window, HTMLElement: globalThis.HTMLElement, Element: globalThis.Element };
  class FakeElement { hasAttribute(name) { return name === 'popover'; } }
  globalThis.HTMLElement = FakeElement;
  globalThis.Element = FakeElement;
  globalThis.document = target();
  globalThis.window = target();
  const rootElement = { ...target(), contains: () => true };
  const panel = new FakeElement();
  const submenu = new FakeElement();
  let closed = 0;
  listenToMenu(rootElement, () => { closed += 1; }, () => {}, panel);
  listeners.toggle({ target: submenu, newState: 'closed' });
  assert.equal(closed, 0, 'サブメニューが閉じても全体は閉じない');
  listeners.toggle({ target: panel, newState: 'closed' });
  assert.equal(closed, 1, 'ルートの popover が閉じたら全体を閉じる');
  // メニューを aria-controls で指すボタンの押下とフォーカス移動は、外側として扱わない（トグルにするため）。
  class FakeTarget extends FakeElement {
    constructor(controls) { super(); this.controls = controls; }
    closest(selector) { return this.controls && selector === `[aria-controls~="${this.controls}"]` ? this : null; }
  }
  panel.id = 'task-menu';
  rootElement.contains = () => false;
  closed = 0;
  listeners.pointerdown({ target: new FakeTarget('task-menu') });
  listeners.focusout({ relatedTarget: new FakeTarget('task-menu') });
  assert.equal(closed, 0, 'メニューボタンを押しても外側クリックとして閉じない');
  listeners.pointerdown({ target: new FakeTarget('other-menu') });
  assert.equal(closed, 1, '別のボタンを押したら閉じる');
  globalThis.Element = FakeElement;
  let dropdownClosed = 0;
  listenToMenu(rootElement, () => { dropdownClosed += 1; }, () => {});
  listeners.toggle({ target: submenu, newState: 'closed' });
  assert.equal(dropdownClosed, 1, 'panel を渡さない Dropdown・Picker は従来どおりどの popover でも閉じる');
  Object.assign(globalThis, saved);
}

const read = (path) => readFileSync(resolve(root, path), 'utf8');

for (const [name, path] of [['Vue', 'packages/vue/src/generated/components/ContextMenu/ContextMenu.vue'], ['React', 'packages/react/src/generated/components/ContextMenu/ContextMenu.tsx']]) {
  const source = read(path);
  assert.match(source, /role="menu"/, `${name} 版がメニューとして読み上げられる`);
  assert.match(source, /role="menuitem"/, `${name} 版の項目がメニュー項目になる`);
  assert.match(source, /tab(index|Index)="?\{?-1/, `${name} 版の項目は Tab 移動の対象外`);
  assert.match(source, /data-menu-top-layer/, `${name} 版が最前面に出る`);
  assert.match(source, /data-destructive/, `${name} 版が取り消せない操作を属性で出す`);
  assert.match(source, /[Cc]ontext[Mm]enu[\s\S]{0,120}?preventDefault/, `${name} 版がメニュー内の右クリックを抑止する`);
  assert.doesNotMatch(source, /aria-controls/, `${name} 版は対象と紐づけない（トリガーを持たないため）`);
  assert.match(source, /aria-haspopup/, `${name} 版がサブメニューを持つ項目を伝える`);
  assert.match(source, /role="menu"[\s\S]{0,120}?(:?id=\{?"?(props\.)?id)|(:?id=\{?"?(props\.)?id)[\s\S]{0,120}?role="menu"/, `${name} 版がメニューボタンから指せる id を持つ`);
  assert.match(source, /aria-expanded/, `${name} 版がサブメニューの開閉を伝える`);
  assert.match(source, /data-submenu/, `${name} 版がサブメニューをルートの兄弟として置く`);
  assert.match(source, /SUBMENU_DELAY/, `${name} 版がホバーで開閉するまで待つ`);
  assert.match(source, /listenToMenu\([\s\S]{0,160}?panelRef/, `${name} 版がルートの popover が閉じたときだけ全体を閉じる`);
  assert.match(source, /placeContextMenu/, `${name} 版が座標を実際の位置で補正する`);
  // 開閉に伴うフォーカス移動でページをスクロールさせない。矢印キーの移動（リスト内のスクロールが要る）は除く。
  const calls = [...source.matchAll(/\.focus\(([^)]*)\)/g)].filter((match) => !/nextMenuIndex|typeaheadTarget/.test(source.slice(match.index - 240, match.index)));
  assert.ok(calls.length >= 5, `${name} 版の開閉のフォーカス移動を検査できている`);
  for (const call of calls) {
    assert.match(call[1], /preventScroll:\s*true/, `${name} 版の開閉のフォーカス移動がスクロールを止める: ${call[0].replace(/\s+/g, ' ')}`);
  }
  assert.match(source, /function run[\s\S]*?onSelect\?\.\([\s\S]*?onClose\?\.\(/, `${name} 版が実行してから閉じる（onSelect の後に onClose）`);
  // フォーカスを戻すと focusout が同期的に起きるため、その前にリスナーを外していないと onClose が先に割り込む。
  assert.match(source, /function run[\s\S]*?teardown\(\)[\s\S]*?focus\([\s\S]*?onSelect\?\.\(/, `${name} 版が実行時、フォーカスを戻す前に外部イベントを外す`);
  assert.match(source, /function close[\s\S]*?teardown\(\)[\s\S]*?focus\(/, `${name} 版が閉じるとき、フォーカスを戻す前に外部イベントを外す`);
  assert.match(source, /function teardown[\s\S]*?detach\(\)[\s\S]*?resetMenu/, `${name} 版がリスナーを外してからメニューを隠す`);
  assert.doesNotMatch(source, /:not\(\[aria-disabled="true"\]\)/, `${name} 版が無効な項目も含めて先頭にフォーカスする`);
  assert.match(source, /項目がありません/, `${name} 版が 0 件のときもフォーカスできる項目を出す`);
  assert.doesNotMatch(source, /left: `\$\{(props\.)?x\}px`/, `${name} 版が座標を style で直接渡さない`);
  assert.match(source, /if \((props\.)?open\) \{[\s\S]{0,40}?cleanupRef(\.current|\.value)? = listenToMenu/,
    `${name} 版は開いている間だけ外側クリックを受け、開くたびにその時点の props で登録する`);
}

for (const [name, path] of [['Vue', 'packages/vue/src/generated/components/Dropdown/Dropdown.vue'], ['React', 'packages/react/src/generated/components/Dropdown/Dropdown.tsx']]) {
  const source = read(path);
  assert.match(source, /nextMenuIndex/, `${name} 版 Dropdown が共有の移動計算を使う`);
  assert.match(source, /typeaheadTarget/, `${name} 版 Dropdown が共有の先頭文字検索を使う`);
}

for (const [name, path] of [['Vue', 'packages/vue/src/generated/components/Button/Button.vue'], ['React', 'packages/react/src/generated/components/Button/Button.tsx']]) {
  const source = read(path);
  assert.match(source, /aria-haspopup/, `${name} 版 Button がメニューボタンになれる`);
  assert.match(source, /onClick\?\.\(event\)/, `${name} 版 Button が click イベントを渡す（menuButtonPosition 用）`);
}

// 右クリックできない環境でも階層が見えるよう、代替は Dropdown ではなく同じ ContextMenu を開くボタンにする。
for (const path of ['packages/react/src/ContextMenu.stories.tsx', 'packages/vue/src/ContextMenu.stories.ts', 'apps/docs/src/examples/ContextMenuDemo.tsx', 'apps/docs/src/examples/ContextMenuDemo.vue']) {
  const source = read(path);
  assert.doesNotMatch(source, /Dropdown|flatten/, `${path}: 階層を平らにした Dropdown を代替にしない`);
  assert.match(source, /menuButtonPosition/, `${path}: 三点ボタンから同じメニューを開く`);
}

for (const framework of ['vue', 'react']) {
  const css = read(`packages/${framework}/dist/style.css`);
  assert.match(css, /\[data-destructive=['"]?true['"]?\][^{]*\{[^}]*--koyori-color-danger/, `${framework}: 取り消せない操作の色がある`);
  assert.match(css, /position:fixed[^}]*width:0|width:0[^}]*position:fixed/, `${framework}: 座標に置く起点の規則がある`);
  assert.match(css, /_chevron_[^{]*\{[^}]*rotate\(-90deg\)/, `${framework}: サブメニューを持つ項目に › の目印を出す`);
}

console.log('ContextMenu の移動・座標・生成物・配布 CSS の規則を確認しました。');
