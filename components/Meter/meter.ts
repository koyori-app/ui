/* 段の数・値・色の決定はここに置き、ブラウザーなしで検証する。 */

export type MeterTone = 'auto' | 'neutral' | 'danger' | 'warning' | 'success';
/* auto を解いたあとの色。data-tone に出す値。 */
export type MeterResolvedTone = Exclude<MeterTone, 'auto'>;

export const METER_DEFAULT_MAX = 3;
/* 段を区切って見せる部品なので、区切りが読み取れなくなる数は許さない。 */
export const METER_MAX_LIMIT = 20;

/* 段の数は表示と読み上げで同じものを使う。非有限・1 未満・未指定は 3、小数は切り捨て、上限 20。 */
export function meterMax(max: number | undefined) {
  if (max === undefined || !Number.isFinite(max) || max < 1) return METER_DEFAULT_MAX;
  return Math.min(Math.floor(max), METER_MAX_LIMIT);
}

/* 満たした段の数。小数は切り捨てて 0..max に収める。非有限は 0。 */
export function meterValue(value: number, max: number | undefined) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.floor(value), 0), meterMax(max));
}

/* auto は「多いほど良い」前提で、0 は neutral、1/3 以下 danger、2/3 以下 warning、それ以上 success。
   割り算の誤差で境界がずれないよう、整数のまま比べる。 */
export function meterTone(tone: MeterTone | undefined, value: number, max: number | undefined): MeterResolvedTone {
  if (tone && tone !== 'auto') return tone;
  const current = meterValue(value, max);
  const limit = meterMax(max);
  if (current === 0) return 'neutral';
  if (current * 3 <= limit) return 'danger';
  if (current * 3 <= limit * 2) return 'warning';
  return 'success';
}

/* For で回すための添字の配列。段そのものに意味はないので番号だけを持つ。 */
export function meterSegments(max: number | undefined) {
  return Array.from({ length: meterMax(max) }, (_value, index) => index);
}
