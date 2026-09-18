import { Slot } from '@builder.io/mitosis';
import styles from '../shared/control.module.css';

interface ButtonOptions {
  /** React: rendered icon. Vue: use the icon slot. */
  icon?: any;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  /** Open state of the region this button toggles, e.g. a collapsible Sidebar. Used with ariaControls. */
  ariaExpanded?: boolean;
  /** id of the region this button toggles. */
  ariaControls?: string;
  /** Kind of popup this button opens, e.g. 'menu' for a menu button. */
  ariaHasPopup?: 'menu' | 'listbox' | 'dialog' | 'true';
  /** Receives the click event, e.g. for menuButtonPosition(event). */
  onClick?: (event: { currentTarget: EventTarget | null }) => void;
}

/** A visible label or an accessible name is required. */
export type ButtonProps = ButtonOptions & (
  { label: string; ariaLabel?: string } | { label?: never; ariaLabel: string }
);

export default function Button(props: ButtonProps) {
  return (
    <button
      class={styles.button}
      data-variant={props.variant || 'primary'}
      data-icon-only={!props.label}
      type={props.type || 'button'}
      aria-label={props.ariaLabel}
      /* Vue は未指定の boolean を false にするため、開閉対象があるときだけ出す。 */
      aria-expanded={props.ariaControls ? props.ariaExpanded : undefined}
      aria-controls={props.ariaControls}
      aria-haspopup={props.ariaHasPopup}
      disabled={props.disabled}
      onClick={(event) => props.onClick?.(event)}
    >
      <span class={styles.surface}>
        <span class={styles.icon} aria-hidden="true"><Slot name="icon" /></span>
        {props.label}
      </span>
    </button>
  );
}
