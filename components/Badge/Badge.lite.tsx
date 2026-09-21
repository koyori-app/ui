import { Show } from '@builder.io/mitosis';
import styles from '../shared/label.module.css';

export interface BadgeProps {
  /** Visible status or count. Numeric zero is rendered without special handling. */
  label: string | number;
  size?: 'sm' | 'md';
  /** Optional decorative dot; its business meaning belongs to the app. */
  dotColor?: string;
}

export default function Badge(props: BadgeProps) {
  return (
    <span class={styles.root} data-size={props.size ?? 'sm'}>
      <span class={styles.content}>
        <Show when={props.dotColor}><span class={styles.dot} style={{ backgroundColor: props.dotColor ?? 'currentColor' }} aria-hidden="true" /></Show>
        <span class={styles.label}>{props.label}</span>
      </span>
    </span>
  );
}
