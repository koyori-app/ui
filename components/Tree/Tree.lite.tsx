import { For, Show, useRef, useStore } from '@builder.io/mitosis';
import { enterHighlight, highlightItem, leaveHighlight } from '../shared/highlight';
import highlights from '../shared/highlight.module.css';
import Badge from '../Badge/Badge.lite';
import ChevronDownIcon from '../ChevronDownIcon/ChevronDownIcon.lite';
import { defaultTreeExpanded, nextTreeFocus, noTreeId, noTreeIds, toggleTreeExpanded, treeActivation, treeTabStop, visibleTreeNodes } from './tree';
import type { TreeNode, VisibleTreeNode } from './tree';
import styles from './tree.module.css';

export interface TreeProps {
  /** 木の名前（aria-label）。必須。 */
  label: string;
  /** 木の上に出す見出し（例「ファイル · 6」）。無ければ出さない。 */
  heading?: string;
  nodes: TreeNode[];
  /** 選択中の節。省くと部品の中で持つ。 */
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
   フォーカスは 1 つの節だけに置き（roving tabindex）、矢印キーで移す。 */
export default function Tree(props: TreeProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const state = useStore({
    /* defaultExpandedIds があればそこから開閉を持つ。無ければ閉じた節だけを持ち、後から届いた節も開いて出す。 */
    storedExpanded: props.defaultExpandedIds ?? null,
    storedClosed: noTreeIds(),
    storedSelected: noTreeId(),
    focusedId: noTreeId(),
    expanded(): string[] {
      return props.expandedIds ?? state.storedExpanded ?? defaultTreeExpanded(props.nodes, state.storedClosed);
    },
    selected(): string | null {
      return props.selectedId === undefined ? state.storedSelected : props.selectedId;
    },
    rows(): VisibleTreeNode[] {
      return visibleTreeNodes(props.nodes, state.expanded());
    },
    tabStop(): string | null {
      return treeTabStop(state.rows(), state.focusedId, state.selected());
    },
    focusNode(id: string) {
      state.focusedId = id;
      const items = listRef?.querySelectorAll<HTMLElement>('[role="treeitem"]') || [];
      for (const item of Array.from(items)) if (item.getAttribute('data-tree-id') === id) item.focus();
    },
    blur(next: EventTarget | null) {
      if (!(next instanceof Node && listRef?.contains(next))) leaveHighlight(listRef);
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
    keydown(event: { key: string; altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; preventDefault(): void }, id: string) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const move = nextTreeFocus(state.rows(), id, event.key);
      /* 扱うキーは、端で動かなくてもページのスクロールを止める。 */
      if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End', 'Enter', ' '].includes(event.key)) event.preventDefault();
      if (!move) return;
      if (move.type === 'focus') state.focusNode(move.id);
      else if (move.type === 'expand') state.setExpanded(move.id, true);
      else if (move.type === 'collapse') state.setExpanded(move.id, false);
      else state.activate(move.id);
    },
  });

  return (
    <div class={styles.root}>
      <Show when={props.heading}>
        <div class={styles.heading}>{props.heading}</div>
      </Show>
      <div ref={listRef!} class={styles.list} role="tree" aria-label={props.label}
        onMouseEnter={(event) => enterHighlight(listRef, event)} onMouseLeave={() => leaveHighlight(listRef)}
      >
        <span class={highlights.highlight} data-hover-highlight="" aria-hidden="true" />
        <For each={state.rows()}>
          {(row) => (
            <div key={row.id} class={styles.item} role="treeitem" data-tree-id={row.id}
              data-branch={row.expandable ? 'true' : undefined}
              aria-level={row.level} aria-setsize={row.setSize} aria-posinset={row.posInSet}
              /* Vue は未指定の boolean を false にするため、文字列で出し、葉には属性ごと出さない。 */
              aria-expanded={row.expandable ? (row.expanded ? 'true' : 'false') : undefined}
              aria-selected={row.id === state.selected() ? 'true' : undefined}
              aria-disabled={row.node.disabled ? 'true' : undefined}
              tabIndex={row.id === state.tabStop() ? 0 : -1}
              title={row.node.title}
              style={{ paddingInlineStart: `calc(var(--koyori-space-md) + ${row.level - 1} * var(--tree-indent))` }}
              onMouseEnter={(event) => highlightItem(listRef, event.currentTarget)}
              onFocus={(event) => { state.focusedId = row.id; highlightItem(listRef, event.currentTarget); }}
              /* Tab で木の外へ出たら、フォーカスに付いてきた面を消す。木の中の移動では次の onFocus が動かす。 */
              onBlur={(event) => state.blur(event.relatedTarget)}
              onClick={() => { state.focusNode(row.id); state.activate(row.id); }}
              onKeyDown={(event) => state.keydown(event, row.id)}
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
