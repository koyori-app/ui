import { For, Show, Slot, useContext, useRef, useStore, useDefaultProps, onMount, onUnMount, onUpdate } from '@builder.io/mitosis';
import ChevronDownIcon from '../ChevronDownIcon/ChevronDownIcon.lite';
import CheckIcon from '../CheckIcon/CheckIcon.lite';
import Avatar from '../Avatar/Avatar.lite';
import { enterMenu, hideMenuHighlight, highlightMenuItem, leaveMenu, listenToMenu, normalizeMenuText, positionMenu, resetMenu, MENU_TYPEAHEAD_TIMEOUT } from '../shared/menu';
import FieldContext from '../Field/field.context.lite';
import { getFieldContext } from '../Field/field';
import { pickerOptions, pickerValues, PICKER_ANNOUNCE_DELAY } from './picker';
import type { PickerOption } from './picker';
import controls from '../shared/control.module.css';
import menu from '../shared/menu.module.css';
import styles from './picker.module.css';

export interface PickerItem {
  value: string;
  label: string;
  disabled?: boolean;
  /** Shown when avatars is true. Falls back to initials of the label. */
  src?: string;
}

export interface PickerProps {
  label: string;
  items: PickerItem[];
  /** Set false to show only the selectable list. Defaults to true. */
  searchable?: boolean;
  searchPlaceholder?: string;
  searchLabel?: string;
  formatResultsCount?: (count: number) => string;
  selectionSeparator?: string;
  emptyMessage?: string;
  disabled?: boolean;
  defaultOpen?: boolean;
  selectionMode?: 'single' | 'multiple';
  selectedValues?: string[];
  defaultSelectedValues?: string[];
  onSelectionChange?: (values: string[]) => void;
  /** React: rendered icon. Vue: use the icon slot. null hides the icon. */
  icon?: any;
  /** Replaces the selected label shown in the trigger. React: rendered node. Vue: use the trigger slot. */
  trigger?: any;
  /** Shows a 24px Avatar before each option label. */
  avatars?: boolean;
}

export default function Picker(props: PickerProps) {
  // Preserve undefined in Vue; isSearchable owns the default value.
  useDefaultProps({ searchable: undefined });
  const field = useContext(FieldContext);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  let cleanupRef = useRef<(() => void) | null>(null);
  let announcementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  let announcementKey = useRef<string | null>(null);
  const state = useStore({
    get context() { return getFieldContext(field); },
    id: '',
    open: props.defaultOpen || false,
    query: '',
    storedValues: props.defaultSelectedValues || [],
    activeValue: '',
    growingValue: '',
    growTop: false,
    growBottom: false,
    typeBuffer: '',
    typeTime: 0,
    announcement: '',
    isSearchable() {
      return props.searchable ?? true;
    },
    getItems(text?: string): PickerOption[] {
      return pickerOptions(props.items, state.getValues(), !state.isSearchable() ? '' : text ?? state.query);
    },
    getValues() {
      return pickerValues(props.items, props.selectedValues ?? state.storedValues, props.selectionMode === 'multiple');
    },
    getLabel() {
      const selected = new Set(state.getValues());
      return props.items.filter((item) => selected.has(item.value)).map((item) => item.label).join(props.selectionSeparator ?? '、') || props.label;
    },
    resultsMessage(count: number) {
      return count ? props.formatResultsCount?.(count) ?? `${count}件の候補`
        : props.emptyMessage ?? (props.items.length ? '該当する項目がありません' : '項目がありません');
    },
    get view() {
      const items = state.getItems();
      return {
        items,
        label: state.getLabel(),
        activeId: state.activeId(items),
        canFocus: items.some((item) => !item.disabled),
        message: state.resultsMessage(items.length),
      };
    },
    optionId(item: PickerOption) {
      return state.id ? `${state.id}-option-${item.sourceIndex}` : undefined;
    },
    activeId(items?: PickerOption[]) {
      const item = (items ?? state.getItems()).find((entry) => entry.value === state.activeValue && !entry.disabled);
      return item ? state.optionId(item) : undefined;
    },
    resetActive(text?: string) {
      const enabled = state.getItems(text).filter((item) => !item.disabled);
      state.activeValue = (enabled.find((item) => item.selected) || enabled[0])?.value ?? '';
    },
    show(last?: boolean) {
      if (props.disabled) return;
      state.query = '';
      state.resetActive('');
      if (last && !state.isSearchable()) state.activeValue = props.items.filter((item) => !item.disabled).at(-1)?.value ?? '';
      state.open = true;
      requestAnimationFrame(() => {
        if (!panelRef || panelRef.hidden) return;
        state.position();
        if (!state.isSearchable()) {
          if (props.items.some((item) => !item.disabled)) listRef?.focus();
          else triggerRef?.focus();
        }
        else searchRef?.focus();
      });
    },
    close(restoreFocus: boolean) {
      state.open = false;
      state.typeBuffer = '';
      resetMenu(panelRef, listRef);
      if (restoreFocus) triggerRef?.focus();
    },
    search(text: string) {
      state.query = text;
      state.resetActive(text);
      if (listRef) listRef.scrollTop = 0;
      hideMenuHighlight(listRef);
    },
    input(event: { type: string; target: EventTarget | null }) {
      /* React needs onChange for controlled inputs; filter the duplicate event. */
      if (event.type === 'input') state.search((event.target as HTMLInputElement).value);
    },
    select(index: number) {
      const item = state.getItems()[index];
      if (!item || item.disabled || props.disabled) return;
      const selected = state.getValues();
      state.growingValue = item.value;
      state.growTop = item.above;
      state.growBottom = item.below;
      const next = props.selectionMode === 'multiple'
        ? selected.includes(item.value) ? selected.filter((value) => value !== item.value) : [...selected, item.value]
        : [item.value];
      if (props.selectedValues === undefined) state.storedValues = next;
      props.onSelectionChange?.(next);
      state.activeValue = item.value;
      if (props.selectionMode !== 'multiple') state.close(true);
      else listRef?.focus();
    },
    position() {
      positionMenu(rootRef, triggerRef, panelRef, listRef);
    },
    revealActive() {
      const active = listRef?.querySelector<HTMLElement>('[data-active="true"]');
      active?.scrollIntoView({ block: 'nearest' });
      if (active) highlightMenuItem(listRef, active);
    },
    focusList() {
      if (!state.activeId()) state.resetActive();
      requestAnimationFrame(() => state.revealActive());
    },
    leave() {
      leaveMenu(listRef, document.activeElement === listRef
        ? listRef?.querySelector<HTMLElement>('[data-active="true"]') : null);
    },
    navigate(event: { key: string; keyCode?: number; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean; isComposing?: boolean; nativeEvent?: { isComposing?: boolean }; target: EventTarget | null; preventDefault(): void; stopPropagation(): void }) {
      if (event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        state.close(true);
        return;
      }
      const inSearch = event.target === searchRef;
      if (['ArrowDown', 'ArrowUp'].includes(event.key) || (!inSearch && ['Home', 'End'].includes(event.key))) {
        event.preventDefault();
        const enabled = state.getItems().filter((item) => !item.disabled);
        if (!enabled.length) return;
        const current = enabled.findIndex((item) => item.value === state.activeValue);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1
          : inSearch ? event.key === 'ArrowUp' ? enabled.length - 1 : Math.max(0, current)
          : event.key === 'ArrowDown' ? Math.min(current + 1, enabled.length - 1) : Math.max(0, current - 1);
        state.activeValue = enabled[next]?.value ?? '';
        listRef?.focus();
        requestAnimationFrame(() => state.revealActive());
      } else if (event.key === 'Enter' || (!inSearch && event.key === ' ')) {
        event.preventDefault();
        state.select(state.getItems().findIndex((item) => item.value === state.activeValue));
      } else if (!inSearch && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const typedText = (Date.now() - state.typeTime < MENU_TYPEAHEAD_TIMEOUT ? state.typeBuffer : '') + event.key;
        state.typeBuffer = typedText;
        state.typeTime = Date.now();
        const match = state.getItems().find((item) => !item.disabled && normalizeMenuText(item.label).startsWith(normalizeMenuText(typedText)));
        if (match) {
          state.activeValue = match.value;
          requestAnimationFrame(() => state.revealActive());
        }
      }
    },
  });

  onMount(() => {
    state.id = `koyori-picker-${Math.random().toString(36).slice(2)}`;
    state.resetActive();
    cleanupRef = listenToMenu(rootRef, () => state.close(false), state.position);
    if (state.open) state.show();
  });
  onUpdate(() => {
    if (!state.activeId()) state.resetActive();
    requestAnimationFrame(() => {
      state.position();
      if (document.activeElement === listRef) state.revealActive();
    });
  }, [state.open, state.query, props.items, props.disabled, props.selectedValues, state.storedValues, props.selectionMode, props.searchable]);
  onUpdate(() => {
    // Mitosis emits Vue watch(() => [deps]); a new formatter can rerun it even with the same message.
    // Keep the pending announcement timer when the values are unchanged.
    const key = JSON.stringify([state.open, state.query, props.disabled, state.resultsMessage(state.getItems().length)]);
    if (announcementKey === key) return;
    announcementKey = key;
    if (announcementTimer) clearTimeout(announcementTimer);
    if (!state.open || props.disabled) {
      state.announcement = '';
      return;
    }
    announcementTimer = setTimeout(() => {
      state.announcement = state.resultsMessage(state.getItems().length);
      announcementTimer = null;
    }, PICKER_ANNOUNCE_DELAY);
  }, [state.open, state.query, props.disabled, state.resultsMessage(state.getItems().length)]);
  onUnMount(() => {
    cleanupRef?.();
    if (announcementTimer) clearTimeout(announcementTimer);
  });

  return (
    <div ref={rootRef!} class={`${menu.root} ${state.context?.id ? styles.field : ''}`}>
      <button ref={triggerRef!} id={state.context?.id} class={`${controls.button} ${styles.trigger}`} data-variant={state.context?.id ? 'tertiary' : 'ghost'} type="button" disabled={props.disabled}
        aria-label={state.view.label === props.label ? props.label : `${props.label}: ${state.view.label}`}
        aria-labelledby={state.context?.labelId && state.id ? [state.context?.labelId, `${state.id}-value`, state.context?.requiredId].filter(Boolean).join(' ') : undefined}
        aria-describedby={state.context?.describedBy} aria-invalid={state.context?.invalid || undefined}
        aria-expanded={state.open && !props.disabled} aria-haspopup={!state.isSearchable() ? 'listbox' : undefined}
        aria-controls={state.id ? `${state.id}-${!state.isSearchable() ? 'list' : 'panel'}` : undefined}
        onClick={() => { if (state.open) state.close(false); else state.show(); }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            state.show(event.key === 'ArrowUp');
          } else if (event.key === 'Escape') {
            event.preventDefault();
            state.close(true);
          }
        }}
      >
        <span class={`${controls.surface} ${styles.triggerSurface}`}>
          <span class={styles.triggerLabel}>
            {/* Mitosis はスロットの既定値に式だけを置くと文字列にしてしまうため、要素で包む。 */}
            <Slot name="trigger"><span>{state.view.label}</span></Slot>
          </span>
          {/* Field 内の名前は id 参照で作る。トリガーを差し替えても選択中のラベルを名前に残す。 */}
          <span class={styles.status} id={state.id ? `${state.id}-value` : undefined}>{state.view.label}</span>
          <Show when={props.icon !== null}>
            <span class={controls.icon} aria-hidden="true"><Slot name="icon"><ChevronDownIcon /></Slot></span>
          </Show>
        </span>
      </button>
      <div ref={panelRef!} id={state.id ? `${state.id}-panel` : undefined} class={menu.panel}
        role="group" aria-label={props.label} hidden={!state.open || props.disabled}
        onKeyDown={(event) => state.navigate(event)}
      >
        <Show when={state.isSearchable()}>
          <input ref={searchRef!} class={styles.search} type="search" value={state.query}
            placeholder={props.searchPlaceholder ?? '検索…'} aria-label={props.searchLabel ?? `${props.label}を検索`}
            aria-controls={state.id ? `${state.id}-list` : undefined} autoComplete="off"
            onInput={(event) => state.input(event)} onChange={(event) => state.input(event)} />
        </Show>
        <div ref={listRef!} id={state.id ? `${state.id}-list` : undefined} class={`${menu.list} ${styles.list}`}
          role="listbox" aria-label={props.label} aria-multiselectable={props.selectionMode === 'multiple'}
          aria-labelledby={state.context?.labelId}
          aria-required={state.context?.required || undefined} aria-invalid={state.context?.invalid || undefined}
          aria-activedescendant={state.view.activeId} tabIndex={state.view.canFocus ? 0 : -1}
          data-avatars={props.avatars}
          onFocus={() => state.focusList()}
          onMouseEnter={(event) => enterMenu(listRef, event)}
          onMouseLeave={() => state.leave()}
        >
          <span class={menu.highlight} aria-hidden="true" />
          <For each={state.view.items}>
            {(item, index) => (
              <div key={item.value} id={state.optionId(item)} class={`${menu.item} ${styles.option}`} role="option"
                aria-selected={item.selected} aria-disabled={item.disabled || undefined}
                data-active={state.activeValue === item.value} data-selected={item.selected}
                data-above={item.above} data-below={item.below}
                data-grow-top={item.above || (state.growingValue === item.value && state.growTop)}
                data-grow-bottom={item.below || (state.growingValue === item.value && state.growBottom)}
                onMouseEnter={(event) => highlightMenuItem(listRef, event.currentTarget)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => state.select(index)}
              >
                <span class={menu.selection} aria-hidden="true" />
                <Show when={props.avatars}>
                  {/* 名前は label が伝えるため、アバターは装飾として読み上げから外す。 */}
                  <span class={styles.optionAvatar} aria-hidden="true">
                    <Avatar name={item.label} src={item.src} size={24} />
                  </span>
                </Show>
                <span class={menu.itemLabel}>{item.label}</span>
                <span class={menu.check} aria-hidden="true"><CheckIcon /></span>
              </div>
            )}
          </For>
        </div>
        <span class={menu.empty} hidden={state.view.items.length > 0}>{state.view.message}</span>
        <span class={styles.status} role="status" aria-atomic="true">
          {state.announcement}
        </span>
      </div>
    </div>
  );
}
