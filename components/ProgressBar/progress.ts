/* 値の計算はここに置き、ブラウザーなしで検証する。 */

/* 最大値の補正は表示と読み上げで同じものを使う。非有限・0 以下・未指定は 100 とする。 */
export function progressMax(max: number | undefined) {
  return max !== undefined && Number.isFinite(max) && max > 0 ? max : 100;
}

export function progressRatio(value: number, max: number | undefined) {
  const limit = progressMax(max);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(value / limit, 1);
}

/* 満たしていないうちは 100% と言わない。 */
export function formatPercent(ratio: number) {
  const percent = ratio >= 1 ? 100 : Math.min(Math.round(ratio * 100), 99);
  return `${percent}%`;
}
