import { For, onUpdate, useRef, useStore } from '@builder.io/mitosis';
import { enterHighlight, hideHighlight, highlightItem, leaveHighlight } from '../shared/highlight';
import highlights from '../shared/highlight.module.css';
import controls from '../shared/control.module.css';
import ChevronDownIcon from '../ChevronDownIcon/ChevronDownIcon.lite';
import {
  addDays, addMonths, clampDate, formatFullDate, formatMonth, monthGrid, moveFocus, parseDate, today, weekdayLabels,
} from './calendar';
import styles from './calendar.module.css';

export interface CalendarProps {
  /** Accessible name of the grid, e.g. "予定日". */
  label: string;
  /** Selected date as 'YYYY-MM-DD'. Omit to let the calendar manage it. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Earliest selectable date, inclusive. */
  min?: string;
  /** Latest selectable date, inclusive. */
  max?: string;
  /** Dates that stay focusable but cannot be selected. */
  isDateDisabled?: (date: string) => boolean;
  locale?: string;
  /** 0 = Sunday. Defaults to 0. */
  firstDayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Date marked as today. Defaults to the device date. */
  today?: string;
  previousMonthLabel?: string;
  nextMonthLabel?: string;
}

export default function Calendar(props: CalendarProps) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const state = useStore({
    storedValue: props.defaultValue ?? '',
    focusedDate: clampDate(parseDate(props.value ?? props.defaultValue) ? (props.value ?? props.defaultValue)! : props.today ?? today(), props.min, props.max),
    /* セルごとに呼ぶため、Intl を作る計算とは分けておく。 */
    selectedValue() {
      const value = props.value ?? state.storedValue;
      return parseDate(value) ? value : '';
    },
    isToday(date: string) {
      return date === (props.today ?? today());
    },
    monthStart() {
      return state.focusedDate.slice(0, 8) + '01';
    },
    previousDisabled() {
      return !!parseDate(props.min) && addDays(state.monthStart(), -1) < props.min!;
    },
    nextDisabled() {
      return !!parseDate(props.max) && addMonths(state.monthStart(), 1) > props.max!;
    },
    outOfRange(date: string) {
      return clampDate(date, props.min, props.max) !== date;
    },
    isDisabled(date: string) {
      return state.outOfRange(date) || !!props.isDateDisabled?.(date);
    },
    dayLabel(date: string) {
      return formatFullDate(date, props.locale);
    },
    select(date: string) {
      if (state.outOfRange(date)) return;
      state.focusedDate = date;
      if (props.isDateDisabled?.(date)) return;
      if (props.value === undefined) state.storedValue = date;
      props.onValueChange?.(date);
    },
    changeMonth(months: number, disabled: boolean) {
      if (disabled) return;
      state.focusedDate = clampDate(addMonths(state.focusedDate, months), props.min, props.max);
    },
    navigate(event: { key: string; keyCode?: number; shiftKey?: boolean; isComposing?: boolean; nativeEvent?: { isComposing?: boolean }; preventDefault(): void }) {
      if (event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        state.select(state.focusedDate);
        return;
      }
      const next = moveFocus(state.focusedDate, event.key, !!event.shiftKey, props.firstDayOfWeek ?? 0, props.min, props.max);
      if (next === null) return;
      event.preventDefault();
      state.focusedDate = next;
      /* 月が変わるとセルが描き直されるため、描画のあとでフォーカスを移す。 */
      requestAnimationFrame(() => gridRef?.querySelector<HTMLElement>(`[data-date="${next}"]`)?.focus());
    },
  });

  /* min・max が変わるとフォーカス日が範囲外に取り残され、tabindex="0" のセルがなくなるため合わせて補正する。 */
  onUpdate(() => {
    const base = parseDate(props.value) ? props.value! : state.focusedDate;
    state.focusedDate = clampDate(base, props.min, props.max);
  }, [props.value, props.min, props.max]);

  return (
    <div class={styles.root}>
      <div class={styles.header}>
        <button type="button" class={`${controls.button} ${styles.nav}`} data-variant="ghost" data-icon-only="true"
          aria-label={props.previousMonthLabel ?? '前の月'} aria-disabled={state.previousDisabled() || undefined}
          onClick={() => state.changeMonth(-1, state.previousDisabled())}
        >
          <span class={controls.surface}><span class={styles.previousIcon}><ChevronDownIcon /></span></span>
        </button>
        <span class={styles.month} aria-live="polite" aria-atomic="true">{formatMonth(state.monthStart(), props.locale)}</span>
        <button type="button" class={`${controls.button} ${styles.nav}`} data-variant="ghost" data-icon-only="true"
          aria-label={props.nextMonthLabel ?? '次の月'} aria-disabled={state.nextDisabled() || undefined}
          onClick={() => state.changeMonth(1, state.nextDisabled())}
        >
          <span class={controls.surface}><span class={styles.nextIcon}><ChevronDownIcon /></span></span>
        </button>
      </div>
      {/* ハイライトは table の中に置けないため、table を包む要素に置く。 */}
      <div ref={gridRef!} class={styles.gridWrap}
        onMouseEnter={(event) => enterHighlight(gridRef, event)} onMouseLeave={() => leaveHighlight(gridRef)}
      >
        <span class={highlights.highlight} data-hover-highlight="" aria-hidden="true" />
        <table class={styles.grid} role="grid" aria-label={props.label} onKeyDown={(event) => state.navigate(event)}>
          <thead>
            <tr>
              <For each={weekdayLabels(props.locale, props.firstDayOfWeek ?? 0)}>
                {(weekday, index) => <th key={index} scope="col" aria-label={weekday.long} class={styles.weekday}>{weekday.short}</th>}
              </For>
            </tr>
          </thead>
          <tbody>
            <For each={monthGrid(state.focusedDate, props.firstDayOfWeek ?? 0)}>
              {(week, weekIndex) => (
                <tr key={weekIndex}>
                  <For each={week}>
                    {(date, dayIndex) => (
                      <td key={date ?? `${weekIndex}-${dayIndex}`} class={date ? styles.day : undefined} data-date={date ?? undefined}
                        tabIndex={date && !state.outOfRange(date) ? date === state.focusedDate ? 0 : -1 : undefined}
                        aria-label={date ? state.dayLabel(date) : undefined}
                        aria-selected={date ? date === state.selectedValue() : undefined}
                        aria-disabled={(date && state.isDisabled(date)) || undefined}
                        aria-current={date && state.isToday(date) ? 'date' : undefined}
                        data-outside-range={(date && state.outOfRange(date)) || undefined}
                        onMouseEnter={(event) => { if (date) highlightItem(gridRef, event.currentTarget); else hideHighlight(gridRef); }}
                        onFocus={(event) => { if (!date) return; state.focusedDate = date; highlightItem(gridRef, event.currentTarget); }}
                        onClick={() => { if (date) state.select(date); }}
                      >
                        {date ? Number(date.slice(8)) : null}
                      </td>
                    )}
                  </For>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  );
}
