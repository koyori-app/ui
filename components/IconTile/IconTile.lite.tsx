import { Show, useStore } from '@builder.io/mitosis';
import { firstGrapheme } from '../Avatar/avatar';
import styles from './icon-tile.module.css';

export interface IconTileProps {
  /** 頭文字に使う名前。読み上げ名は包む側が持つ（このタイルは読み上げから外す）。 */
  name: string;
  /** 画像。読み込みに失敗したら emoji、無ければ頭文字を出す。 */
  src?: string;
  emoji?: string;
  /** 一辺（px）。既定は 40。 */
  size?: number;
}

export default function IconTile(props: IconTileProps) {
  const state = useStore({
    /* 読み込みに失敗した src。src が替わったら失敗を持ち越さない。真偽値を onUpdate で戻すと、
       React では mount 直後の effect が、先に起きた失敗を消してしまうため、src そのものを覚える。 */
    failedSrc: '',
    /* 他の getter を参照すると Vue の生成物で .value が落ちるため、それぞれで判定する。 */
    get kind() {
      if (props.src && state.failedSrc !== props.src) return 'image';
      return props.emoji ? 'emoji' : 'initial';
    },
    get initial() {
      return firstGrapheme((props.name ?? '').trim());
    },
    get style() {
      const px = props.size ?? 40;
      return { width: `${px}px`, height: `${px}px` };
    },
    get emojiStyle() {
      return { fontSize: `${(props.size ?? 40) / 2}px` };
    },
    get initialStyle() {
      return { fontSize: `${(props.size ?? 40) * 0.4}px` };
    },
  });

  return (
    <span class={styles.tile} style={state.style} data-kind={state.kind} aria-hidden="true">
      <Show when={state.kind === 'image'}>
        <img class={styles.image} src={props.src} alt="" decoding="async"
          onError={() => {
            state.failedSrc = props.src ?? '';
          }}
        />
      </Show>
      <Show when={state.kind === 'emoji'}>
        <span class={styles.emoji} style={state.emojiStyle}>{props.emoji}</span>
      </Show>
      <Show when={state.kind === 'initial'}>
        <span class={styles.initial} style={state.initialStyle}>{state.initial}</span>
      </Show>
    </span>
  );
}
