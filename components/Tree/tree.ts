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

/* Tab で入る 1 つの節。フォーカスしていた節が見えていればそれ、なければ選択中の節、なければ先頭。 */
export function treeTabStop(visible: VisibleTreeNode[], focusedId: string | null | undefined, selectedId: string | null | undefined): string | null {
  if (focusedId != null && visible.some((row) => row.id === focusedId)) return focusedId;
  if (selectedId != null && visible.some((row) => row.id === selectedId)) return selectedId;
  return visible[0]?.id ?? null;
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
