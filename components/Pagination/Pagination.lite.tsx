import { For, Show, onMount, onUnMount, useRef, useStore } from '@builder.io/mitosis';
import ChevronDownIcon from '../ChevronDownIcon/ChevronDownIcon.lite';
import { listenToSidebar } from '../Sidebar/sidebar';
import highlights from '../shared/highlight.module.css';
import { canGoNext, canGoPrevious, clampPage, formatPageLabel, formatPageRange, pageItems, pageRange } from './pagination';
import type { PaginationRange } from './pagination';
import styles from './pagination.module.css';

export interface PaginationProps {
  /** 1 始まりの現在ページ。制御のみ（URL との同期などは利用側）。 */
  page: number;
  /** 1 ページの件数。非有限・1 未満は 1。 */
  pageSize: number;
  /** 総件数。未取得なら省略する（範囲とページ番号は出さず、次へは hasNext に従う）。 */
  total?: number;
  /** total が無いとき（カーソル式）に次のページがあるか。 */
  hasNext?: boolean;
  /** 前へ・次へ・ページ番号で移りたいページを通知する。 */
  onPageChange?: (page: number) => void;
  /** 現在ページの前後に出すページ数。既定 2。狭い場所では 1 や 0 にする。 */
  siblingCount?: number;
  /** nav の aria-label。既定 'ページ送り'。同じページに複数置くときは区別できる名前にする。 */
  label?: string;
  /** 既定 '前へ'。 */
  previousLabel?: string;
  /** 既定 '次へ'。 */
  nextLabel?: string;
  /** ページ番号のボタンの名前。既定 `${page} ページ目`。見えている数字を含める。 */
  pageLabel?: (page: number) => string;
  /** 範囲の文。既定 `${from}–${to} / ${total} 件`（en dash）。0 件は '0 件'。 */
  formatRange?: (range: PaginationRange) => string;
  /** 範囲の文を出さない。件数を別の場所で示しているときに使う。 */
  hideRange?: boolean;
  /** 取得中。ボタンは残して aria-disabled にし、範囲に aria-busy を付ける。 */
  loading?: boolean;
}

/* 端で disabled にするとフォーカスが消えるため、aria-disabled にして押下を無視する（DataList の「さらに読み込む」と同じ）。
   ページ番号のボタンも、押して現在ページになったあとフォーカスを保てるよう button のまま aria-current を付ける。 */
export default function Pagination(props: PaginationProps) {
  const controlsRef = useRef<HTMLDivElement | null>(null);
  let cleanupRef = useRef<(() => void) | null>(null);
  const state = useStore({
    /* getter 同士を参照すると Vue の生成物で ref のまま渡るため、どれも props から計算する。 */
    get rangeText() {
      const range = pageRange(props.page, props.pageSize, props.total);
      return props.formatRange ? props.formatRange(range) : formatPageRange(range);
    },
    get items() {
      return pageItems(props.page, props.pageSize, props.total, props.siblingCount);
    },
    get current() {
      return clampPage(props.page, props.pageSize, props.total);
    },
    get previousDisabled() {
      return !!props.loading || !canGoPrevious(clampPage(props.page, props.pageSize, props.total));
    },
    get nextDisabled() {
      return !!props.loading || !canGoNext(props.page, props.pageSize, props.total, props.hasNext);
    },
    /* Vue の生成物は非 null 表明を落とすため、省略記号の null もここで受ける。 */
    pageLabel(page: number | null) {
      if (page === null) return undefined;
      return props.pageLabel ? props.pageLabel(page) : formatPageLabel(page);
    },
    /* 範囲外のページを表示しているときも、見えているページの前後へ移す。 */
    previous() {
      const current = clampPage(props.page, props.pageSize, props.total);
      if (props.loading || !canGoPrevious(current)) return;
      props.onPageChange?.(current - 1);
    },
    next() {
      if (props.loading || !canGoNext(props.page, props.pageSize, props.total, props.hasNext)) return;
      props.onPageChange?.(clampPage(props.page, props.pageSize, props.total) + 1);
    },
    go(page: number | null) {
      if (page === null || props.loading || page === clampPage(props.page, props.pageSize, props.total)) return;
      props.onPageChange?.(page);
    },
  });
  /* ホバーの背景は Tabs・Sidebar と同じく一つの面が項目間を移る。 */
  onMount(() => { cleanupRef = listenToSidebar(controlsRef); });
  onUnMount(() => { cleanupRef?.(); });

  /* ページを変えた直後もフォーカスはボタンに残るため、範囲の文を polite で読ませて結果を伝える。 */
  return (
    <nav class={styles.root} aria-label={props.label ?? 'ページ送り'}>
      <Show when={!props.hideRange && props.total !== undefined}>
        <p class={styles.range} aria-live="polite" aria-atomic="true" aria-busy={props.loading || undefined}>
          {state.rangeText}
        </p>
      </Show>
      <div ref={controlsRef!} class={styles.controls} data-hover-group="">
        <span class={highlights.highlight} data-hover-highlight="" aria-hidden="true" />
        <button type="button" class={styles.step} data-hover-item=""
          aria-disabled={state.previousDisabled ? 'true' : undefined}
          onClick={() => state.previous()}
        >
          <span class={styles.previousIcon}><ChevronDownIcon /></span>
          {props.previousLabel ?? '前へ'}
        </button>
        <Show when={state.items.length > 0}>
          {/* list-style: none で list の意味論を落とす読み上げ環境があるため role を明示する。 */}
          <ul class={styles.pages} role="list">
            <For each={state.items}>
              {(item) => (
                <li key={item.key} class={styles.item} aria-hidden={item.page === null ? 'true' : undefined}>
                  <Show when={item.page !== null}>
                    <button type="button" class={styles.page} data-hover-item=""
                      aria-label={state.pageLabel(item.page)}
                      aria-current={item.page === state.current ? 'page' : undefined}
                      aria-disabled={props.loading ? 'true' : undefined}
                      onClick={() => state.go(item.page)}
                    >{item.page}</button>
                  </Show>
                  <Show when={item.page === null}>
                    <span class={styles.ellipsis}>…</span>
                  </Show>
                </li>
              )}
            </For>
          </ul>
        </Show>
        <button type="button" class={styles.step} data-hover-item=""
          aria-disabled={state.nextDisabled ? 'true' : undefined}
          onClick={() => state.next()}
        >
          {props.nextLabel ?? '次へ'}
          <span class={styles.nextIcon}><ChevronDownIcon /></span>
        </button>
      </div>
    </nav>
  );
}
