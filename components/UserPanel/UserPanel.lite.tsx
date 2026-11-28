import { enterHighlight, highlightItem, leaveHighlight } from '../shared/highlight';
import highlights from '../shared/highlight.module.css';
import { For, Fragment, Show, Slot, onMount, onUnMount, onUpdate, useRef, useStore } from '@builder.io/mitosis';
import Avatar from '../Avatar/Avatar.lite';
import { listenToMenu, resetMenu } from '../shared/menu';
import menu from '../shared/menu.module.css';
import { firstUserPanelItem, placeUserPanelCard, userPanelHasIcons, userPanelSections } from './user-panel';
import type { UserPanelItem, UserPanelSection } from './user-panel';
import styles from './user-panel.module.css';

export interface UserPanelProps {
  name: string;
  /** 名前の下の 1 行。メールアドレスや状態など。 */
  description?: string;
  /** アバターの画像。無ければ名前の頭文字。 */
  src?: string;
  /** プロフィールカード（dialog）の読み上げ名。例: 「hanako のプロフィール」。 */
  cardLabel: string;
  /** カードのメニュー。平らな一覧か節の一覧。混ぜない。 */
  items: UserPanelItem[] | UserPanelSection[];
  onSelect?: (value: string) => void;
  /** 狭い幅向け。アバターのボタンだけを出し、読み上げ名を name にする。action は出さない。 */
  compact?: boolean;
  /** マウント直後に開いておく（撮影用）。フォーカスは動かさない。 */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** パネルの右端の操作（設定のボタンなど）。React: 描画済みのノード。Vue: action スロット。 */
  action?: any;
}

export default function UserPanel(props: UserPanelProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  let cleanupRef = useRef<(() => void) | null>(null);
  let openedRef = useRef<boolean | null>(null);
  const state = useStore({
    id: '',
    open: props.defaultOpen || false,
    get sections() {
      return userPanelSections(props.items);
    },
    get hasIcons() {
      return userPanelHasIcons(props.items);
    },
    show(focus: boolean) {
      state.open = true;
      requestAnimationFrame(() => {
        if (!cardRef || cardRef.hidden) return;
        state.position();
        if (focus) firstUserPanelItem(cardRef)?.focus();
      });
    },
    /* 開いているかを見て早く戻らない。React では listenToMenu に渡した close が mount 時の state を掴んでいるため。 */
    close(restoreFocus: boolean) {
      state.open = false;
      resetMenu(cardRef, boxRef);
      if (restoreFocus) triggerRef?.focus();
    },
    position() {
      placeUserPanelCard(rootRef, cardRef);
    },
    toggle() {
      if (state.open) state.close(false);
      else state.show(true);
    },
    select(item: UserPanelItem, event: { preventDefault(): void }) {
      if (item.disabled) {
        event.preventDefault();
        return;
      }
      props.onSelect?.(item.value);
      state.close(true);
    },
    keydown(event: { key: string; isComposing?: boolean; preventDefault(): void; stopPropagation(): void }) {
      if (event.key !== 'Escape' || event.isComposing || !state.open) return;
      // カードだけを閉じる。外の Dialog や Drawer には伝えない。
      event.preventDefault();
      event.stopPropagation();
      state.close(true);
    },
  });

  onMount(() => {
    state.id = `koyori-user-panel-${Math.random().toString(36).slice(2)}`;
    cleanupRef = listenToMenu(rootRef, () => state.close(false), () => state.position(), cardRef);
    if (state.open) state.show(false);
  });
  onUpdate(() => {
    /* Vue では依存付き onUpdate が setup 中にも走るが、SSR には requestAnimationFrame が無い。 */
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => state.position());
  }, [state.open, props.items, props.name, props.description]);
  /* 通知は open の変化から出す。React では mount 時の props を掴んだ close が呼ばれるため。 */
  onUpdate(() => {
    /* Vue の生成物は useRef の初期値を null にするため、null を閉じた状態として扱う。 */
    if (!!openedRef === state.open) return;
    openedRef = state.open;
    props.onOpenChange?.(state.open);
  }, [state.open]);
  onUnMount(() => cleanupRef?.());

  return (
    <div ref={rootRef!} class={styles.root} data-compact={props.compact ? 'true' : undefined} onKeyDown={(event) => state.keydown(event)}>
      <button ref={triggerRef!} type="button" class={styles.trigger} aria-haspopup="dialog" aria-expanded={state.open}
        aria-controls={state.id || undefined} aria-label={props.compact ? props.name : undefined}
        onClick={() => state.toggle()}
      >
        <span class={styles.avatar} aria-hidden="true"><Avatar name={props.name} src={props.src} size={32} /></span>
        <Show when={!props.compact}>
          <span class={styles.text}>
            <span class={styles.name}>{props.name}</span>
            <Show when={props.description}>
              <span class={styles.description}>{props.description}</span>
            </Show>
          </span>
        </Show>
      </button>
      <Show when={!props.compact}>
        {/* action は root の中なので、外側の押下として閉じない。押したらカードを閉じる。 */}
        <span class={styles.action} onClick={() => { if (state.open) state.close(false); }}><Slot name="action" /></span>
      </Show>
      {/* tabindex="-1": 押せない面を押してもフォーカスがカードに留まり、focusout で閉じない。 */}
      <div ref={cardRef!} id={state.id || undefined} class={styles.card} role="dialog" aria-label={props.cardLabel} hidden={!state.open} tabIndex={-1}>
        <div class={styles.banner} />
        <div class={styles.profile}>
          <span class={styles.cardAvatar} aria-hidden="true"><Avatar name={props.name} src={props.src} size={64} /></span>
          <span class={styles.cardName}>{props.name}</span>
          <Show when={props.description}>
            <span class={styles.cardDescription}>{props.description}</span>
          </Show>
        </div>
        <div ref={boxRef!} class={`${menu.list} ${styles.box}`}
          onMouseEnter={(event) => enterHighlight(boxRef, event)} onMouseLeave={() => leaveHighlight(boxRef)}
        >
          <span class={highlights.highlight} data-hover-highlight="" aria-hidden="true" />
          <For each={state.sections}>
            {(section, sectionIndex) => (
              <Fragment key={sectionIndex}>
                <Show when={sectionIndex > 0}>
                  <div class={menu.separator} aria-hidden="true" />
                </Show>
                <ul class={styles.list}>
                  <For each={section.items}>
                    {(item) => (
                      <li key={item.value} class={styles.row}>
                        {/* Vue では scripts/patch-vue-user-panel-item-icon.mjs が {{ item.icon }} を item-icon スロットに置き換え、
                            hasIcons の判定にスロットの有無を加える。Mitosis の Slot は行の項目をスロットへ渡せないため。 */}
                        <Show when={item.href}>
                          <a class={`${menu.item} ${styles.item}`} data-user-panel-item="" href={item.disabled ? undefined : item.href}
                            role={item.disabled ? 'link' : undefined} aria-disabled={item.disabled || undefined}
                            data-destructive={item.destructive ? 'true' : undefined}
                            onMouseEnter={(event) => highlightItem(boxRef, event.currentTarget)}
                            onFocus={(event) => highlightItem(boxRef, event.currentTarget)}
                            onClick={(event) => state.select(item, event)}
                          >
                            <Show when={state.hasIcons}>
                              <span class={menu.itemIcon} aria-hidden="true">{item.icon}</span>
                            </Show>
                            <span class={menu.itemLabel}>{item.label}</span>
                          </a>
                        </Show>
                        <Show when={!item.href}>
                          <button type="button" class={`${menu.item} ${styles.item}`} data-user-panel-item=""
                            aria-disabled={item.disabled || undefined} data-destructive={item.destructive ? 'true' : undefined}
                            onMouseEnter={(event) => highlightItem(boxRef, event.currentTarget)}
                            onFocus={(event) => highlightItem(boxRef, event.currentTarget)}
                            onClick={(event) => state.select(item, event)}
                          >
                            <Show when={state.hasIcons}>
                              <span class={menu.itemIcon} aria-hidden="true">{item.icon}</span>
                            </Show>
                            <span class={menu.itemLabel}>{item.label}</span>
                          </button>
                        </Show>
                      </li>
                    )}
                  </For>
                </ul>
              </Fragment>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}
