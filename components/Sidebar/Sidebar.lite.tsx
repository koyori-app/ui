import { onMount, onUnMount, onUpdate, Show, Slot, useDefaultProps, useRef } from '@builder.io/mitosis';
import ChevronDownIcon from '../ChevronDownIcon/ChevronDownIcon.lite';
import controls from '../shared/control.module.css';
import highlights from '../shared/highlight.module.css';
import { listenToSidebar, restoreFocus } from './sidebar';
import styles from './sidebar.module.css';

export interface SidebarProps {
  /** Accessible name of this navigation landmark. */
  label: string;
  /** Makes the sidebar collapsible. Controlled by the app; omit to keep it always shown. */
  open?: boolean;
  /** Edge the sidebar collapses toward. Left and right collapse the width, top and bottom the height. */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Shows icons only, hiding labels visually. Accessible names stay. Not supported with top or bottom. */
  rail?: boolean;
  /** Pass it to show a button in the header that toggles rail. The app keeps the state, as with open. */
  onRailChange?: (rail: boolean) => void;
  /** Accessible name of the rail button. */
  railLabel?: string;
  /** Root id. Required with open so the toggle button can point to it with ariaControls. */
  id?: string;
  header?: any;
  footer?: any;
  children?: any;
}

export default function Sidebar(props: SidebarProps) {
  // Preserve undefined in Vue so an omitted open prop keeps the sidebar always shown.
  useDefaultProps({ open: undefined, rail: undefined });
  const rootRef = useRef<HTMLDivElement | null>(null);
  const itemsRef = useRef<HTMLDivElement | null>(null);
  let cleanupRef = useRef<(() => void) | null>(null);
  onMount(() => { cleanupRef = listenToSidebar(itemsRef); });
  onUnMount(() => cleanupRef?.());
  onUpdate(() => { if (props.open === false) restoreFocus(rootRef, props.id); }, [props.open]);
  // rail を切り替えたあとだけ並びの出現を動かす。最初の表示で動かさないよう、初回の呼び出しは記録だけにする。
  let railSeenRef = useRef<boolean | null>(null);
  onUpdate(() => {
    if (railSeenRef && rootRef) rootRef.setAttribute('data-sidebar-rail-moved', '');
    railSeenRef = true;
  }, [props.rail]);

  return (
    /* 開閉しないときは display: contents で、レイアウトに影響しない。 */
    <div ref={rootRef!} class={styles.frame} id={props.id}
      data-open={props.open === undefined ? undefined : String(props.open)}
      data-placement={props.open === undefined ? undefined : props.placement ?? 'left'}
      data-sidebar-rail={props.rail === undefined ? undefined : String(props.rail)}
    >
      <div class={styles.root}>
        <div class={styles.header}>
          <Slot name="header" />
          {/* 展開時はヘッダーに乗せたときだけ右から出し、rail では一番上に常に出す。
              上下に畳む配置では rail を使えないため出さない。 */}
          <Show when={props.onRailChange && props.placement !== 'top' && props.placement !== 'bottom'}>
            <button type="button" class={`${controls.button} ${styles.railToggle}`} data-variant="ghost" data-icon-only="true"
              aria-label={props.railLabel ?? 'アイコンだけの表示'}
              aria-pressed={props.rail ?? false}
              onClick={() => props.onRailChange?.(!props.rail)}
            >
              <span class={controls.surface}>
                <span class={`${controls.icon} ${styles.railToggleIcon}`} aria-hidden="true"><ChevronDownIcon size={16} /></span>
              </span>
            </button>
          </Show>
        </div>
        <nav class={styles.navigation} aria-label={props.label}>
          <div ref={itemsRef!} class={styles.items} data-hover-group="">
            <span class={styles.highlightClip} aria-hidden="true">
              <span class={highlights.highlight} data-hover-highlight="" />
            </span>
            {props.children}
          </div>
        </nav>
        <div class={styles.footer}><Slot name="footer" /></div>
      </div>
    </div>
  );
}
