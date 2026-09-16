import { For, Show, useRef, useStore, onMount, onUnMount, onUpdate } from '@builder.io/mitosis';
import ChevronDownIcon from '../ChevronDownIcon/ChevronDownIcon.lite';
import { enterHighlight, highlightItem, leaveHighlight } from '../shared/highlight';
import highlights from '../shared/highlight.module.css';
import { listenToMenu, nextMenuIndex, positionMenu, resetMenu, typeaheadTarget } from '../shared/menu';
import menu from '../shared/menu.module.css';
import { placeContextMenu, positionSubmenu, SUBMENU_DELAY, submenuKeyAction } from './context-menu';
import styles from './context-menu.module.css';

export interface ContextMenuChild {
  value: string;
  label: string;
  disabled?: boolean;
  /** Destructive actions such as delete. Colored, but the label must say what happens. */
  destructive?: boolean;
}

export interface ContextMenuItem extends ContextMenuChild {
  /** One level of submenu. An item with items opens it instead of running, and its value is not selected. */
  items?: ContextMenuChild[];
}

export interface ContextMenuProps {
  /** Controlled by the app. Set it to false from onClose. */
  open: boolean;
  /** Viewport coordinates, e.g. from contextMenuPosition(event). */
  x: number;
  y: number;
  /** Accessible name of the menu. */
  label: string;
  /** id of the menu. Pass the same value to ariaControls of a menu button so it can toggle the menu. */
  id?: string;
  items: ContextMenuItem[];
  /** Shown as a disabled item when a menu is empty, so it can still take focus. */
  emptyMessage?: string;
  /** Called first when an item runs, with the value of the item. Values must be unique across submenus. */
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
  let timerRef = useRef<number | null>(null);
  let focusSubmenuRef = useRef<boolean | null>(null);
  let freshSubmenuRef = useRef<boolean | null>(null);
  const state = useStore({
    openIndex: -1,
    /* 開いているサブメニューは DOM から探す。React ではタイマーやリスナーが古い state を掴むため。 */
    openSubmenuPanel() {
      return rootRef?.querySelector<HTMLElement>('[data-submenu]:not([hidden])') || null;
    },
    /* 実行してから閉じる。onClose で対象を片付けても onSelect には残っているようにする。
       フォーカスは先に戻し、onSelect がダイアログなどへ移せるようにする。 */
    run(value: string) {
      state.teardown();
      returnRef?.focus({ preventScroll: true });
      props.onSelect?.(value);
      props.onClose?.();
    },
    select(index: number) {
      const item = props.items[index];
      if (!item || item.disabled) return;
      if (item.items) state.openSubmenu(index, true);
      else state.run(item.value);
    },
    selectChild(index: number, childIndex: number) {
      const child = props.items[index]?.items?.[childIndex];
      if (!child || child.disabled) return;
      state.run(child.value);
    },
    /* 閉じ始めたら外部イベントを先に外す。フォーカスを戻すと focusout が、
       popover を閉じると toggle が起き、閉じる処理へもう一度入ってしまうため。 */
    detach() {
      cleanupRef?.();
      cleanupRef = null;
      clearTimeout(timerRef ?? undefined);
    },
    teardown() {
      state.detach();
      const submenu = state.openSubmenuPanel();
      resetMenu(submenu, submenu?.querySelector<HTMLElement>('[role="presentation"]') || null);
      state.openIndex = -1;
      resetMenu(panelRef, listRef);
    },
    /* 開いた時点のフォーカス位置を覚えておき、Escape や実行のあとに戻す。
       開閉に伴うフォーカス移動は preventScroll にする。iOS はフォーカスのたびにページをスクロールし、
       ボタン → メニューと続けて移すと背景が揺れるため。矢印キーの移動はリスト内のスクロールが要るので通常どおり。 */
    show() {
      returnRef = document.activeElement as HTMLElement | null;
      requestAnimationFrame(() => {
        if (!panelRef || panelRef.hidden) return;
        state.position();
        /* APG に合わせて無効な項目にもフォーカスを置く。フォーカスがメニューに入らないと Escape で閉じられない。 */
        /* preventScroll はリスト内のスクロールも止めるため、先頭へ戻してから先頭項目にフォーカスする。 */
        if (listRef) listRef.scrollTop = 0;
        listRef?.querySelector<HTMLElement>('[role="menuitem"]:not([hidden])')?.focus({ preventScroll: true });
      });
    },
    close(restoreFocus: boolean) {
      state.teardown();
      if (restoreFocus) returnRef?.focus({ preventScroll: true });
      props.onClose?.();
    },
    /* 外側クリックなどは開いている間だけ受ける。開くたびに登録し直し、その時点の props を使う。 */
    sync() {
      if (!rootRef) return;
      if (props.open) {
        state.detach();
        cleanupRef = listenToMenu(rootRef, () => state.close(false), state.position, panelRef);
        state.show();
      } else {
        /* アプリ側で閉じたとき（メニューボタンをもう一度押したなど）も、中のフォーカスを開く前の要素へ戻す。 */
        const focused = !!rootRef.contains(document.activeElement);
        state.teardown();
        if (focused) returnRef?.focus({ preventScroll: true });
      }
    },
    position() {
      placeContextMenu(rootRef, props.x, props.y);
      /* 大きさのない root が起点。trigger も同じ点として渡す。 */
      positionMenu(rootRef, rootRef, panelRef, listRef);
      state.repositionSubmenu();
    },
    repositionSubmenu() {
      state.placeSubmenu(state.openSubmenuPanel());
    },
    placeSubmenu(submenu: HTMLElement | null) {
      const item = submenu ? listRef?.querySelector<HTMLElement>(`[data-index="${submenu.getAttribute('data-submenu')}"]`) || null : null;
      positionSubmenu(rootRef, panelRef, item, submenu);
    },
    /* 描画が終わってから置く。開いた直後はまだ hidden が外れていないことがあるため、
       openIndex の変化（onUpdate）からも呼ぶ。index は古い state を避けるため引数で受ける。 */
    settleSubmenu(index: number) {
      requestAnimationFrame(() => {
        const submenu = rootRef?.querySelector<HTMLElement>(`[data-submenu="${index}"]`);
        if (!submenu || submenu.hidden) return;
        state.placeSubmenu(submenu);
        if (freshSubmenuRef) {
          freshSubmenuRef = false;
          const list = submenu.querySelector<HTMLElement>('[role="presentation"]');
          if (list) list.scrollTop = 0;
        }
        if (focusSubmenuRef) {
          focusSubmenuRef = false;
          submenu.querySelector<HTMLElement>('[role="menuitem"]:not([hidden])')?.focus({ preventScroll: true });
        }
      });
    },
    openSubmenu(index: number, focus: boolean) {
      clearTimeout(timerRef ?? undefined);
      const item = props.items[index];
      if (!item?.items || item.disabled) return;
      const current = state.openSubmenuPanel();
      if (current?.getAttribute('data-submenu') !== String(index)) freshSubmenuRef = true;
      if (current && current.getAttribute('data-submenu') !== String(index)) state.closeSubmenu(false);
      focusSubmenuRef = focus;
      state.openIndex = index;
      state.settleSubmenu(index);
    },
    /* 中にフォーカスがあれば、隠す前に親の項目へ移す。body へ落ちると focusout で全体が閉じるため。 */
    closeSubmenu(focusParent: boolean) {
      clearTimeout(timerRef ?? undefined);
      const submenu = state.openSubmenuPanel();
      if (submenu) {
        const parent = listRef?.querySelector<HTMLElement>(`[data-index="${submenu.getAttribute('data-submenu')}"]`);
        if (focusParent || submenu.contains(document.activeElement)) parent?.focus({ preventScroll: true });
        resetMenu(submenu, submenu.querySelector<HTMLElement>('[role="presentation"]'));
      }
      state.openIndex = -1;
    },
    /* ホバーでは少し待ってから開閉する。フォーカスは動かさない。 */
    hover(index: number) {
      clearTimeout(timerRef ?? undefined);
      const item = props.items[index];
      const current = state.openSubmenuPanel();
      if (current?.getAttribute('data-submenu') === String(index)) return;
      timerRef = window.setTimeout(() => {
        if (item?.items && !item.disabled) state.openSubmenu(index, false);
        else state.closeSubmenu(false);
      }, SUBMENU_DELAY);
    },
    /* For に `a || []` を直接書くと、React の生成物で `a || []?.map` になり優先順位が崩れる。 */
    childrenOf(item: ContextMenuItem) {
      return item.items || [];
    },
    /* サブメニューのリストは ref を持たないため、イベントの要素から辿る。 */
    enterSubmenuList(event: { currentTarget: EventTarget | null; clientX: number; clientY: number }) {
      enterHighlight(event.currentTarget as HTMLElement, event);
    },
    leaveSubmenuList(event: { currentTarget: EventTarget | null }) {
      leaveHighlight(event.currentTarget as HTMLElement);
    },
    highlightChild(event: { currentTarget: EventTarget | null }) {
      const element = event.currentTarget as HTMLElement;
      highlightItem(element.parentElement, element);
    },
    keepSubmenu() {
      clearTimeout(timerRef ?? undefined);
    },
    navigate(event: { key: string; target: EventTarget | null; currentTarget: EventTarget | null; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean; preventDefault(): void; stopPropagation(): void }, level: number) {
      const target = event.target as HTMLElement;
      const action = submenuKeyAction(event.key, {
        inSubmenu: level >= 0,
        isParent: level < 0 && target.getAttribute('aria-haspopup') === 'menu',
        disabled: target.getAttribute('aria-disabled') === 'true',
      });
      if (action === 'open') {
        event.preventDefault();
        state.openSubmenu(Number(target.getAttribute('data-index')), true);
        return;
      }
      if (action === 'closeSubmenu') {
        event.preventDefault();
        event.stopPropagation();
        state.closeSubmenu(true);
        return;
      }
      if (action === 'closeAll') {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
        }
        /* Tab は開く前の位置から、ネイティブの移動を続けさせる。 */
        state.close(true);
        return;
      }
      const panel = event.currentTarget as HTMLElement;
      const items = Array.from(panel.querySelectorAll<HTMLElement>('[role="menuitem"]:not([hidden])'));
      const current = items.indexOf(document.activeElement as HTMLElement);
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        items[nextMenuIndex(event.key, current, items.length)]?.focus();
      } else if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        items[typeaheadTarget(items.map((item) => item.textContent || ''), current, event.key)]?.focus();
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

  /* 開いたまま別の行のボタンなどから開き直された（座標が変わり、フォーカスが外にある）ときは、
     新しく開いたものとして先頭項目へ移し、戻り先もその要素に更新する。 */
  onUpdate(() => {
    if (!props.open || !rootRef || rootRef.contains(document.activeElement)) return;
    state.closeSubmenu(false);
    state.show();
  }, [props.x, props.y]);

  onUpdate(() => {
    if (state.openIndex >= 0) state.settleSubmenu(state.openIndex);
  }, [state.openIndex]);

  onUnMount(() => state.detach());

  return (
    /* 座標は描画後に placeContextMenu で置く。style で渡すと祖先の transform でずれる。 */
    <div ref={rootRef!} class={styles.root} data-menu-top-layer="">
      <div ref={panelRef!} id={props.id} class={menu.panel} role="menu" aria-label={props.label}
        hidden={!props.open} onKeyDown={(event) => state.navigate(event, -1)}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div ref={listRef!} class={menu.list} role="presentation"
          onMouseEnter={(event) => enterHighlight(listRef, event)} onMouseLeave={() => leaveHighlight(listRef)}
        >
          <span class={highlights.highlight} data-hover-highlight="" aria-hidden="true" />
          <For each={props.items}>
            {(item, index) => (
              <button key={item.value} type="button" class={menu.item} role="menuitem" tabIndex={-1}
                data-index={index}
                aria-disabled={item.disabled || undefined}
                aria-haspopup={item.items ? 'menu' : undefined}
                aria-expanded={item.items ? state.openIndex === index : undefined}
                data-destructive={item.destructive && !item.items ? 'true' : undefined}
                onMouseEnter={(event) => { highlightItem(listRef, event.currentTarget); state.hover(index); }}
                onFocus={(event) => highlightItem(listRef, event.currentTarget)}
                onClick={() => state.select(index)}
              >
                <span class={menu.itemLabel}>{item.label}</span>
                <Show when={item.items}>
                  <span class={styles.chevron} aria-hidden="true"><ChevronDownIcon size={14} /></span>
                </Show>
              </button>
            )}
          </For>
          <span class={menu.empty} role="menuitem" tabIndex={-1} aria-disabled="true" hidden={props.items.length > 0}>{props.emptyMessage ?? '項目がありません'}</span>
        </div>
      </div>
      {/* サブメニューは項目の中に入れず、ルートの兄弟として置く。リストのスクロールに切られないようにするため。 */}
      <For each={props.items}>
        {(item, index) => (
          <div key={item.value} class={menu.panel} role="menu" aria-label={item.label}
            data-submenu={index} hidden={state.openIndex !== index}
            onKeyDown={(event) => state.navigate(event, index)}
            onMouseEnter={() => state.keepSubmenu()}
            onContextMenu={(event) => event.preventDefault()}
          >
            <div class={menu.list} role="presentation"
              onMouseEnter={(event) => state.enterSubmenuList(event)}
              onMouseLeave={(event) => state.leaveSubmenuList(event)}
            >
              <span class={highlights.highlight} data-hover-highlight="" aria-hidden="true" />
              <For each={state.childrenOf(item)}>
                {(child, childIndex) => (
                  <button key={child.value} type="button" class={menu.item} role="menuitem" tabIndex={-1}
                    aria-disabled={child.disabled || undefined}
                    data-destructive={child.destructive ? 'true' : undefined}
                    onMouseEnter={(event) => state.highlightChild(event)}
                    onFocus={(event) => state.highlightChild(event)}
                    onClick={() => state.selectChild(index, childIndex)}
                  >
                    <span class={menu.itemLabel}>{child.label}</span>
                  </button>
                )}
              </For>
              <span class={menu.empty} role="menuitem" tabIndex={-1} aria-disabled="true" hidden={(item.items || []).length > 0}>{props.emptyMessage ?? '項目がありません'}</span>
            </div>
          </div>
        )}
      </For>
    </div>
  );
}
