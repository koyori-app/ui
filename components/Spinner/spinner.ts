/* 文言と寸法の補正はここに置き、ブラウザーなしで検証する。 */

export const SPINNER_DEFAULT_LABEL = '読み込み中';
export const SPINNER_DEFAULT_SIZE = 16;

/* 読み上げ名が空になると role="status" が何も伝えないため、空白だけなら既定に戻す。 */
export function spinnerLabel(label: string | undefined) {
  return label && label.trim() ? label : SPINNER_DEFAULT_LABEL;
}

/* アイコンの既定と同じ 16px。非有限・0 以下は描けないので既定に戻す。 */
export function spinnerSize(size: number | undefined) {
  return size !== undefined && Number.isFinite(size) && size > 0 ? size : SPINNER_DEFAULT_SIZE;
}
