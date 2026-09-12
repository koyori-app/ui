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
        {(item, index) => (
          /* 同姓同名・同じ画像でも重複しない key にする。差し替えで src が変われば Avatar 側が失敗状態を戻す。 */
          <Avatar key={index} name={item.name} src={item.src} size={props.size} />
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
