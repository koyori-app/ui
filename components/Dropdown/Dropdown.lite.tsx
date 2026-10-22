import { enterHighlight, highlightItem, leaveHighlight } from '../shared/highlight';
import highlights from '../shared/highlight.module.css';
import { For, Fragment, Show, Slot, useRef, useStore, onMount, onUnMount, onUpdate } from '@builder.io/mitosis';
import CheckIcon from '../CheckIcon/CheckIcon.lite';
import ChevronDownIcon from '../ChevronDownIcon/ChevronDownIcon.lite';
import { listenToMenu, nextMenuIndex, positionMenu, resetMenu, typeaheadTarget } from '../shared/menu';
import styles from '../shared/menu.module.css';
import controls from '../shared/control.module.css';

export interface DropdownItem {
  value: string;
  label: string;
  disabled?: boolean;
  /** Irreversible actions such as delete. Colored like ContextMenu, but the label must say what happens. */
  destructive?: boolean;
  /** Defaults to 'item'. A checkbox stays open and calls onSelect; a radio closes like an item. */
  kind?: 'item' | 'checkbox' | 'radio';
  /** State of a checkbox or radio. The app owns it and updates items from onSelect. */
  checked?: boolean;
}

export interface DropdownSection {
  /** Optional heading. Separators are drawn between sections. */
  heading?: string;
  items: DropdownItem[];
}

interface DropdownOptions {
  /** Look of the trigger, shared with Button. Defaults to ghost. */
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
  /** A flat list or a list of sections. Do not mix them. */
  items: DropdownItem[] | DropdownSection[];
  emptyMessage?: string;
  disabled?: boolean;
  defaultOpen?: boolean;
  /** React: rendered icon. Vue: use the icon slot. null hides the icon. */
  icon?: any;
  /** Replaces the label in the trigger, e.g. an avatar and a name. React: rendered node. Vue: use the trigger slot. */
  trigger?: any;
  onSelect?: (value: string) => void;
  /** Called when the menu opens or closes, e.g. to load items on open. */
  onOpenChange?: (open: boolean) => void;
}

/** A visible label or an accessible name is required. Without label, the trigger shows only the icon. */
export type DropdownProps = DropdownOptions & (
  { label: string; ariaLabel?: string } | { label?: never; ariaLabel: string }
);

export default function Dropdown(props: DropdownProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  let cleanupRef = useRef<(() => void) | null>(null);
  let openedRef = useRef<boolean | null>(null);
  const state = useStore({
    id: '',
    open: props.defaultOpen || false,
    get grouped() {
      const first = props.items[0];
      return !!first && 'items' in first;
    },
    /* grouped を参照すると Vue の生成物で .value が落ちるため、判定をここにも書く。 */
    get sections() {
      const first = props.items[0];
      return first && 'items' in first ? props.items as DropdownSection[] : [{ items: props.items as DropdownItem[] }];
    },
    select(item: DropdownItem, target: EventTarget | null) {
      if (item.disabled || props.disabled) return;
      /* チェック項目は開いたまま押した項目にフォーカスを残す。項目の mousedown は止めているため明示して移す。 */
      if (item.kind === 'checkbox') (target as HTMLElement).focus();
      else state.close(true);
      props.onSelect?.(item.value);
    },
    show(last: boolean) {
      if (props.disabled) return;
      state.open = true;
      requestAnimationFrame(() => {
        if (!panelRef || panelRef.hidden) return;
        state.position();
        const items = listRef?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([hidden])');
        items?.[last ? items.length - 1 : 0]?.focus();
      });
    },
    close(restoreFocus: boolean) {
      state.open = false;
      resetMenu(panelRef, listRef);
      if (restoreFocus) triggerRef?.focus();
    },
    position() {
      positionMenu(rootRef, triggerRef, panelRef, listRef);
    },
    navigate(event: { key: string; target: EventTarget | null; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean; preventDefault(): void; stopPropagation(): void }) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        state.close(true);
      } else if (event.key === 'Tab' && state.open) {
        /* Let the native Tab action continue from the trigger to the next control. */
        state.close(true);
      } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        if (event.target === triggerRef) {
          state.show(event.key === 'ArrowUp' || event.key === 'End');
          return;
        }
        const items = Array.from(listRef?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([hidden])') || []);
        const current = items.indexOf(document.activeElement as HTMLElement);
        items[nextMenuIndex(event.key, current, items.length)]?.focus();
      } else if (event.target !== triggerRef && event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const items = Array.from(listRef?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([hidden])') || []);
        const current = items.indexOf(document.activeElement as HTMLElement);
        const target = typeaheadTarget(items.map((item) => item.textContent || ''), current, event.key);
        items[target]?.focus();
      }
    },
  });

  onMount(() => {
    state.id = `koyori-menu-${Math.random().toString(36).slice(2)}`;
    cleanupRef = listenToMenu(rootRef, () => state.close(false), state.position);
    if (state.open) state.show(false);
  });
  onUpdate(() => {
    requestAnimationFrame(() => state.position());
  }, [state.open, props.items, props.disabled, props.label]);
  /* 通知は open の変化から出す。外側クリックの close は閉じていても呼ばれ、React では mount 時の props を掴んでいるため。 */
  onUpdate(() => {
    /* Vue の生成物は useRef の初期値を null にするため、null を閉じた状態として扱う。 */
    if (!!openedRef === state.open) return;
    openedRef = state.open;
    props.onOpenChange?.(state.open);
  }, [state.open]);
  onUnMount(() => cleanupRef?.());

  return (
    <div ref={rootRef!} class={styles.root}>
      <button ref={triggerRef!} type="button" class={controls.button} data-variant={props.variant || 'ghost'}
        data-icon-only={!props.label} aria-label={props.ariaLabel || props.label}
        disabled={props.disabled} aria-expanded={state.open && !props.disabled}
        aria-haspopup="menu" aria-controls={state.id || undefined}
        onClick={() => { if (state.open) state.close(false); else state.show(false); }}
        onKeyDown={(event) => state.navigate(event)}
      >
        <span class={controls.surface}>
          {/* 文字だけを既定の中身にすると React の生成物で文字列になるため、要素で包む。アイコンだけのときは隠して gap を作らない。 */}
          <Slot name="trigger"><span hidden={!props.label}>{props.label}</span></Slot>
          <Show when={props.icon !== null}>
            <span class={controls.icon} aria-hidden="true"><Slot name="icon"><ChevronDownIcon /></Slot></span>
          </Show>
        </span>
      </button>
      <div ref={panelRef!} id={state.id || undefined} class={styles.panel} role="menu" aria-label={props.ariaLabel || props.label}
        hidden={!state.open || props.disabled} onKeyDown={(event) => state.navigate(event)}
      >
        <div ref={listRef!} class={styles.list} role="presentation"
          onMouseEnter={(event) => enterHighlight(listRef, event)} onMouseLeave={() => leaveHighlight(listRef)}
        >
          <span class={highlights.highlight} data-hover-highlight="" aria-hidden="true" />
          <For each={state.sections}>
            {(section, sectionIndex) => (
              <Fragment key={sectionIndex}>
                <Show when={sectionIndex > 0}>
                  <div class={styles.separator} role="separator" />
                </Show>
                <div class={styles.group} role={state.grouped ? 'group' : 'presentation'}
                  aria-labelledby={section.heading && state.id ? `${state.id}-${sectionIndex}` : undefined}
                >
                  <Show when={section.heading}>
                    <div id={state.id ? `${state.id}-${sectionIndex}` : undefined} class={styles.heading} role="presentation">{section.heading}</div>
                  </Show>
                  <For each={section.items}>
                    {(item) => (
                      <button key={item.value} type="button" class={styles.item} tabIndex={-1}
                        role={item.kind === 'checkbox' ? 'menuitemcheckbox' : item.kind === 'radio' ? 'menuitemradio' : 'menuitem'}
                        aria-checked={item.kind === 'checkbox' || item.kind === 'radio' ? (item.checked ? 'true' : 'false') : undefined}
                        aria-disabled={item.disabled || undefined}
                        data-destructive={item.destructive ? 'true' : undefined}
                        onMouseEnter={(event) => highlightItem(listRef, event.currentTarget)}
                        onFocus={(event) => highlightItem(listRef, event.currentTarget)}
                        /* Safari などはボタンを押すとフォーカスが外れ、focusout でメニューが閉じるため止める。 */
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={(event) => state.select(item, event.currentTarget)}
                      >
                        <Show when={item.kind === 'checkbox'}>
                          <span class={styles.check} aria-hidden="true"><CheckIcon /></span>
                        </Show>
                        <Show when={item.kind === 'radio'}>
                          <span class={styles.check} aria-hidden="true"><span class={styles.dot} /></span>
                        </Show>
                        <span class={styles.itemLabel}>{item.label}</span>
                      </button>
                    )}
                  </For>
                </div>
              </Fragment>
            )}
          </For>
          <span class={styles.empty} role="menuitem" tabIndex={-1} aria-disabled="true" hidden={state.sections.some((section) => section.items.length > 0)}>{props.emptyMessage ?? '項目がありません'}</span>
        </div>
      </div>
    </div>
  );
}
