import { Show, Slot, useRef, useStore, onMount, onUnMount, onUpdate } from '@builder.io/mitosis';
import { syncDialog } from './dialog';
import styles from './dialog.module.css';

export interface DialogProps {
  /** Controlled by the app. Set it to false from onClose. */
  open: boolean;
  title: string;
  description?: string;
  /**
   * Called on Escape and on a backdrop click. Closing itself is up to the app.
   * The argument is unused; it exists because Mitosis wraps callbacks passed between components.
   */
  onClose?: (event?: unknown) => void;
  children?: any;
  /** React: rendered buttons. Vue: use the actions slot. */
  actions?: any;
}

export default function Dialog(props: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const state = useStore({
    id: '',
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

  /* close は Mitosis の JSX 属性にないため、Dropdown と同じくリスナーで受ける。 */
  onMount(() => {
    state.id = `koyori-dialog-${Math.random().toString(36).slice(2)}`;
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
    <dialog ref={dialogRef!} class={styles.root}
      aria-labelledby={state.id ? `${state.id}-title` : undefined}
      aria-describedby={props.description && state.id ? `${state.id}-description` : undefined}
      onPointerDown={(event) => state.dismiss(event)}
    >
      <div class={styles.panel}>
        <div class={styles.header}>
          <h2 id={state.id ? `${state.id}-title` : undefined} class={styles.title}>{props.title}</h2>
          <Show when={props.description}>
            <p id={state.id ? `${state.id}-description` : undefined} class={styles.description}>{props.description}</p>
          </Show>
        </div>
        <div class={styles.body}>{props.children}</div>
        <div class={styles.actions}><Slot name="actions" /></div>
      </div>
    </dialog>
  );
}
