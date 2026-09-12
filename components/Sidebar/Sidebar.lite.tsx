import { onMount, onUnMount, Slot, useRef } from '@builder.io/mitosis';
import highlights from '../shared/highlight.module.css';
import { listenToSidebar } from './sidebar';
import styles from './sidebar.module.css';

export interface SidebarProps {
  /** Accessible name of this navigation landmark. */
  label: string;
  header?: any;
  footer?: any;
  children?: any;
}

export default function Sidebar(props: SidebarProps) {
  const itemsRef = useRef<HTMLDivElement | null>(null);
  let cleanupRef = useRef<(() => void) | null>(null);
  onMount(() => { cleanupRef = listenToSidebar(itemsRef); });
  onUnMount(() => cleanupRef?.());

  return (
    <div class={styles.root}>
      <div class={styles.header}><Slot name="header" /></div>
      <nav class={styles.navigation} aria-label={props.label}>
        <div ref={itemsRef!} class={styles.items} data-hover-group="">
          <span class={highlights.highlight} data-hover-highlight="" aria-hidden="true" />
          {props.children}
        </div>
      </nav>
      <div class={styles.footer}><Slot name="footer" /></div>
    </div>
  );
}
