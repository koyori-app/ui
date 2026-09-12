import { Slot } from '@builder.io/mitosis';
import styles from '../shared/control.module.css';

interface ButtonOptions {
  /** React: rendered icon. Vue: use the icon slot. */
  icon?: any;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
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
      disabled={props.disabled}
      onClick={() => props.onClick?.()}
    >
      <span class={styles.surface}>
        <span class={styles.icon} aria-hidden="true"><Slot name="icon" /></span>
        {props.label}
      </span>
    </button>
  );
}
