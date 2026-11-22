import { For, Show, onMount, onUpdate, useRef, useStore } from '@builder.io/mitosis';
import { enterHighlight, highlightItem, leaveHighlight } from '../shared/highlight';
import highlights from '../shared/highlight.module.css';
import Badge from '../Badge/Badge.lite';
import ChevronDownIcon from '../ChevronDownIcon/ChevronDownIcon.lite';
import { defaultTreeExpanded, nextTreeFocus, noTreeId, noTreeIds, sameTreeIds, toggleTreeExpanded, treeActivation, treeActiveId, treeAncestorIds, treeItemId, treeRows, visibleTreeNodes } from './tree';
import type { TreeNode, TreeRow, VisibleTreeNode } from './tree';
import styles from './tree.module.css';

export interface TreeProps {
  /** 木の名前（aria-label）。必須。 */
  label: string;
  /** 木の上に出す見出し（例「ファイル · 6」）。無ければ出さない。 */
  heading?: string;
  nodes: TreeNode[];
  /** 選択中の節。省くと部品の中で持つ。子を持つ節や無効の節を指しても、選択の表示は出す。 */
  selectedId?: string | null;
  /** 開いている節（制御する場合）。 */
  expandedIds?: string[];
  /** 最初に開いておく節。省くと全部開く。 */
  defaultExpandedIds?: string[];
  /** 葉の前に出すアイコン。既定は none。 */
  leafIcon?: 'file' | 'none';
  onSelect?: (id: string) => void;
  onExpandedChange?: (ids: string[]) => void;
}

/* APG の Tree View。見えている節を role="treeitem" で 1 段に並べ、深さは aria-level で伝える。
   DOM のフォーカスは入れ物（role="tree"）に置き、いまの節を aria-activedescendant で指す（Picker と同じ）。
   入れ物は nodes が変わっても外されず動かされないので、並べ替え・削除・空にしてもフォーカスは木に残る。 */
export default function Tree(props: TreeProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  /* いまの節が最後に見えていたときの祖先（近い順）。節が nodes から消えると、今の nodes からは親を辿れないため。
     描画の後に毎回作り直す。Vue の生成物は初期値を落として ref(null) にするので、null は空として読む。 */
  let trailRef = useRef<string[] | null>(null);
  const state = useStore({
    /* defaultExpandedIds があればそこから開閉を持つ。無ければ閉じた節だけを持ち、後から届いた節も開いて出す。 */
    storedExpanded: props.defaultExpandedIds ?? null,
    storedClosed: noTreeIds(),
    storedSelected: noTreeId(),
    /* いまの節の id。木の外にフォーカスがあるときは null。 */
    cursorId: noTreeId(),
    /* 行の DOM の id の前置き。SSR と食い違わないよう、マウント後に作る。 */
    uid: '',
    expanded(): string[] {
      return props.expandedIds ?? state.storedExpanded ?? defaultTreeExpanded(props.nodes, state.storedClosed);
    },
    selected(): string | null {
      return props.selectedId === undefined ? state.storedSelected : props.selectedId;
    },
    rows(): VisibleTreeNode[] {
      return visibleTreeNodes(props.nodes, state.expanded());
    },
    activeId(): string | null {
      return treeActiveId(props.nodes, state.rows(), state.cursorId, trailRef ?? noTreeIds(), state.selected());
    },
    items(): TreeRow[] {
      return treeRows(state.rows(), state.activeId(), state.selected());
    },
    activeDomId(): string | undefined {
      const current = state.activeId();
      return state.uid && current !== null ? treeItemId(state.uid, current) : undefined;
    },
    activeRow(): HTMLElement | null {
      return listRef?.querySelector<HTMLElement>('[data-active="true"]') ?? null;
    },
    /* いまの節を見える位置へ寄せ、ホバーの面を付ける。描画を待ってから動かす。
       行は :focus-visible にならないので、面は動かさずに置く（キー操作で帯だけが遅れて見えないように）。 */
    reveal() {
      requestAnimationFrame(() => {
        const row = state.activeRow();
        row?.scrollIntoView({ block: 'nearest' });
        if (row) highlightItem(listRef, row, true);
      });
    },
    /* 木に入ると、選択中の節（無ければ先頭）がいまの節になる。マウスで入ったときは位置を動かさない。 */
    enter() {
      if (state.cursorId === null) state.cursorId = state.activeId();
      if (listRef?.matches(':focus-visible')) state.reveal();
    },
    leave() {
      /* ウィンドウを切り替えたときは、フォーカスは入れ物のまま。戻ったときに続けられるよう覚えておく。 */
      if (document.activeElement === listRef) return;
      state.cursorId = null;
      leaveHighlight(listRef);
    },
    leaveHover() {
      leaveHighlight(listRef, document.activeElement === listRef && listRef?.matches(':focus-visible') ? state.activeRow() : null);
    },
    /* 描画の後に、求め直したいまの節を cursorId に書き戻し、控えを作り直す。
       書くのは中身が変わったときだけなので、描画し直しは 1 回で止まる。 */
    settle() {
      if (state.cursorId === null) return;
      const current = state.activeId();
      if (current !== state.cursorId) {
        state.cursorId = current;
        if (current !== null && document.activeElement === listRef) state.reveal();
      }
      const trail = current === null ? noTreeIds() : treeAncestorIds(state.rows(), current);
      if (!sameTreeIds(trailRef ?? noTreeIds(), trail)) trailRef = trail;
    },
    click(id: string) {
      if (document.activeElement === listRef) state.cursorId = id;
      state.activate(id);
    },
    setExpanded(id: string, open: boolean) {
      const next = toggleTreeExpanded(state.expanded(), id, open);
      if (props.expandedIds === undefined) {
        if (state.storedExpanded === null) state.storedClosed = toggleTreeExpanded(state.storedClosed, id, !open);
        else state.storedExpanded = next;
      }
      props.onExpandedChange?.(next);
    },
    activate(id: string) {
      const action = treeActivation(state.rows().find((row) => row.id === id));
      if (!action) return;
      if (action.type === 'toggle') state.setExpanded(action.id, action.open);
      else {
        if (props.selectedId === undefined) state.storedSelected = action.id;
        props.onSelect?.(action.id);
      }
    },
    keydown(event: { key: string; altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; preventDefault(): void }) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const move = nextTreeFocus(state.rows(), state.activeId(), event.key);
      /* 扱うキーは、端で動かなくてもページのスクロールを止める。 */
      if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End', 'Enter', ' '].includes(event.key)) event.preventDefault();
      if (!move) return;
      if (move.type === 'focus') {
        state.cursorId = move.id;
        state.reveal();
      } else if (move.type === 'expand') state.setExpanded(move.id, true);
      else if (move.type === 'collapse') state.setExpanded(move.id, false);
      else state.activate(move.id);
    },
  });

  onMount(() => {
    state.uid = `koyori-tree-${Math.random().toString(36).slice(2)}`;
  });

  /* 描画の後に動かす（deps 付きの onUpdate は Vue で DOM の更新より前に動く）。 */
  onUpdate(() => {
    state.settle();
  });

  return (
    <div class={styles.root}>
      <Show when={props.heading}>
        <div class={styles.heading}>{props.heading}</div>
      </Show>
      {/* 行が無くなっても tabindex="-1" でフォーカスを受けられるので、空にしてもフォーカスは木に残る。 */}
      <div ref={listRef!} class={styles.list} role="tree" aria-label={props.label}
        tabIndex={state.items().length ? 0 : -1} aria-activedescendant={state.activeDomId()}
        onFocus={() => state.enter()} onBlur={() => state.leave()} onKeyDown={(event) => state.keydown(event)}
        onMouseEnter={(event) => enterHighlight(listRef, event)} onMouseLeave={() => state.leaveHover()}
      >
        <span class={highlights.highlight} data-hover-highlight="" aria-hidden="true" />
        <For each={state.items()}>
          {(row) => (
            <div key={row.id} id={state.uid ? treeItemId(state.uid, row.id) : undefined}
              class={styles.item} role="treeitem" data-tree-id={row.id}
              data-active={row.active ? 'true' : undefined}
              data-branch={row.expandable ? 'true' : undefined}
              aria-level={row.level} aria-setsize={row.setSize} aria-posinset={row.posInSet}
              /* Vue は未指定の boolean を false にするため、文字列で出し、葉には属性ごと出さない。 */
              aria-expanded={row.expandable ? (row.expanded ? 'true' : 'false') : undefined}
              aria-selected={row.ariaSelected}
              aria-disabled={row.node.disabled ? 'true' : undefined}
              title={row.node.title}
              style={{ paddingInlineStart: `calc(var(--koyori-space-md) + ${row.level - 1} * var(--tree-indent))` }}
              onMouseEnter={(event) => highlightItem(listRef, event.currentTarget)}
              onClick={() => state.click(row.id)}
            >
              <Show when={row.expandable}>
                <span class={styles.chevron} aria-hidden="true"><ChevronDownIcon size={14} /></span>
              </Show>
              <Show when={!row.expandable && props.leafIcon === 'file'}>
                {/* Lucide file; ISC. See THIRD_PARTY_NOTICES.md. */}
                <svg class={styles.icon} width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"
                  style={{ strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }}
                >
                  <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
                  <path d="M14 2v5a1 1 0 0 0 1 1h5" />
                </svg>
              </Show>
              <span class={styles.label}>{row.node.label}</span>
              <Show when={row.node.badge}>
                <span class={styles.badge}><Badge label={row.node.badge!.label} tone={row.node.badge!.tone} appearance="soft" size="sm" /></span>
              </Show>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
