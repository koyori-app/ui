/* ページ数・範囲・前後に進めるかの計算と範囲の文言はここに置き、ブラウザーなしで検証する。 */

export interface PaginationRange {
  /** 1 始まりの先頭の件番号。0 件なら 0。 */
  from: number;
  /** 末尾の件番号。0 件なら 0。 */
  to: number;
  total: number;
}

/* 0 で割らないよう、非有限・1 未満は 1 件ずつとして扱う。小数は切り捨てる。 */
function normalizePageSize(pageSize: number) {
  return Number.isFinite(pageSize) && pageSize >= 1 ? Math.floor(pageSize) : 1;
}

/* 件数は 0 以上の整数。非有限は 0 件として扱う。 */
function normalizeTotal(total: number | undefined) {
  return total !== undefined && Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
}

/* ページ番号は 1 以上の整数。非有限・1 未満は 1 ページ目。 */
function normalizePage(page: number) {
  return Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
}

export function pageCount(total: number | undefined, pageSize: number) {
  return Math.ceil(normalizeTotal(total) / normalizePageSize(pageSize));
}

/* 表示に使うページ。total が分かっていて範囲を超えていれば末尾ページとして扱う。
   ページを直すかどうかは利用側が決めるので、ここでは onPageChange を呼ばない。 */
export function clampPage(page: number, pageSize: number, total: number | undefined) {
  const current = normalizePage(page);
  if (total === undefined) return current;
  return Math.min(current, Math.max(pageCount(total, pageSize), 1));
}

export function pageRange(page: number, pageSize: number, total: number | undefined): PaginationRange {
  const count = normalizeTotal(total);
  if (count === 0) return { from: 0, to: 0, total: 0 };
  const size = normalizePageSize(pageSize);
  const current = clampPage(page, pageSize, count);
  return { from: (current - 1) * size + 1, to: Math.min(current * size, count), total: count };
}

export function canGoPrevious(page: number) {
  return normalizePage(page) > 1;
}

/* total があれば計算し、無ければ（カーソル式）利用側の hasNext に従う。 */
export function canGoNext(page: number, pageSize: number, total: number | undefined, hasNext: boolean | undefined) {
  if (total === undefined) return !!hasNext;
  return clampPage(page, pageSize, total) < pageCount(total, pageSize);
}

/* 範囲は en dash でつなぐ。0 件で「0–0」と出さない。 */
export function formatPageRange(range: PaginationRange) {
  return range.total === 0 ? '0 件' : `${range.from}–${range.to} / ${range.total} 件`;
}

/** ページ番号の並びの 1 項目。page が null なら省略記号。key は描画の key に使う。 */
export interface PaginationItem {
  key: string;
  page: number | null;
}

/* 前後に出すページ数。非有限・負は既定の 2、小数は切り捨てる。 */
function normalizeSiblingCount(siblingCount: number | undefined) {
  return siblingCount !== undefined && Number.isFinite(siblingCount) && siblingCount >= 0 ? Math.floor(siblingCount) : 2;
}

/* 先頭・末尾のページと現在ページの前後 siblingCount ページを出し、間を省略記号にまとめる。
   省略記号が 1 ページしか隠さないときはそのページを出すので、項目数は常に 2 * siblingCount + 5 以下になり、
   ページを移っても並びの幅がぶれにくい。total が無い（カーソル式）・0 件なら空。 */
export function pageItems(page: number, pageSize: number, total: number | undefined, siblingCount?: number): PaginationItem[] {
  const count = pageCount(total, pageSize);
  if (count === 0) return [];
  const siblings = normalizeSiblingCount(siblingCount);
  const pageItem = (value: number): PaginationItem => ({ key: `page-${value}`, page: value });
  if (count <= 2 * siblings + 5) return Array.from({ length: count }, (_, index) => pageItem(index + 1));
  const current = clampPage(page, pageSize, total);
  // 端に寄っても前後の幅を保つよう、反対側へ広げる。
  const start = Math.max(Math.min(current - siblings, count - 2 * siblings - 2), 3);
  const end = Math.min(Math.max(current + siblings, 2 * siblings + 3), count - 2);
  const items = [pageItem(1), start > 3 ? { key: 'ellipsis-start', page: null } : pageItem(2)];
  for (let value = start; value <= end; value++) items.push(pageItem(value));
  items.push(end < count - 2 ? { key: 'ellipsis-end', page: null } : pageItem(count - 1), pageItem(count));
  return items;
}

/* ページ番号のボタンの名前。数字だけでは何の番号か伝わらないため「ページ目」を付ける。 */
export function formatPageLabel(page: number) {
  return `${page} ページ目`;
}
