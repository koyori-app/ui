import { Slot } from '@builder.io/mitosis';
import styles from './sidebar.module.css';

export interface SidebarProps {
  /** Accessible name of this navigation landmark. */
  label: string;
  header?: any;
  footer?: any;
  children?: any;
}

export default function Sidebar(props: SidebarProps) {
  return (
    <div class={styles.root}>
      <div class={styles.header}><Slot name="header" /></div>
      <nav class={styles.navigation} aria-label={props.label}>{props.children}</nav>
      <div class={styles.footer}><Slot name="footer" /></div>
    </div>
  );
}
