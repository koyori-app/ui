import { Show, useStore } from '@builder.io/mitosis';
import XIcon from '../XIcon/XIcon.lite';
import { alertPrefix, alertRole } from './alert';
import type { AlertVariant } from './alert';
import controls from '../shared/control.module.css';
import styles from './alert.module.css';

export interface AlertProps {
  message: string;
  /** 既定 'danger'。 */
  variant?: AlertVariant;
  /** 本文の前に表示・読み上げする接頭辞。既定は variant ごとの言葉。空文字は既定に戻る。 */
  prefix?: string;
  onRetry?: () => void;
  /** 既定 '再試行'。 */
  retryLabel?: string;
  onDismiss?: () => void;
  /** 閉じるボタンの読み上げ名。既定 '閉じる'。 */
  dismissLabel?: string;
}

export default function Alert(props: AlertProps) {
  const state = useStore({
    /* getter 同士を参照すると Vue の生成物で ref のまま渡るため、どちらも props から計算する。 */
    get prefix() {
      return alertPrefix(props.variant, props.prefix);
    },
    get role() {
      return alertRole(props.variant);
    },
  });

  return (
    <div class={styles.root} data-variant={props.variant ?? 'danger'}>
      {/* ライブ領域には文字だけを入れ、ボタンの状態変化が読み上げに混ざらないようにする。 */}
      <div class={styles.body} role={state.role} aria-atomic="true">
        <span class={styles.prefix}>{state.prefix}</span>
        <span class={styles.message}>{props.message}</span>
      </div>
      <Show when={props.onRetry}>
        <button type="button" class={controls.button} data-variant="tertiary" onClick={() => props.onRetry?.()}>
          <span class={controls.surface}>{props.retryLabel ?? '再試行'}</span>
        </button>
      </Show>
      <Show when={props.onDismiss}>
        <button type="button" class={controls.button} data-variant="ghost" data-icon-only="true"
          aria-label={props.dismissLabel ?? '閉じる'} onClick={() => props.onDismiss?.()}>
          <span class={controls.surface}><XIcon /></span>
        </button>
      </Show>
    </div>
  );
}
