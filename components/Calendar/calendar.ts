/* 日付は 'YYYY-MM-DD' の暦日で扱い、演算は UTC で行って端末のタイムゾーンや夏時間でずれないようにする。 */
export type CalendarDate = string;

export function parseDate(text: string | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text ?? '');
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

export function formatDate(year: number, month: number, day: number): CalendarDate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/* 'YYYY-MM-DD' と Intl で表せる年の範囲。これを越える移動は端で止める。 */
const FIRST_DATE: CalendarDate = '0001-01-01';
const LAST_DATE: CalendarDate = '9999-12-31';

function toUTC(date: CalendarDate) {
  const { year, month, day } = parseDate(date)!;
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCFullYear(year);
  return utc;
}

function fromUTC(utc: Date) {
  const year = utc.getUTCFullYear();
  if (year < 1) return FIRST_DATE;
  if (year > 9999) return LAST_DATE;
  return formatDate(year, utc.getUTCMonth() + 1, utc.getUTCDate());
}

export function addDays(date: CalendarDate, days: number) {
  const utc = toUTC(date);
  utc.setUTCDate(utc.getUTCDate() + days);
  return fromUTC(utc);
}

/* 日は移動先の月の日数に収める（1/31 の翌月は 2/28 か 2/29）。 */
export function addMonths(date: CalendarDate, months: number) {
  const { year, month, day } = parseDate(date)!;
  const index = year * 12 + month - 1 + months;
  const nextYear = Math.floor(index / 12);
  const nextMonth = index - nextYear * 12 + 1;
  if (nextYear < 1) return FIRST_DATE;
  if (nextYear > 9999) return LAST_DATE;
  return formatDate(nextYear, nextMonth, Math.min(day, daysInMonth(nextYear, nextMonth)));
}

/* 不正な min・max は無視する。min > max なら min を優先する。 */
export function clampDate(date: CalendarDate, min?: string, max?: string) {
  if (parseDate(max) && date > max!) date = max!;
  if (parseDate(min) && date < min!) date = min!;
  return date;
}

export function dayOfWeek(date: CalendarDate) {
  return toUTC(date).getUTCDay();
}

/* 高さが月で変わらないよう常に 6 週を返す。当月以外は null。 */
export function monthGrid(date: CalendarDate, firstDayOfWeek: number) {
  const { year, month } = parseDate(date)!;
  const offset = (dayOfWeek(formatDate(year, month, 1)) - firstDayOfWeek + 7) % 7;
  const total = daysInMonth(year, month);
  return Array.from({ length: 6 }, (_, week) => Array.from({ length: 7 }, (_, weekday) => {
    const day = week * 7 + weekday - offset + 1;
    return day >= 1 && day <= total ? formatDate(year, month, day) : null;
  }));
}

/* APG の Date Picker のキー操作。対象外のキーは null を返す。 */
export function moveFocus(date: CalendarDate, key: string, shift: boolean, firstDayOfWeek: number, min?: string, max?: string) {
  const fromWeekStart = (dayOfWeek(date) - firstDayOfWeek + 7) % 7;
  const next = key === 'ArrowLeft' ? addDays(date, -1)
    : key === 'ArrowRight' ? addDays(date, 1)
    : key === 'ArrowUp' ? addDays(date, -7)
    : key === 'ArrowDown' ? addDays(date, 7)
    : key === 'Home' ? addDays(date, -fromWeekStart)
    : key === 'End' ? addDays(date, 6 - fromWeekStart)
    : key === 'PageUp' ? addMonths(date, shift ? -12 : -1)
    : key === 'PageDown' ? addMonths(date, shift ? 12 : 1)
    : null;
  return next === null ? null : clampDate(next, min, max);
}

function format(date: CalendarDate, locale: string | undefined, options: Intl.DateTimeFormatOptions) {
  /* 値はグレゴリオ暦の暦日なので、ロケール既定の暦（fa-IR のペルシャ暦など）に振り替えさせない。 */
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC', calendar: 'gregory' }).format(toUTC(date));
}

/* 2026-09-06 は日曜日。そこから週の始まりの曜日を数える。 */
export function weekdayLabels(locale: string | undefined, firstDayOfWeek: number) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = formatDate(2026, 9, 6 + (firstDayOfWeek + index) % 7);
    return { short: format(date, locale, { weekday: 'short' }), long: format(date, locale, { weekday: 'long' }) };
  });
}

export function formatMonth(date: CalendarDate, locale?: string) {
  return format(date, locale, { year: 'numeric', month: 'long' });
}

export function formatFullDate(date: CalendarDate, locale?: string) {
  return format(date, locale, { dateStyle: 'full' });
}

export function today() {
  const now = new Date();
  return formatDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}
