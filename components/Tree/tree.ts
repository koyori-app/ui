/* 見えている節の並び・移動先・開閉の計算はここに置き、ブラウザーなしで検証する。 */
import type { BadgeTone } from '../Badge/badge';

export interface TreeNode {
  /** 木の中で一意。onSelect と onExpandedChange に渡る。 */
  id: string;
  label: string;
  /** 省略したラベルの全体など。title 属性に出す。 */
  title?: string;
  /** あれば開閉できる節（空の配列でも）。無ければ葉。 */
  children?: TreeNode[];
  /** 行の右に出す Badge。 */
  badge?: { label: string | number; tone?: BadgeTone };
  /** フォーカスは置けるが、選択と開閉はできない。 */
  disabled?: boolean;
}

/* 平らに並べた 1 行。level は 1 から。setSize と posInSet は兄弟の中の数と位置（1 から）。 */
export interface VisibleTreeNode {
  id: string;
  node: TreeNode;
  level: number;
  setSize: number;
  posInSet: number;
  parentId: string | null;
  expandable: boolean;
  expanded: boolean;
}

/* キー操作の結果。focus は移動、expand と collapse は開閉（フォーカスはそのまま）、activate はクリックと同じ。 */
export type TreeMove =
  | { type: 'focus'; id: string }
  | { type: 'expand'; id: string }
  | { type: 'collapse'; id: string }
  | { type: 'activate'; id: string };

export function isTreeBranch(node: TreeNode) {
  return node.children !== undefined;
}

/* 子を持つ節の id をすべて、上から順に。defaultExpandedIds を省いたときの初期値。 */
export function treeBranchIds(nodes: TreeNode[] | undefined): string[] {
  const ids: string[] = [];
  const walk = (list: TreeNode[]) => {
    for (const node of list) {
      if (!isTreeBranch(node)) continue;
      ids.push(node.id);
      walk(node.children || []);
    }
  };
  walk(nodes || []);
  return ids;
}

/* 閉じた節の子孫は並びに入れない。 */
export function visibleTreeNodes(nodes: TreeNode[] | undefined, expandedIds: string[]): VisibleTreeNode[] {
  const rows: VisibleTreeNode[] = [];
  const walk = (list: TreeNode[], level: number, parentId: string | null) => {
    list.forEach((node, index) => {
      const expandable = isTreeBranch(node);
      const expanded = expandable && expandedIds.includes(node.id);
      rows.push({ id: node.id, node, level, setSize: list.length, posInSet: index + 1, parentId, expandable, expanded });
      if (expanded) walk(node.children || [], level + 1, node.id);
    });
  };
  walk(nodes || [], 1, null);
  return rows;
}

/* nodes 全体（閉じた節の中も）から id の祖先を近い順に。id が無ければ null。 */
export function treeNodePath(nodes: TreeNode[] | undefined, id: string): string[] | null {
  const walk = (list: TreeNode[], ancestors: string[]): string[] | null => {
    for (const node of list) {
      if (node.id === id) return ancestors;
      const found = walk(node.children || [], [node.id, ...ancestors]);
      if (found) return found;
    }
    return null;
  };
  return walk(nodes || [], []);
}

/* いまの節（aria-activedescendant が指す節）。上から順に当てはまったものを返す。
   1. cursorId が見えていれば、それ
   2. cursorId が nodes にあって隠れていれば、今の親子関係で最も近い見えている祖先
   3. cursorId が nodes から消えていれば、trail（最後に見えていたときの祖先。近い順）のうち見えている最も近いもの
   4. どれも無い・cursorId が null なら、選択中の節（見えていれば）、無ければ先頭、行が無ければ null
   部品は木の外へ出たときに cursorId を null に戻すので、入り直すと選択中の節に入る（APG）。 */
export function treeActiveId(nodes: TreeNode[] | undefined, visible: VisibleTreeNode[], cursorId: string | null, trail: string[], selectedId: string | null | undefined): string | null {
  const shown = (id: string) => visible.some((row) => row.id === id);
  if (cursorId !== null) {
    if (shown(cursorId)) return cursorId;
    const ancestors = treeNodePath(nodes, cursorId) ?? trail;
    for (const id of ancestors) if (shown(id)) return id;
  }
  if (selectedId != null && shown(selectedId)) return selectedId;
  return visible[0]?.id ?? null;
}

/* 行の DOM の id。aria-activedescendant が指す。node の id に空白や記号があっても 1 つの id になる。 */
export function treeItemId(uid: string, id: string): string {
  return `${uid}-item-${encodeURIComponent(id)}`;
}

/* 中身が同じ id の列か。控えを書き換えるかどうかに使う。 */
export function sameTreeIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/* 描画する 1 行。active と ariaSelected は木全体で 1 回だけ求め、行ごとに数え直さない。 */
export interface TreeRow extends VisibleTreeNode {
  /* いまの節。キー操作の起点で、入れ物にフォーカスがあるときは輪郭を出す。 */
  active: boolean;
  /* 選択中の節は種類を問わず 'true'（無効にされた・節を指したときも選択の表示を消さない）。
     ほかは選べる葉だけ 'false'、開閉だけの節と無効の葉は属性なし（APG）。 */
  ariaSelected: 'true' | 'false' | undefined;
}

/* activeId は treeActiveId で求め終えたいまの節。 */
export function treeRows(visible: VisibleTreeNode[], activeId: string | null, selectedId: string | null | undefined): TreeRow[] {
  return visible.map((row) => ({
    ...row,
    active: row.id === activeId,
    ariaSelected: row.id === selectedId ? 'true' : row.expandable || row.node.disabled ? undefined : 'false',
  }));
}

/* 見えている節の祖先の id。近い順。描画のたびにいまの節の分を控えておき、節が nodes から消えた後の移り先に使う。 */
export function treeAncestorIds(visible: VisibleTreeNode[], id: string): string[] {
  const ancestors: string[] = [];
  let parentId = visible.find((row) => row.id === id)?.parentId ?? null;
  while (parentId !== null && !ancestors.includes(parentId)) {
    ancestors.push(parentId);
    const current: string = parentId;
    parentId = visible.find((row) => row.id === current)?.parentId ?? null;
  }
  return ancestors;
}

/* APG の Tree View のキー操作。端では回らない。無効の節もフォーカスは置けるが、開閉と選択はしない。
   扱わないキーは null。 */
export function nextTreeFocus(visible: VisibleTreeNode[], currentId: string | null, key: string): TreeMove | null {
  if (!visible.length) return null;
  const index = currentId === null ? -1 : visible.findIndex((row) => row.id === currentId);
  const current = index >= 0 ? visible[index] : null;
  const focus = (row: VisibleTreeNode | undefined): TreeMove | null => (row ? { type: 'focus', id: row.id } : null);
  if (key === 'Home') return focus(visible[0]);
  if (key === 'End') return focus(visible[visible.length - 1]);
  if (!current) return key === 'ArrowDown' || key === 'ArrowUp' ? focus(visible[0]) : null;
  if (key === 'ArrowDown') return focus(visible[index + 1]);
  if (key === 'ArrowUp') return focus(visible[index - 1]);
  if (key === 'ArrowRight') {
    if (!current.expandable) return null;
    if (!current.expanded) return current.node.disabled ? null : { type: 'expand', id: current.id };
    const child = visible[index + 1];
    return child && child.parentId === current.id ? focus(child) : null;
  }
  if (key === 'ArrowLeft') {
    if (current.expanded && !current.node.disabled) return { type: 'collapse', id: current.id };
    return current.parentId === null ? null : { type: 'focus', id: current.parentId };
  }
  if (key === 'Enter' || key === ' ') return current.node.disabled ? null : { type: 'activate', id: current.id };
  return null;
}

/* 開閉した後の開いている節。並びは保ち、開くときは末尾に足す。 */
export function toggleTreeExpanded(expandedIds: string[], id: string, open: boolean): string[] {
  const without = expandedIds.filter((value) => value !== id);
  return open ? [...without, id] : without;
}

/* クリックや Enter・Space の結果。子を持つ節は開閉、葉は選択。無効の節は何もしない。 */
export function treeActivation(row: VisibleTreeNode | undefined): { type: 'toggle'; id: string; open: boolean } | { type: 'select'; id: string } | null {
  if (!row || row.node.disabled) return null;
  if (row.expandable) return { type: 'toggle', id: row.id, open: !row.expanded };
  return { type: 'select', id: row.id };
}

/* defaultExpandedIds も expandedIds も無いときの開いている節。閉じた節だけを覚えておき、
   後から届いた節（非同期の読み込み・絞り込みの変更）も開いた状態で出す。 */
export function defaultTreeExpanded(nodes: TreeNode[] | undefined, closedIds: string[]): string[] {
  return treeBranchIds(nodes).filter((id) => !closedIds.includes(id));
}

/* useStore の初期値。[] をそのまま書くと、生成物の型が never[] になる。 */
export function noTreeIds(): string[] {
  return [];
}

/* useStore の初期値。null をそのまま書くと、生成物の ref(null) / useState(() => null) が string を受けない型になる。 */
export function noTreeId(): string | null {
  return null;
}
