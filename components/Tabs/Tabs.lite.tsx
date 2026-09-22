import { For, onMount, onUnMount, onUpdate, setContext, useRef, useStore } from '@builder.io/mitosis';
import highlights from '../shared/highlight.module.css';
import TabsContext from './tabs.context.lite';
import { selectedTab, tabId, tabPanelId, listenToTabs, syncTabFocus } from './tabs';
import type { TabItem } from './tabs';
import styles from './tabs.module.css';

export interface TabsProps {
  /** Unique and stable across server and client rendering. */
  id: string;
  /** Accessible name of the tab list. */
  label: string;
  items: TabItem[];
  /** Controlled selection. Unknown or disabled values display the first enabled item. */
  value: string;
  onValueChange?: (value: string) => void;
  /** One TabPanel per item. Vue: default slot. */
  children?: any;
}

export default function Tabs(props: TabsProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  let cleanupRef = useRef<(() => void) | null>(null);
  const state = useStore({
    selected() {
      return selectedTab(props.items, props.value);
    },
    select(value: string) {
      if (value === state.selected() || !props.items.some(item => item.value === value && !item.disabled)) return;
      props.onValueChange?.(value);
    },
    navigate(event: { key: string; target: EventTarget | null; isComposing?: boolean; nativeEvent?: { isComposing?: boolean }; keyCode?: number; altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; preventDefault(): void }) {
      if (event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey) return;
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const tabs = Array.from(listRef?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)') ?? []);
      const current = tabs.indexOf(event.target as HTMLButtonElement);
      if (current < 0 || !tabs.length) return;
      event.preventDefault();
      const rtl = listRef && getComputedStyle(listRef).direction === 'rtl';
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
        : (current + ((event.key === 'ArrowRight') !== !!rtl ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next]?.focus();
    },
  });
  setContext(TabsContext, {
    get id() { return props.id; },
    get value() { return selectedTab(props.items, props.value); },
  });
  onMount(() => { cleanupRef = listenToTabs(listRef); });
  onUnMount(() => { cleanupRef?.(); });
  onUpdate(() => { syncTabFocus(rootRef); });

  return (
    <div ref={rootRef!} class={styles.root}>
        <div ref={listRef!} role="tablist" aria-label={props.label} aria-orientation="horizontal"
          class={styles.list} hidden={props.items.length === 0} data-hover-group="" onKeyDown={(event) => state.navigate(event)}>
          <span class={highlights.highlight} data-hover-highlight="" aria-hidden="true" />
          <span class={styles.indicator} data-tab-indicator="" aria-hidden="true" />
          <For each={props.items}>
            {(item) => <button key={item.value} type="button" role="tab" id={tabId(props.id, item.value)}
              class={styles.tab} data-hover-item="" disabled={item.disabled}
              aria-controls={tabPanelId(props.id, item.value)} aria-selected={state.selected() === item.value}
              tabIndex={state.selected() === item.value ? 0 : -1} onClick={() => state.select(item.value)}>
              <span class={styles.label}>{item.label}</span>
            </button>}
          </For>
        </div>
      {props.children}
    </div>
  );
}
