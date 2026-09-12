import Dialog from '../Dialog/Dialog.lite';
import controls from '../shared/control.module.css';
import styles from '../Dialog/dialog.module.css';

export interface ConfirmDialogProps {
  /** Controlled by the app. Set it to false from onCancel and onConfirm. */
  open: boolean;
  title: string;
  message: string;
  /** Use wording that tells what happens, such as 削除する. */
  confirmLabel: string;
  cancelLabel?: string;
  /** Shows the confirm button in the danger colour. */
  destructive?: boolean;
  onConfirm?: () => void;
  /** Called by the cancel button, Escape and a backdrop click. */
  onCancel?: () => void;
}

/* Picker のトリガーと同じく、共通のボタン用スタイルを直接使う。Button を挟むと
   Mitosis がコールバックを (event) => ... に包み、() => void の props と合わなくなる。 */
export default function ConfirmDialog(props: ConfirmDialogProps) {
  return (
    <Dialog open={props.open} title={props.title} description={props.message} onClose={() => props.onCancel?.()}>
      {/* 取り消せない操作なので、キャンセルを先頭に置いて初期フォーカスを受ける。 */}
      <div class={styles.actions}>
        <button type="button" class={controls.button} data-variant="tertiary"
          onClick={() => props.onCancel?.()}
        >
          <span class={controls.surface}>{props.cancelLabel ?? 'キャンセル'}</span>
        </button>
        <button type="button" class={controls.button} data-variant={props.destructive ? 'danger' : 'primary'}
          onClick={() => props.onConfirm?.()}
        >
          <span class={controls.surface}>{props.confirmLabel}</span>
        </button>
      </div>
    </Dialog>
  );
}
