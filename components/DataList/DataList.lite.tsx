import { For, Show, onUpdate, useDefaultProps, useRef, useStore } from '@builder.io/mitosis';
import controls from '../shared/control.module.css';
import ChevronDownIcon from '../ChevronDownIcon/ChevronDownIcon.lite';
import { ariaSort, nextSort } from './data-list';
import styles from './data-list.module.css';

export interface DataListColumn {
  id: string;
  label: string;
  /** CSS width, e.g. "8rem". Omit on the title column to use remaining space. */
  width?: string;
  /** Turns the header into a sort button. Sorting itself is up to the application. */
  sortable?: boolean;
}

export interface DataListProps {
  /** Unique on the page, including when multiple groups are rendered. */
  id: string;
  label: string;
  columns: DataListColumn[];
  /** Total count supplied by the application, not the number of loaded rows. */
  count?: number;
  collapsible?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  status?: 'ready' | 'empty' | 'loading' | 'error';
  /** Override the empty, loading or error message. */
  message?: string;
  children?: any;
  /* Mitosis は任意 props で名前付きの型を参照できないため、形をそのまま書く。
     同じ形を DataListSort として data-list.ts から公開している。 */
  /** Controlled sort state. Pass an empty value to clear it. Sorting itself is up to the application. */
  sort?: { columnId: string; direction: 'ascending' | 'descending' } | null;
  onOpenChange?: (open: boolean) => void;
  onRetry?: () => void;
  /** Receives the next state each time a sortable header is pressed. Empty means the sort was cleared. */
  onSortChange?: (sort: { columnId: string; direction: 'ascending' | 'descending' } | null) => void;
}

export default function DataList(props: DataListProps) {
  useDefaultProps({ open: undefined });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const state = useStore({
    storedOpen: props.defaultOpen ?? true,
    isOpen() { return !props.collapsible || (props.open ?? state.storedOpen); },
    toggle() {
      const next = !state.isOpen();
      if (props.open === undefined) state.storedOpen = next;
      props.onOpenChange?.(next);
    },
  });

  onUpdate(() => {
    if (!state.isOpen() && panelRef) {
      if (panelRef.contains(document.activeElement)) triggerRef?.focus();
      if (typeof HTMLElement.prototype.hidePopover === 'function') {
        panelRef.querySelectorAll<HTMLElement>(':popover-open').forEach(panel => panel.hidePopover());
      }
    }
  }, [props.open, props.collapsible, state.storedOpen]);

  return (
    <section class={styles.root} aria-labelledby={`${props.id}-heading`}>
      <div class={styles.heading}
        role="heading" aria-level={props.headingLevel ?? 3} id={`${props.id}-heading`}
      >
        <Show when={props.collapsible} else={
          <span class={styles.title}>
            <span>{props.label}</span>
            <Show when={props.count !== undefined}><span class={styles.count}>{props.count}<span class={styles.srOnly}> 件</span></span></Show>
          </span>
        }>
          <button ref={triggerRef!} type="button" class={styles.trigger}
            aria-expanded={state.isOpen()} aria-controls={`${props.id}-panel`} onClick={() => state.toggle()}
          >
            <span class={styles.chevron} aria-hidden="true"><ChevronDownIcon size={16} /></span>
            <span>{props.label}</span>
            <Show when={props.count !== undefined}><span class={styles.count}>{props.count}<span class={styles.srOnly}> 件</span></span></Show>
          </button>
        </Show>
      </div>
      <div ref={panelRef!} id={`${props.id}-panel`} hidden={!state.isOpen()} class={styles.panel}>
        <div class={styles.scroll} data-menu-top-layer="" tabIndex={0} role="region" aria-label={`${props.label}の一覧（横スクロール可能）`}>
          <table class={styles.table}>
            <caption class={styles.srOnly}>{props.label}</caption>
            <colgroup><For each={props.columns}>{column => <col key={column.id} style={{ width: column.width ?? 'auto' }} />}</For></colgroup>
            <thead><tr><For each={props.columns}>{column => (
              <th key={column.id} scope="col" aria-sort={ariaSort(column, props.sort)}>
                <Show when={column.sortable} else={<span>{column.label}</span>}>
                  <button type="button" class={styles.sortButton}
                    onClick={() => props.onSortChange?.(nextSort(props.sort, column.id))}
                  >
                    {column.label}
                    <span class={styles.sortIcon} aria-hidden="true"><ChevronDownIcon size={14} /></span>
                  </button>
                </Show>
              </th>
            )}</For></tr></thead>
            <tbody aria-busy={props.status === 'loading'}>
              <Show when={props.status !== 'empty'}>{props.children}</Show>
            </tbody>
            <Show when={props.status === 'empty' || props.status === 'loading' || props.status === 'error'}>
                <tbody><tr><td colSpan={props.columns.length || 1}>
                  <div class={styles.status}>
                    <span role={props.status === 'error' ? 'alert' : 'status'} data-error={props.status === 'error'}>
                      {props.message ?? (props.status === 'loading' ? '読み込み中…' : props.status === 'error' ? '読み込みに失敗しました' : '項目がありません')}
                    </span>
                    <Show when={props.status === 'error' && props.onRetry}>
                      <button type="button" class={controls.button} data-variant="secondary" onClick={() => props.onRetry?.()}>
                        <span class={controls.surface}>再試行</span>
                      </button>
                    </Show>
                  </div>
                </td></tr></tbody>
            </Show>
          </table>
        </div>
      </div>
    </section>
  );
}
