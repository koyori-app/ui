/* 行数の計算はここに置き、ブラウザーなしで検証する。 */

/* 未指定・非有限・1 未満は 1 行。小数は切り捨てる。 */
export function skeletonLineCount(lines: number | undefined) {
  if (lines === undefined || !Number.isFinite(lines) || lines < 1) return 1;
  return Math.floor(lines);
}

/* For で回すための添字の配列。行そのものに意味はないので番号だけを持つ。 */
export function skeletonLines(lines: number | undefined) {
  return Array.from({ length: skeletonLineCount(lines) }, (_value, index) => index);
}
