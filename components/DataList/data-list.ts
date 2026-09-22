/* 追加読み込みの表示条件はここに置き、ブラウザーなしで検証する。 */

/* 行があるとき（ready）だけ出す。読み込み中もボタンを消さず、フォーカスを保つ。 */
export function showLoadMore(status: string | undefined, hasMore: boolean | undefined, loadingMore: boolean | undefined) {
  if (status !== undefined && status !== 'ready') return false;
  return !!hasMore || !!loadingMore;
}
