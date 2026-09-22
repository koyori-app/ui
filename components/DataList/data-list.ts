/* ソートの遷移と読み上げ属性はここに置き、ブラウザーなしで検証する。 */

export type DataListSortDirection = 'ascending' | 'descending';

export interface DataListSort {
  columnId: string;
  direction: DataListSortDirection;
}

/* 同じ列を押すたび 昇順 → 降順 → 解除。別の列は昇順から始める。 */
export function nextSort(current: DataListSort | null | undefined, columnId: string): DataListSort | null {
  if (!current || current.columnId !== columnId) return { columnId, direction: 'ascending' };
  return current.direction === 'ascending' ? { columnId, direction: 'descending' } : null;
}

/* 並べ替えできない列には付けない。対象でない列は none で「並べ替えできる」ことを伝える。 */
export function ariaSort(column: { id: string; sortable?: boolean }, sort: DataListSort | null | undefined) {
  if (!column.sortable) return undefined;
  return sort && sort.columnId === column.id ? sort.direction : 'none';
}

/* 追加読み込みの表示条件はここに置き、ブラウザーなしで検証する。 */

/* 行があるとき（ready）だけ出す。読み込み中もボタンを消さず、フォーカスを保つ。 */
export function showLoadMore(status: string | undefined, hasMore: boolean | undefined, loadingMore: boolean | undefined) {
  if (status !== undefined && status !== 'ready') return false;
  return !!hasMore || !!loadingMore;
}
