import { For, Show, onMount, onUnMount, onUpdate, useRef, useStore } from '@builder.io/mitosis';
import XIcon from '../XIcon/XIcon.lite';
import { TOAST_DEFAULT_LIMIT, connectToaster, emptyToasts, setToastLimit, toast, toastPrefix, toastRole } from './toast';
import type { ToastItem } from './toast';
import controls from '../shared/control.module.css';
import styles from './toaster.module.css';

export interface ToasterProps {
  /** 同時に表示する上限。超えたら古いものから消す。既定 3。 */
  limit?: number;
  /** 表示領域の読み上げ名。既定 '通知'。 */
  label?: string;
  /** 閉じるボタンの読み上げ名。既定 '閉じる'。 */
  dismissLabel?: string;
}

/* アプリに 1 つだけ置く。トーストは toast.success() などで出す（toast.ts のストアを購読して描画する）。 */
export default function Toaster(props: ToasterProps) {
  const regionRef = useRef<HTMLElement | null>(null);
  let cleanupRef = useRef<(() => void) | null>(null);
  const state = useStore({
    items: emptyToasts(),
    role(variant: ToastItem['variant']) {
      return toastRole(variant);
    },
    prefix(variant: ToastItem['variant']) {
      return toastPrefix(variant);
    },
    actionHref(item: ToastItem) {
      return item.action?.href;
    },
    actionLabel(item: ToastItem) {
      return item.action?.label;
    },
    act(item: ToastItem) {
      item.action?.onClick?.();
      toast.dismiss(item.id);
    },
    dismiss(id: number) {
      toast.dismiss(id);
    },
  });

  onMount(() => {
    setToastLimit(props.limit ?? TOAST_DEFAULT_LIMIT);
    cleanupRef = connectToaster(regionRef, (next) => {
      state.items = next;
    }) ?? null;
  });

  onUpdate(() => {
    setToastLimit(props.limit ?? TOAST_DEFAULT_LIMIT);
  }, [props.limit]);

  onUnMount(() => {
    cleanupRef?.();
  });

  return (
    <section ref={regionRef!} class={styles.region} aria-label={props.label ?? '通知'}>
      <For each={state.items}>
        {(item) => (
          <div key={item.id} class={styles.toast} data-variant={item.variant}>
            {/* Alert と同じく、ライブ領域には文字だけを入れ、ボタンの出入りを読み上げに混ぜない。 */}
            <div class={styles.body} role={state.role(item.variant)} aria-atomic="true">
              <span class={styles.prefix}>{state.prefix(item.variant)}</span>
              <span class={styles.message}>{item.message}</span>
            </div>
            <Show when={state.actionHref(item)}>
              <a class={styles.link} href={state.actionHref(item)} onClick={() => state.dismiss(item.id)}>{state.actionLabel(item)}</a>
            </Show>
            <Show when={item.action && !state.actionHref(item)}>
              <button type="button" class={controls.button} data-variant="tertiary" onClick={() => state.act(item)}>
                <span class={controls.surface}><span class={controls.label}>{state.actionLabel(item)}</span></span>
              </button>
            </Show>
            <button type="button" class={controls.button} data-variant="ghost" data-icon-only="true"
              aria-label={props.dismissLabel ?? '閉じる'} onClick={() => state.dismiss(item.id)}>
              <span class={controls.surface}><XIcon /></span>
            </button>
          </div>
        )}
      </For>
    </section>
  );
}
