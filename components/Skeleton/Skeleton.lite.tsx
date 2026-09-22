import { For, useStore } from '@builder.io/mitosis';
import { skeletonLineCount, skeletonLines } from './skeleton';
import styles from './skeleton.module.css';

export interface SkeletonProps {
  /** CSS の長さ。既定 '100%'。 */
  width?: string;
  /** CSS の長さ。既定: lines 未指定なら var(--koyori-control-height-sm)、lines 指定時は 1 行あたり 1em。 */
  height?: string;
  /** 角丸。既定 var(--koyori-radius-md)。'50%' と width=height で円（アバター用）になる。 */
  radius?: string;
  /** テキスト用。指定すると height の行を lines 本並べ、2 行以上なら最後の行だけ 60% 幅にする。 */
  lines?: number;
}

export default function Skeleton(props: SkeletonProps) {
  const state = useStore({
    /* getter 同士を参照すると Vue の生成物で ref のまま渡るため、どれも props から計算する。 */
    get rows() {
      return props.lines === undefined ? [] : skeletonLines(props.lines);
    },
    get lastRow() {
      return skeletonLineCount(props.lines) - 1;
    },
    /* 矩形はルート自身が描くので、高さと角丸はそのときだけルートに付ける。 */
    get rootStyle() {
      const style: Record<string, string> = { width: props.width ?? '100%' };
      if (props.lines === undefined) {
        style.height = props.height ?? 'var(--koyori-control-height-sm)';
        style.borderRadius = props.radius ?? 'var(--koyori-radius-md)';
      }
      return style;
    },
    get lineStyle() {
      return { height: props.height ?? '1em', borderRadius: props.radius ?? 'var(--koyori-radius-md)' };
    },
  });

  /* 読み上げは領域ごとに利用側が aria-busy で伝える。ここは見た目だけの飾り。 */
  return (
    <div
      class={styles.root}
      aria-hidden="true"
      data-lines={props.lines === undefined ? undefined : 'true'}
      style={state.rootStyle}
    >
      <For each={state.rows}>
        {(row, index) => (
          <div key={row} class={styles.line} style={state.lineStyle} data-last={index === state.lastRow ? 'true' : undefined} />
        )}
      </For>
    </div>
  );
}
