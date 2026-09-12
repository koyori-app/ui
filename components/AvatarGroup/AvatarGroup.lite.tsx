import { For, Show, useStore } from '@builder.io/mitosis';
import Avatar from '../Avatar/Avatar.lite';
import { avatarSizeStyle } from '../Avatar/avatar';
import styles from './avatar-group.module.css';

export interface AvatarGroupItem {
  name: string;
  src?: string;
}

export interface AvatarGroupProps {
  /** グループの目的。例: タスクの担当者 */
  label: string;
  items: AvatarGroupItem[];
  /** 表示する最大人数。超えた分は +N にまとめる。 */
  max?: number;
  size?: number;
  /** +N の読み上げ文。既定は「他 N 人」。 */
  formatOverflow?: (count: number) => string;
}

export default function AvatarGroup(props: AvatarGroupProps) {
  const state = useStore({
    get shown() {
      return props.max === undefined ? props.items : props.items.slice(0, Math.max(props.max, 0));
    },
    /* Vue では getter どうしを参照できないため、items と max だけから求める。 */
    get hidden() {
      return props.max === undefined ? 0 : Math.max(props.items.length - Math.max(props.max, 0), 0);
    },
    get style() {
      return avatarSizeStyle(props.size);
    },
  });

  /* span にして、Picker のトリガー（button）の中にも置けるようにする。 */
  return (
    <span class={styles.group} role="group" aria-label={props.label}>
      <For each={state.shown}>
        {(item) => (
          /* 並び替え・削除で、読み込み失敗の状態が別の人へ引き継がれないようにする。 */
          <Avatar key={`${item.name}|${item.src ?? ''}`} name={item.name} src={item.src} size={props.size} />
        )}
      </For>
      <Show when={state.hidden > 0}>
        <span class={styles.overflow} style={state.style} role="img"
          aria-label={props.formatOverflow ? props.formatOverflow(state.hidden) : `他 ${state.hidden} 人`}
        >
          +{state.hidden}
        </span>
      </Show>
    </span>
  );
}
