/* 候補の整理とキー移動の計算はここに置き、ブラウザーなしで検証する。 */

/* 同じ絵文字が二重に並ばないようにする。順番は最初に出てきた位置を保つ。 */
export function uniqueEmojis(list: string[] | undefined) {
  return list ? [...new Set(list)] : [];
}

/* 端では止める。循環させると今どこにいるか分からなくなる。 */
export function nextIndex(index: number, key: string, columns: number, length: number) {
  if (length <= 0) return -1;
  const step = Number.isFinite(columns) && columns >= 1 ? Math.floor(columns) : 1;
  const current = Math.min(Math.max(index, 0), length - 1);
  if (key === 'Home') return 0;
  if (key === 'End') return length - 1;
  const moved =
    key === 'ArrowLeft' ? current - 1 :
    key === 'ArrowRight' ? current + 1 :
    key === 'ArrowUp' ? current - step :
    key === 'ArrowDown' ? current + step :
    current;
  return moved < 0 || moved > length - 1 ? current : moved;
}

/* roving tabindex の位置。候補が減っても Tab で届く候補が残るよう、必ず範囲に収める。 */
export function currentIndex(activeIndex: number, items: string[], emoji: string | undefined, imageUrl: string | undefined) {
  const index = activeIndex >= 0 ? activeIndex : imageUrl ? -1 : items.indexOf(emoji ?? '');
  return Math.min(Math.max(index, 0), items.length - 1);
}
