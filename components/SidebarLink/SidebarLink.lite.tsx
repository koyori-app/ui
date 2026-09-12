import { Show, Slot } from '@builder.io/mitosis';
import styles from './sidebar-link.module.css';

export interface SidebarLinkProps {
  label: string;
  href: string;
  current?: boolean;
  disabled?: boolean;
  badge?: string;
  /** React: rendered icon. Vue: use the icon slot. */
  icon?: any;
}

export default function SidebarLink(props: SidebarLinkProps) {
  return (
    <a class={styles.link} href={props.disabled ? undefined : props.href}
      aria-current={props.current ? 'page' : undefined} aria-disabled={props.disabled || undefined}
      role={props.disabled ? 'link' : undefined} tabIndex={props.disabled ? -1 : undefined}
    >
      <span class={styles.icon} aria-hidden="true"><Slot name="icon" /></span>
      <span class={styles.label}>{props.label}</span>
      <Show when={props.badge !== undefined}><span class={styles.badge}>{props.badge}</span></Show>
    </a>
  );
}
