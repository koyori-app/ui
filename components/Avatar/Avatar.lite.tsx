import { onUpdate, Show, useStore } from '@builder.io/mitosis';
import { avatarInitials, avatarSizeStyle } from './avatar';
import styles from './avatar.module.css';

export interface AvatarProps {
  /** 表示名。画像の代替テキストとイニシャルに使う。 */
  name: string;
  src?: string;
  /** 円の直径（px）。既定は 32。 */
  size?: number;
}

export default function Avatar(props: AvatarProps) {
  const state = useStore({
    failed: false,
    get showImage() {
      return !!props.src && !state.failed;
    },
    get style() {
      return avatarSizeStyle(props.size);
    },
    get initials() {
      return avatarInitials(props.name);
    },
  });

  /* src が差し替わったら、前の画像の読み込み失敗を持ち越さない。 */
  onUpdate(() => {
    state.failed = false;
  }, [props.src]);

  return (
    <span class={styles.avatar} style={state.style}>
      <Show when={state.showImage}>
        <img class={styles.image} src={props.src} alt={props.name} loading="lazy" decoding="async"
          onError={() => {
            state.failed = true;
          }}
        />
      </Show>
      <Show when={!state.showImage}>
        <span role="img" aria-label={props.name}>{state.initials}</span>
      </Show>
    </span>
  );
}
