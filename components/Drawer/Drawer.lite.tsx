import { Show, useDefaultProps, useRef, useStore, onMount, onUpdate } from '@builder.io/mitosis';
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
   * Called on Escape and on a backdrop click. Closing itself is up to the app:
   * the drawer stays open until open turns false.
   * The argument is unused; it exists because Mitosis wraps callbacks passed between components.
   */
  onClose?: (event?: unknown) => void;
  children?: any;
}

export default function Drawer(props: DrawerProps) {
  // Preserve the modal default in Vue, where an omitted boolean prop would be false.
  useDefaultProps({ modal: true });
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const state = useStore({
    forcedCloses: 0,
    sync() {
      syncDialog(dialogRef, props.open && props.modal !== false);
    },
    /* Escape で閉じるのはアプリの仕事。ここでは知らせるだけで、open が false になるまで開けておく。 */
    /* React の onCancel は合成イベントで祖先へ伝わるため、入れ子の子が出したものは無視する。 */
    cancel(event: { target: EventTarget | null; cancelable: boolean; preventDefault: Function }) {
      if (event.target !== dialogRef) return;
      /* 止められない cancel（Chromium で操作を挟まずに続けた Escape）はそのまま閉じるため、close で知らせる。 */
      if (!event.cancelable) return;
      event.preventDefault();
      props.onClose?.();
    },
    /* ブラウザーが閉じたのにアプリは開いているつもりなら知らせる。アプリが close() させた後や、すぐ開き直した後は何もしない。 */
    closed(event: { target: EventTarget | null }) {
      if (event.target !== dialogRef || !(props.open && props.modal !== false) || dialogRef?.open) return;
      props.onClose?.();
      /* open が変わらなくても同期を走らせ、open が true のままなら開き直す。最新の props で判定するため onUpdate に任せる。 */
      state.forcedCloses = state.forcedCloses + 1;
    },
    /* panel が内側を覆うため、dialog 自身が target なら背景を押している。 */
    dismiss(event: { target: EventTarget | null }) {
      if (event.target === dialogRef) props.onClose?.();
    },
  });

  onMount(() => {
    state.sync();
  });

  onUpdate(() => {
    state.sync();
  }, [props.open, props.modal, state.forcedCloses]);

  return (
    <div class={styles.host}>
      {/* 非モーダルでは中身をその場所に描く。dialog は残したまま閉じておき、切り替えても同じ要素を使う。 */}
      <Show when={props.modal === false}>{props.children}</Show>
      <dialog ref={dialogRef!} class={styles.root}
        data-placement={props.placement ?? 'left'}
        aria-label={props.label}
        onCancel={(event) => state.cancel(event)}
        onClose={(event) => state.closed(event)}
        onPointerDown={(event) => state.dismiss(event)}
      >
        <div class={styles.panel}>
          <Show when={props.modal !== false}>{props.children}</Show>
        </div>
      </dialog>
    </div>
  );
}
