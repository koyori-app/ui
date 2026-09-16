import { Show, useRef, useStore, onMount, onUnMount, onUpdate } from '@builder.io/mitosis';
import { syncDialog } from '../Dialog/dialog';
import styles from './drawer.module.css';

export interface DrawerProps {
  /** Controlled by the app. Set it to false from onClose. */
  open: boolean;
  /** Accessible name of the drawer. */
  label: string;
  /** Set false to skip the dialog and render the children in place, e.g. an always-shown sidebar on wide screens. */
  modal?: boolean;
  /** Screen edge the drawer slides in from. */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /**
   * Called on Escape and on a backdrop click. Closing itself is up to the app.
   * The argument is unused; it exists because Mitosis wraps callbacks passed between components.
   */
  onClose?: (event?: unknown) => void;
  children?: any;
}

export default function Drawer(props: DrawerProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const state = useStore({
    sync() {
      syncDialog(dialogRef, props.open);
    },
    /* 自分で close() したときは props.open が false なので通知しない。 */
    notifyClose() {
      if (props.open) props.onClose?.();
    },
    /* panel が内側を覆うため、dialog 自身が target なら背景を押している。 */
    dismiss(event: { target: EventTarget | null }) {
      if (event.target === dialogRef) props.onClose?.();
    },
  });

  onMount(() => {
    dialogRef?.addEventListener('close', state.notifyClose);
    state.sync();
  });

  onUnMount(() => {
    dialogRef?.removeEventListener('close', state.notifyClose);
  });

  onUpdate(() => {
    state.sync();
  }, [props.open]);

  return (
    /* 非モーダルでは dialog を出さず、子をその場所に描く。広い画面で常時表示にするときに使う。 */
    <Show when={props.modal === false} else={
      <dialog ref={dialogRef!} class={styles.root}
        data-placement={props.placement ?? 'left'}
        aria-label={props.label}
        onPointerDown={(event) => state.dismiss(event)}
      >
        <div class={styles.panel}>{props.children}</div>
      </dialog>
    }>
      {props.children}
    </Show>
  );
}
