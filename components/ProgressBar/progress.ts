/* 値の計算はここに置き、ブラウザーなしで検証する。 */
export function progressRatio(value: number, max: number) {
  const limit = Number.isFinite(max) && max > 0 ? max : 100;
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(value / limit, 1);
}

/* 満たしていないうちは 100% と言わない。 */
export function formatPercent(ratio: number) {
  const percent = ratio >= 1 ? 100 : Math.min(Math.round(ratio * 100), 99);
  return `${percent}%`;
}
