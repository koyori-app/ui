import { For, useRef, useStore, onMount, onUnMount, onUpdate } from '@builder.io/mitosis';
import { enterHighlight, highlightItem, leaveHighlight } from '../shared/highlight';
import highlights from '../shared/highlight.module.css';
import { listenToMenu, nextMenuIndex, positionMenu, resetMenu, typeaheadTarget } from '../shared/menu';
import menu from '../shared/menu.module.css';
import { placeContextMenu } from './context-menu';
import styles from './context-menu.module.css';

export interface ContextMenuItem {
  value: string;
  label: string;
  disabled?: boolean;
  /** Destructive actions such as delete. Colored, but the label must say what happens. */
  destructive?: boolean;
}

export interface ContextMenuProps {
  /** Controlled by the app. Set it to false from onClose. */
  open: boolean;
  /** Viewport coordinates, e.g. from contextMenuPosition(event). */
  x: number;
  y: number;
  /** Accessible name of the menu. */
  label: string;
  items: ContextMenuItem[];
  /** Shown as a disabled item when items is empty, so the menu can still take focus. */
  emptyMessage?: string;
  /** Called first when an item runs. Focus has already returned, so it may move focus elsewhere. */
  onSelect?: (value: string) => void;
  /** Called on Escape, Tab, an outside click, and after onSelect. */
  onClose?: (event?: unknown) => void;
}

export default function ContextMenu(props: ContextMenuProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  let cleanupRef = useRef<(() => void) | null>(null);
  let returnRef = useRef<HTMLElement | null>(null);
  const state = useStore({
    /* 実行してから閉じる。onClose で対象を片付けても onSelect には残っているようにする。
       フォーカスは先に戻し、onSelect がダイアログなどへ移せるようにする。 */
    select(index: number) {
      const item = props.items[index];
      if (!item || item.disabled) return;
      resetMenu(panelRef, listRef);
      returnRef?.focus();
      props.onSelect?.(item.value);
      props.onClose?.();
    },
    /* 開いた時点のフォーカス位置を覚えておき、Escape や実行のあとに戻す。 */
    show() {
      returnRef = document.activeElement as HTMLElement | null;
      requestAnimationFrame(() => {
        if (!panelRef || panelRef.hidden) return;
        state.position();
        /* APG に合わせて無効な項目にもフォーカスを置く。フォーカスがメニューに入らないと Escape で閉じられない。 */
        listRef?.querySelector<HTMLElement>('[role="menuitem"]:not([hidden])')?.focus();
      });
    },
    close(restoreFocus: boolean) {
      resetMenu(panelRef, listRef);
      if (restoreFocus) returnRef?.focus();
      props.onClose?.();
    },
    /* 外側クリックなどは開いている間だけ受ける。開くたびに登録し直し、その時点の props を使う。 */
    sync() {
      if (!rootRef) return;
      cleanupRef?.();
      cleanupRef = null;
      if (props.open) {
        cleanupRef = listenToMenu(rootRef, () => state.close(false), state.position);
        state.show();
      } else {
        resetMenu(panelRef, listRef);
      }
    },
    position() {
      placeContextMenu(rootRef, props.x, props.y);
      /* 大きさのない root が起点。trigger も同じ点として渡す。 */
      positionMenu(rootRef, rootRef, panelRef, listRef);
    },
    navigate(event: { key: string; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean; preventDefault(): void; stopPropagation(): void }) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        state.close(true);
      } else if (event.key === 'Tab') {
        /* 開く前の位置から、ネイティブの Tab 移動を続けさせる。 */
        state.close(true);
      } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const items = Array.from(listRef?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([hidden])') || []);
        const current = items.indexOf(document.activeElement as HTMLElement);
        items[nextMenuIndex(event.key, current, items.length)]?.focus();
      } else if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const items = Array.from(listRef?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([hidden])') || []);
        const current = items.indexOf(document.activeElement as HTMLElement);
        const target = typeaheadTarget(items.map((item) => item.textContent || ''), current, event.key);
        items[target]?.focus();
      }
    },
  });

  onMount(() => {
    state.sync();
  });

  onUpdate(() => {
    state.sync();
  }, [props.open]);

  onUpdate(() => {
    requestAnimationFrame(() => state.position());
  }, [props.x, props.y, props.items]);

  onUnMount(() => cleanupRef?.());

  return (
    /* 座標は描画後に placeContextMenu で置く。style で渡すと祖先の transform でずれる。 */
    <div ref={rootRef!} class={styles.root} data-menu-top-layer="">
      <div ref={panelRef!} class={menu.panel} role="menu" aria-label={props.label}
        hidden={!props.open} onKeyDown={(event) => state.navigate(event)}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div ref={listRef!} class={menu.list} role="presentation"
          onMouseEnter={(event) => enterHighlight(listRef, event)} onMouseLeave={() => leaveHighlight(listRef)}
        >
          <span class={highlights.highlight} data-hover-highlight="" aria-hidden="true" />
          <For each={props.items}>
            {(item, index) => (
              <button key={item.value} type="button" class={menu.item} role="menuitem" tabIndex={-1}
                aria-disabled={item.disabled || undefined}
                data-destructive={item.destructive ? 'true' : undefined}
                onMouseEnter={(event) => highlightItem(listRef, event.currentTarget)}
                onFocus={(event) => highlightItem(listRef, event.currentTarget)}
                onClick={() => state.select(index)}
              >
                <span class={menu.itemLabel}>{item.label}</span>
              </button>
            )}
          </For>
          <span class={menu.empty} role="menuitem" tabIndex={-1} aria-disabled="true" hidden={props.items.length > 0}>{props.emptyMessage ?? '項目がありません'}</span>
        </div>
      </div>
    </div>
  );
}
