// No browser needed: node scripts/check-tree-logic.cjs
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const compiled = mkdtempSync(join(tmpdir(), 'koyori-tree-logic-'));
let tree;
try {
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--ignoreConfig',
    '--module', 'commonjs', '--target', 'ES2022', '--skipLibCheck', '--rootDir', resolve(__dirname, '../components'),
    '--outDir', compiled, resolve(__dirname, '../components/Tree/tree.ts')], { stdio: 'inherit' });
  tree = require(join(compiled, 'Tree/tree.js'));
} finally {
  rmSync(compiled, { recursive: true, force: true });
}
const { treeBranchIds, visibleTreeNodes, treeTabStop, nextTreeFocus, toggleTreeExpanded, treeActivation, defaultTreeExpanded } = tree;

// src/          (branch)
//   lib/        (branch)
//     a.ts
//     b.ts      (disabled)
//   c.ts
// empty/        (branch, no children)
// d.ts
// locked/       (branch, disabled)
//   e.ts
const nodes = [
  { id: 'src', label: 'src', children: [
    { id: 'lib', label: 'lib', children: [{ id: 'a', label: 'a.ts' }, { id: 'b', label: 'b.ts', disabled: true }] },
    { id: 'c', label: 'c.ts' },
  ] },
  { id: 'empty', label: 'empty', children: [] },
  { id: 'd', label: 'd.ts' },
  { id: 'locked', label: 'locked', disabled: true, children: [{ id: 'e', label: 'e.ts' }] },
];
const ids = rows => rows.map(row => row.id);

// treeBranchIds: 子を持つ節を上から（空の配列も節）。defaultExpandedIds を省いたときの初期値。
assert.deepEqual(treeBranchIds(nodes), ['src', 'lib', 'empty', 'locked']);
assert.deepEqual(treeBranchIds(undefined), []);
// defaultTreeExpanded: 閉じた節だけを除く。後から届いた節は開いている。
assert.deepEqual(defaultTreeExpanded(nodes, ['lib']), ['src', 'empty', 'locked']);
assert.deepEqual(defaultTreeExpanded([...nodes, { id: 'late', label: 'late', children: [] }], ['lib']), ['src', 'empty', 'locked', 'late'], 'late branches start open');
assert.deepEqual(defaultTreeExpanded(undefined, ['lib']), []);

// visibleTreeNodes: 全部開くと全部、深さ・兄弟の数・位置・親。
const all = visibleTreeNodes(nodes, treeBranchIds(nodes));
assert.deepEqual(ids(all), ['src', 'lib', 'a', 'b', 'c', 'empty', 'd', 'locked', 'e']);
assert.deepEqual(all.map(row => [row.level, row.setSize, row.posInSet, row.parentId]), [
  [1, 4, 1, null], [2, 2, 1, 'src'], [3, 2, 1, 'lib'], [3, 2, 2, 'lib'], [2, 2, 2, 'src'],
  [1, 4, 2, null], [1, 4, 3, null], [1, 4, 4, null], [2, 1, 1, 'locked'],
]);
assert.deepEqual(all.map(row => row.expandable), [true, true, false, false, false, true, false, true, false], 'leaves are not expandable');
// 閉じた節の子孫は飛ばす。祖先が閉じていれば、開いている子孫も出ない。
const closedLib = visibleTreeNodes(nodes, ['src']);
assert.deepEqual(ids(closedLib), ['src', 'lib', 'c', 'empty', 'd', 'locked']);
assert.equal(closedLib[1].expanded, false);
assert.deepEqual(ids(visibleTreeNodes(nodes, ['lib'])), ['src', 'empty', 'd', 'locked'], 'a closed ancestor hides open descendants');
assert.deepEqual(visibleTreeNodes(undefined, []), []);

// treeTabStop: フォーカスしていた節 → 選択中 → 先頭。見えない節には置かない。
assert.equal(treeTabStop(all, 'c', 'a'), 'c');
assert.equal(treeTabStop(closedLib, 'a', 'c'), 'c', 'hidden focus falls back to the selection');
assert.equal(treeTabStop(closedLib, null, 'a'), 'src', 'hidden selection falls back to the first node');
assert.equal(treeTabStop([], null, null), null);

const move = (rows, current, key) => nextTreeFocus(rows, current, key);
// ↑ ↓: 見えている節を順に。端で回らない。閉じた節の子は飛ばす。無効の節にもフォーカスは置ける。
assert.deepEqual(move(all, 'a', 'ArrowDown'), { type: 'focus', id: 'b' });
assert.deepEqual(move(all, 'b', 'ArrowDown'), { type: 'focus', id: 'c' });
assert.deepEqual(move(closedLib, 'lib', 'ArrowDown'), { type: 'focus', id: 'c' }, 'skips children of a closed node');
assert.deepEqual(move(closedLib, 'c', 'ArrowUp'), { type: 'focus', id: 'lib' });
assert.equal(move(all, 'e', 'ArrowDown'), null, 'no wrap at the end');
assert.equal(move(all, 'src', 'ArrowUp'), null, 'no wrap at the start');
assert.deepEqual(move(all, null, 'ArrowDown'), { type: 'focus', id: 'src' });
// Home / End
assert.deepEqual(move(all, 'c', 'Home'), { type: 'focus', id: 'src' });
assert.deepEqual(move(all, 'c', 'End'), { type: 'focus', id: 'e' });
assert.deepEqual(move(closedLib, 'c', 'End'), { type: 'focus', id: 'locked' });
// →: 閉じていれば開く、開いていれば最初の子へ、葉と空の節では何もしない。
assert.deepEqual(move(closedLib, 'lib', 'ArrowRight'), { type: 'expand', id: 'lib' });
assert.deepEqual(move(all, 'lib', 'ArrowRight'), { type: 'focus', id: 'a' });
assert.equal(move(all, 'a', 'ArrowRight'), null);
assert.equal(move(all, 'empty', 'ArrowRight'), null, 'an open empty branch has no first child');
// ←: 開いていれば閉じる、閉じていれば・葉なら親へ、最上段の閉じた節では何もしない。
assert.deepEqual(move(all, 'lib', 'ArrowLeft'), { type: 'collapse', id: 'lib' });
assert.deepEqual(move(closedLib, 'lib', 'ArrowLeft'), { type: 'focus', id: 'src' });
assert.deepEqual(move(all, 'a', 'ArrowLeft'), { type: 'focus', id: 'lib' });
assert.equal(move(visibleTreeNodes(nodes, []), 'src', 'ArrowLeft'), null);
// 無効の節は開閉と選択をしない。フォーカスは移せる。
const lockedClosed = visibleTreeNodes(nodes, []);
assert.equal(move(lockedClosed, 'locked', 'ArrowRight'), null, 'a disabled node does not expand');
assert.equal(move(all, 'locked', 'ArrowLeft'), null, 'a disabled open top-level node neither collapses nor moves');
assert.deepEqual(move(all, 'e', 'ArrowLeft'), { type: 'focus', id: 'locked' }, 'a child can move focus to its disabled parent');
// Enter と Space はクリックと同じ。無効の節では何もしない。
assert.deepEqual(move(all, 'a', 'Enter'), { type: 'activate', id: 'a' });
assert.deepEqual(move(all, 'src', ' '), { type: 'activate', id: 'src' });
assert.equal(move(all, 'b', 'Enter'), null, 'a disabled leaf cannot be selected');
assert.equal(move(all, 'a', 'x'), null, 'other keys are ignored');
assert.equal(move([], 'a', 'ArrowDown'), null);

// treeActivation: 子を持つ節は開閉、葉は選択、無効は何もしない。
const row = id => all.find(r => r.id === id);
assert.deepEqual(treeActivation(row('a')), { type: 'select', id: 'a' });
assert.deepEqual(treeActivation(row('src')), { type: 'toggle', id: 'src', open: false });
assert.deepEqual(treeActivation(closedLib[1]), { type: 'toggle', id: 'lib', open: true });
assert.equal(treeActivation(row('b')), null, 'a disabled leaf cannot be selected');
assert.equal(treeActivation(row('locked')), null, 'a disabled branch cannot be toggled');
assert.equal(treeActivation(undefined), null);

// toggleTreeExpanded
assert.deepEqual(toggleTreeExpanded(['src', 'lib'], 'lib', false), ['src']);
assert.deepEqual(toggleTreeExpanded(['src'], 'lib', true), ['src', 'lib']);
assert.deepEqual(toggleTreeExpanded(['src', 'lib'], 'src', true), ['lib', 'src'], 'no duplicates');

console.log('Tree logic: visible rows, levels, tab stop, arrow/Home/End moves, closed children, disabled nodes and toggling passed.');
