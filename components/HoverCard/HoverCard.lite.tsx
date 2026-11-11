import { Slot, onMount, onUnMount, onUpdate, useRef } from '@builder.io/mitosis';
import { connectHoverCard } from './hover-card';
import styles from './hover-card.module.css';

export interface HoverCardProps {
  /** カードの読み上げ名。例: 「hanako のプロフィール」。開くたびに変えてよい。 */
  label: string;
  /** カードの id。省略時は接続時に koyori-hover-card-<乱数> を付ける。 */
  id?: string;
  /** 委譲で起点を探す容れ物。指定すると children は起点にしない。 */
  container?: HTMLElement | null;
  /** container の中で起点にする要素のセレクター。既定 '[data-hover-card-trigger]'。 */
  selector?: string;
  /** ポインターを載せてから開くまで（ms）。既定 400。フォーカスでも同じ遅れ。 */
  openDelay?: number;
  /** 起点とカードの両方から離れてから閉じるまで（ms）。既定 150。 */
  closeDelay?: number;
  disabled?: boolean;
  /** children の起点で、マウント直後に遅れなしで開く。container 指定時は無視。 */
  defaultOpen?: boolean;
  /** 開いたとき true、閉じたとき false。trigger はそのときの起点要素。 */
  onOpenChange?: (open: boolean, trigger: HTMLElement) => void;
  /** 起点。フォーカスできる要素 1 つ。Vue: default slot。 */
  children?: any;
  /** カードの中身。React: 描画済みのノード。Vue: content スロット。 */
  content?: any;
}

export default function HoverCard(props: HoverCardProps) {
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const panelRef = useRef<HTMLSpanElement | null>(null);
  let connection = useRef<ReturnType<typeof connectHoverCard> | null>(null);
  onMount(() => {
    connection = connectHoverCard(rootRef, panelRef, {
      container: props.container ?? null, selector: props.selector, openDelay: props.openDelay, closeDelay: props.closeDelay,
      disabled: props.disabled, defaultOpen: props.defaultOpen, onOpenChange: props.onOpenChange,
    });
  });
  // 依存なし。React は毎描画、Vue は onUpdated で、最新の onOpenChange・container を渡し直す（React のリスナーが古い props を掴み続けないように）。
  onUpdate(() => {
    connection?.configure({
      container: props.container ?? null, selector: props.selector, openDelay: props.openDelay, closeDelay: props.closeDelay,
      disabled: props.disabled, defaultOpen: props.defaultOpen, onOpenChange: props.onOpenChange,
    });
  });
  onUnMount(() => { connection?.destroy(); });

  return (
    <span ref={rootRef!} class={styles.root}>
      {props.children}
      <span ref={panelRef!} class={styles.panel} id={props.id} role="dialog" aria-label={props.label} hidden>
        <Slot name="content" />
      </span>
    </span>
  );
}
