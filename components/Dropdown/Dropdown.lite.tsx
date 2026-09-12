import { enterHighlight, highlightItem, leaveHighlight } from '../shared/highlight';
import highlights from '../shared/highlight.module.css';
import { For, Show, Slot, useRef, useStore, onMount, onUnMount, onUpdate } from '@builder.io/mitosis';
import ChevronDownIcon from '../ChevronDownIcon/ChevronDownIcon.lite';
import { listenToMenu, normalizeMenuText, positionMenu, resetMenu } from '../shared/menu';
import styles from '../shared/menu.module.css';
import controls from '../shared/control.module.css';

export interface DropdownItem {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface DropdownProps {
  label: string;
  items: DropdownItem[];
  emptyMessage?: string;
  disabled?: boolean;
  defaultOpen?: boolean;
  /** React: rendered icon. Vue: use the icon slot. null hides the icon. */
  icon?: any;
  onSelect?: (value: string) => void;
}

export default function Dropdown(props: DropdownProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  let cleanupRef = useRef<(() => void) | null>(null);
  const state = useStore({
    id: '',
    open: props.defaultOpen || false,
    select(index: number) {
      const item = props.items[index];
      if (!item || item.disabled || props.disabled) return;
      state.close(true);
      props.onSelect?.(item.value);
    },
    show(last: boolean) {
      if (props.disabled) return;
      state.open = true;
      requestAnimationFrame(() => {
        if (!panelRef || panelRef.hidden) return;
        state.position();
        const items = listRef?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([hidden])');
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
        const items = Array.from(listRef?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([hidden])') || []);
        const current = items.indexOf(document.activeElement as HTMLElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
          : event.key === 'ArrowDown' ? (current + 1) % items.length
          : (current <= 0 ? items.length : current) - 1;
        items[next]?.focus();
      } else if (event.target !== triggerRef && event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const items = Array.from(listRef?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([hidden])') || []);
        const current = items.indexOf(document.activeElement as HTMLElement);
        const ordered = [...items.slice(current + 1), ...items.slice(0, current + 1)];
        ordered.find((item) => normalizeMenuText(item.textContent || '').startsWith(normalizeMenuText(event.key)))?.focus();
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
  onUnMount(() => cleanupRef?.());

  return (
    <div ref={rootRef!} class={styles.root}>
      <button ref={triggerRef!} type="button" class={controls.button} data-variant="ghost"
        disabled={props.disabled} aria-expanded={state.open && !props.disabled}
        aria-haspopup="menu" aria-controls={state.id || undefined}
        onClick={() => { if (state.open) state.close(false); else state.show(false); }}
        onKeyDown={(event) => state.navigate(event)}
      >
        <span class={controls.surface}>
          {props.label}
          <Show when={props.icon !== null}>
            <span class={controls.icon} aria-hidden="true"><Slot name="icon"><ChevronDownIcon /></Slot></span>
          </Show>
        </span>
      </button>
      <div ref={panelRef!} id={state.id || undefined} class={styles.panel} role="menu" aria-label={props.label}
        hidden={!state.open || props.disabled} onKeyDown={(event) => state.navigate(event)}
      >
        <div ref={listRef!} class={styles.list} role="presentation"
          onMouseEnter={(event) => enterHighlight(listRef, event)} onMouseLeave={() => leaveHighlight(listRef)}
        >
          <span class={highlights.highlight} data-hover-highlight="" aria-hidden="true" />
          <For each={props.items}>
            {(item, index) => (
              <button key={item.value} type="button" class={styles.item} role="menuitem" tabIndex={-1}
                aria-disabled={item.disabled || undefined}
                onMouseEnter={(event) => highlightItem(listRef, event.currentTarget)}
                onFocus={(event) => highlightItem(listRef, event.currentTarget)}
                onClick={() => state.select(index)}
              >
                <span class={styles.itemLabel}>{item.label}</span>
              </button>
            )}
          </For>
          <span class={styles.empty} role="menuitem" tabIndex={-1} aria-disabled="true" hidden={props.items.length > 0}>{props.emptyMessage ?? '項目がありません'}</span>
        </div>
      </div>
    </div>
  );
}
