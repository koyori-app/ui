import { Show, Slot } from '@builder.io/mitosis';
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
  /** Pressed state of a toggle button, e.g. showing or hiding a password.
   * A string, like ariaHasPopup: Vue casts an omitted Boolean prop to false and would mark every button. */
  ariaPressed?: 'true' | 'false';
  /** 文字を危険の色にする。tertiary と ghost で効く。既定は default。 */
  tone?: 'default' | 'danger';
  /** あると <a> を出す。disabled のときは href を出さず aria-disabled を付ける。type と aria-* の開閉の属性は出さない。 */
  href?: string;
  target?: '_blank' | '_self';
  /** target が _blank で省いたときは noopener noreferrer を補う。 */
  rel?: string;
  /** Receives the click event, e.g. for menuButtonPosition(event). */
  onClick?: (event: { currentTarget: EventTarget | null }) => void;
}

/** A visible label or an accessible name is required. */
export type ButtonProps = ButtonOptions & (
  { label: string; ariaLabel?: string } | { label?: never; ariaLabel: string }
);

export default function Button(props: ButtonProps) {
  return (
    <Show when={props.href} else={
    <button
      class={styles.button}
      data-variant={props.variant || 'primary'}
      data-tone={props.tone || undefined}
      data-icon-only={!props.label}
      type={props.type || 'button'}
      aria-label={props.ariaLabel}
      /* Vue は未指定の boolean を false にするため、開閉対象があるときだけ出す。 */
      aria-expanded={props.ariaControls ? props.ariaExpanded : undefined}
      aria-controls={props.ariaControls}
      aria-haspopup={props.ariaHasPopup}
      aria-pressed={props.ariaPressed}
      disabled={props.disabled}
      /* Vue は親（as-child など）と利用側の @click を配列で渡すため、順に呼ぶ。 */
      onClick={(event) => (Array.isArray(props.onClick) ? props.onClick : [props.onClick]).forEach((handler) => handler?.(event))}
    >
      <span class={styles.surface}>
        <span class={styles.icon} aria-hidden="true"><Slot name="icon" /></span>
        <Show when={props.label}><span class={styles.label}>{props.label}</span></Show>
      </span>
    </button>
    }>
      {/* 無効のリンクは SidebarLink と同じく href を外し、role と aria-disabled で無効と伝え、Tab で止まらないようにする。 */}
      <a
        class={styles.button}
        data-variant={props.variant || 'primary'}
        data-tone={props.tone || undefined}
        data-icon-only={!props.label}
        href={props.disabled ? undefined : props.href}
        target={props.target}
        rel={props.rel || (props.target === '_blank' ? 'noopener noreferrer' : undefined)}
        aria-label={props.ariaLabel}
        aria-disabled={props.disabled || undefined}
        role={props.disabled ? 'link' : undefined}
        tabIndex={props.disabled ? -1 : undefined}
        onClick={(event) => {
          if (props.disabled) return;
          (Array.isArray(props.onClick) ? props.onClick : [props.onClick]).forEach((handler) => handler?.(event));
        }}
      >
        <span class={styles.surface}>
          <span class={styles.icon} aria-hidden="true"><Slot name="icon" /></span>
          <Show when={props.label}><span class={styles.label}>{props.label}</span></Show>
        </span>
      </a>
    </Show>
  );
}
