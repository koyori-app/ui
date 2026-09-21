import { Show } from '@builder.io/mitosis';
import XIcon from '../XIcon/XIcon.lite';
import controls from '../shared/control.module.css';
import styles from '../shared/label.module.css';

export interface TagProps {
  /** Visible name. Use a non-empty label so color is never the only meaning. */
  label: string;
  size?: 'sm' | 'md';
  /** Optional decorative dot, using any CSS color (including a CSS variable). */
  dotColor?: string;
  /** Accessible name for the remove button. Defaults to label + を削除. */
  removeLabel?: string;
  /** Shows a remove button. The app decides whether/when to remove the Tag. */
  onRemove?: (event: { currentTarget: EventTarget | null }) => void;
}

export default function Tag(props: TagProps) {
  return (
    <span class={`${styles.root} ${styles.tag}`} data-size={props.size ?? 'sm'}>
      <span class={styles.content}>
        <Show when={props.dotColor}><span class={styles.dot} style={{ backgroundColor: props.dotColor ?? 'currentColor' }} aria-hidden="true" /></Show>
        <span class={styles.label}>{props.label}</span>
      </span>
      <Show when={props.onRemove}>
        <button class={`${controls.button} ${styles.remove}`} data-variant="ghost" type="button"
          aria-label={props.removeLabel || `${props.label}を削除`} onClick={(event) => props.onRemove?.(event)}>
          <span class={`${controls.surface} ${styles.removeSurface}`}><XIcon size={14} /></span>
        </button>
      </Show>
    </span>
  );
}
