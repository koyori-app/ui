import { Show } from '@builder.io/mitosis';
import type { BadgeAppearance, BadgeTone } from './badge';
import styles from '../shared/label.module.css';

export interface BadgeProps {
  /** Visible status or count. Numeric zero is rendered without special handling. */
  label: string | number;
  size?: 'sm' | 'md';
  /** Optional decorative dot; its business meaning belongs to the app. */
  dotColor?: string;
  /** 意味の色。既定は neutral（今の見た目）。色だけに意味を持たせず、label でも示す。 */
  tone?: BadgeTone;
  /** soft は淡い塗り、outline は枠と文字だけ。既定は soft。 */
  appearance?: BadgeAppearance;
}

export default function Badge(props: BadgeProps) {
  return (
    /* 省いたときは属性を出さず、今の DOM と見た目のままにする。 */
    <span class={styles.root} data-size={props.size ?? 'sm'} data-tone={props.tone || undefined} data-appearance={props.appearance || undefined}>
      <span class={styles.content}>
        <Show when={props.dotColor}><span class={styles.dot} style={{ backgroundColor: props.dotColor ?? 'currentColor' }} aria-hidden="true" /></Show>
        <span class={styles.label}>{props.label}</span>
      </span>
    </span>
  );
}
