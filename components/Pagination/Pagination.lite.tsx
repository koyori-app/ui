import { Show, useStore } from '@builder.io/mitosis';
import { canGoNext, canGoPrevious, clampPage, formatPageRange, pageRange } from './pagination';
import type { PaginationRange } from './pagination';
import controls from '../shared/control.module.css';
import styles from './pagination.module.css';

export interface PaginationProps {
  /** 1 始まりの現在ページ。制御のみ（URL との同期などは利用側）。 */
  page: number;
  /** 1 ページの件数。非有限・1 未満は 1。 */
  pageSize: number;
  /** 総件数。未取得なら省略する（範囲は出さず、次へは hasNext に従う）。 */
  total?: number;
  /** total が無いとき（カーソル式）に次のページがあるか。 */
  hasNext?: boolean;
  /** 前へ・次へで移りたいページを通知する。 */
  onPageChange?: (page: number) => void;
  /** nav の aria-label。既定 'ページ送り'。同じページに複数置くときは区別できる名前にする。 */
  label?: string;
  /** 既定 '前へ'。 */
  previousLabel?: string;
  /** 既定 '次へ'。 */
  nextLabel?: string;
  /** 範囲の文。既定 `${from}–${to} / ${total} 件`（en dash）。0 件は '0 件'。 */
  formatRange?: (range: PaginationRange) => string;
  /** 範囲の文を出さない。件数を別の場所で示しているときに使う。 */
  hideRange?: boolean;
  /** 取得中。ボタンは残して aria-disabled にし、範囲に aria-busy を付ける。 */
  loading?: boolean;
}

/* Button を挟まず共通のボタン用スタイルを直接使う（ConfirmDialog と同じ理由）。
   端で disabled にするとフォーカスが消えるため、aria-disabled にして押下を無視する（DataList の「さらに読み込む」と同じ）。 */
export default function Pagination(props: PaginationProps) {
  const state = useStore({
    /* getter 同士を参照すると Vue の生成物で ref のまま渡るため、どれも props から計算する。 */
    get rangeText() {
      const range = pageRange(props.page, props.pageSize, props.total);
      return props.formatRange ? props.formatRange(range) : formatPageRange(range);
    },
    get previousDisabled() {
      return !!props.loading || !canGoPrevious(clampPage(props.page, props.pageSize, props.total));
    },
    get nextDisabled() {
      return !!props.loading || !canGoNext(props.page, props.pageSize, props.total, props.hasNext);
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
  });

  /* ページを変えた直後もフォーカスはボタンに残るため、範囲の文を polite で読ませて結果を伝える。 */
  return (
    <nav class={styles.root} aria-label={props.label ?? 'ページ送り'}>
      <Show when={!props.hideRange && props.total !== undefined}>
        <p class={styles.range} aria-live="polite" aria-atomic="true" aria-busy={props.loading || undefined}>
          {state.rangeText}
        </p>
      </Show>
      <div class={styles.buttons}>
        <button type="button" class={controls.button} data-variant="tertiary"
          aria-disabled={state.previousDisabled ? 'true' : undefined}
          onClick={() => state.previous()}
        >
          <span class={controls.surface}>{props.previousLabel ?? '前へ'}</span>
        </button>
        <button type="button" class={controls.button} data-variant="tertiary"
          aria-disabled={state.nextDisabled ? 'true' : undefined}
          onClick={() => state.next()}
        >
          <span class={controls.surface}>{props.nextLabel ?? '次へ'}</span>
        </button>
      </div>
    </nav>
  );
}
