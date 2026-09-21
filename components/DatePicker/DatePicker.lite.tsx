import { For, Show, onMount, onUnMount, onUpdate, useContext, useRef, useStore } from '@builder.io/mitosis';
import Calendar from '../Calendar/Calendar.lite';
import { clampDate, formatFullDate, parseDate } from '../Calendar/calendar';
import ChevronDownIcon from '../ChevronDownIcon/ChevronDownIcon.lite';
import FieldContext from '../Field/field.context.lite';
import { getFieldContext } from '../Field/field';
import { enterHighlight, highlightItem, leaveHighlight } from '../shared/highlight';
import { listenToMenu, positionMenu, resetMenu } from '../shared/menu';
import controls from '../shared/control.module.css';
import highlights from '../shared/highlight.module.css';
import menu from '../shared/menu.module.css';
import styles from './date-picker.module.css';

export interface DatePickerPreset {
  label: string;
  /** A calendar date (YYYY-MM-DD), computed by the caller. */
  value: string;
  disabled?: boolean;
}

export interface DatePickerProps {
  label: string;
  /** Calendar date (YYYY-MM-DD), or '' for no date. Omit for internal state. */
  value?: string;
  defaultValue?: string;
  /** Selecting a date or preset sends YYYY-MM-DD; clearing sends ''. */
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  presets?: DatePickerPreset[];
  clearLabel?: string;
  cancelLabel?: string;
  /** Formats the trigger only. Receives a valid calendar date, never a timestamp. */
  formatValue?: (value: string) => string;
  min?: string;
  max?: string;
  isDateDisabled?: (date: string) => boolean;
  locale?: string;
  firstDayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  today?: string;
  previousMonthLabel?: string;
  nextMonthLabel?: string;
}

export default function DatePicker(props: DatePickerProps) {
  const field = useContext(FieldContext);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const presetsRef = useRef<HTMLDivElement | null>(null);
  let cleanupRef = useRef<(() => void) | null>(null);
  const state = useStore({
    get context() { return getFieldContext(field); },
    id: '',
    open: false,
    storedValue: props.defaultValue ?? '',
    getValue() {
      const value = props.value ?? state.storedValue;
      return parseDate(value) ? value : '';
    },
    getLabel() {
      const selected = state.getValue();
      return selected ? props.formatValue?.(selected) ?? formatFullDate(selected, props.locale) : props.placeholder ?? '未設定';
    },
    unavailable(value: string) {
      return !parseDate(value) || clampDate(value, props.min, props.max) !== value || !!props.isDateDisabled?.(value);
    },
    select(value: string) {
      if (props.disabled || (value && state.unavailable(value))) return;
      if (props.value === undefined) state.storedValue = value;
      // Close and restore focus before the caller saves or removes the control.
      state.close(true);
      props.onValueChange?.(value);
    },
    show() {
      if (!props.disabled) state.open = true;
    },
    detach() {
      cleanupRef?.();
      cleanupRef = null;
    },
    close(restoreFocus: boolean) {
      state.detach();
      state.open = false;
      resetMenu(panelRef, bodyRef);
      if (restoreFocus) triggerRef?.focus({ preventScroll: true });
    },
    position() {
      positionMenu(rootRef, triggerRef, panelRef, bodyRef);
      bodyRef?.querySelector<HTMLElement>('[role="grid"] [data-date]:focus')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    },
    key(event: { key: string; keyCode?: number; isComposing?: boolean; nativeEvent?: { isComposing?: boolean }; preventDefault(): void; stopPropagation(): void }) {
      if (state.open && event.key === 'Escape' && !event.isComposing && !event.nativeEvent?.isComposing && event.keyCode !== 229) {
        event.preventDefault();
        event.stopPropagation();
        state.close(true);
      }
    },
    sync() {
      if (!rootRef || !panelRef) return;
      state.detach();
      if (!state.open || props.disabled) {
        state.close(false);
        return;
      }
      cleanupRef = listenToMenu(rootRef, () => state.close(false), state.position, panelRef);
      requestAnimationFrame(() => {
        if (!panelRef || panelRef.hidden) return;
        state.position();
        const active = bodyRef?.querySelector<HTMLElement>('[role="grid"] [tabindex="0"]');
        active?.focus({ preventScroll: true });
        active?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
    },
  });

  onMount(() => {
    state.id = `koyori-date-picker-${Math.random().toString(36).slice(2)}`;
  });
  onUpdate(() => { state.sync(); }, [state.open, props.disabled]);
  onUpdate(() => {
    if (!panelRef || panelRef.hidden) return;
    requestAnimationFrame(() => state.position());
  }, [props.value, props.min, props.max, props.presets, props.locale]);
  onUnMount(() => { state.detach(); });

  return (
    <div ref={rootRef!} class={`${menu.root} ${state.context?.id ? styles.field : ''}`} data-menu-top-layer="" onKeyDown={(event) => state.key(event)}>
      <button ref={triggerRef!} id={state.context?.id} class={`${controls.button} ${styles.trigger}`}
        type="button" data-variant={state.context?.id ? 'tertiary' : 'ghost'} disabled={props.disabled}
        aria-label={`${props.label}: ${state.getLabel()}`}
        aria-labelledby={state.context?.labelId && state.id ? [state.context?.labelId, `${state.id}-value`, state.context?.requiredId].filter(Boolean).join(' ') : undefined}
        aria-describedby={state.context?.describedBy} aria-invalid={state.context?.invalid || undefined}
        aria-expanded={state.open && !props.disabled} aria-haspopup="dialog" aria-controls={state.id || undefined}
        onClick={() => { if (state.open) state.close(false); else state.show(); }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') { event.preventDefault(); state.show(); }
        }}>
        <span class={`${controls.surface} ${styles.triggerSurface}`}>
          <span id={state.id ? `${state.id}-value` : undefined}>{state.getLabel()}</span>
          <span class={controls.icon} aria-hidden="true"><ChevronDownIcon /></span>
        </span>
      </button>
      <div ref={panelRef!} id={state.id || undefined} class={`${menu.panel} ${styles.panel}`}
        role="dialog" aria-label={props.label} hidden={!state.open || props.disabled}>
        <div ref={bodyRef!} class={`${menu.list} ${styles.body}`}>
          {/* Remount on opening so cancelled navigation cannot replace the selected initial focus. */}
          <Show when={state.open && !props.disabled}>
            <div class={styles.calendar}>
              <Calendar label={props.label} value={state.getValue()} onValueChange={(value) => state.select(value)}
                min={props.min} max={props.max} isDateDisabled={props.isDateDisabled} locale={props.locale}
                firstDayOfWeek={props.firstDayOfWeek} today={parseDate(props.today) ? props.today : undefined}
                previousMonthLabel={props.previousMonthLabel} nextMonthLabel={props.nextMonthLabel} />
            </div>
          </Show>
          <Show when={props.presets?.length}>
            <div ref={presetsRef!} class={styles.presets}
              onMouseEnter={(event) => enterHighlight(presetsRef, event)} onMouseLeave={() => leaveHighlight(presetsRef)}>
              <span class={highlights.highlight} data-hover-highlight="" aria-hidden="true" />
              <For each={props.presets}>
                {(preset, index) => <button key={index} type="button" class={menu.item}
                  disabled={preset.disabled || state.unavailable(preset.value)} aria-disabled={preset.disabled || state.unavailable(preset.value) || undefined}
                  onMouseEnter={(event) => highlightItem(presetsRef, event.currentTarget)}
                  onFocus={(event) => highlightItem(presetsRef, event.currentTarget)}
                  onClick={() => state.select(preset.value)}>
                  <span class={menu.itemLabel}>{preset.label}</span>
                </button>}
              </For>
            </div>
          </Show>
          <div class={styles.actions}>
            <button type="button" class={controls.button} data-variant="ghost" disabled={!state.getValue()} onClick={() => state.select('')}>
              <span class={controls.surface}>{props.clearLabel ?? 'クリア'}</span>
            </button>
            <button type="button" class={controls.button} data-variant="tertiary" onClick={() => state.close(true)}>
              <span class={controls.surface}>{props.cancelLabel ?? 'キャンセル'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
