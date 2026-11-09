import { For, Show, onMount, onUnMount, onUpdate, useRef, useStore } from '@builder.io/mitosis';
import XIcon from '../XIcon/XIcon.lite';
import { TOAST_DEFAULT_LIMIT, announceToasts, connectToaster, emptyAnnouncement, emptyToasts, setToastLimit, toast, toastPrefix } from './toast';
import type { ToastClickEvent, ToastItem } from './toast';
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
    announcement: emptyAnnouncement(),
    prefix(variant: ToastItem['variant']) {
      return toastPrefix(variant);
    },
    actionHref(item: ToastItem) {
      return item.action?.href;
    },
    actionLabel(item: ToastItem) {
      return item.action?.label;
    },
    act(item: ToastItem, event: ToastClickEvent) {
      item.action?.onClick?.(event);
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
      state.announcement = announceToasts(state.announcement, next);
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
      {/* 読み上げ用の領域は通知の前から置いておく（出現と同時に挿入された領域は読まれないことがある）。通知の本文はここに入れ、見えるトーストには role を付けない。 */}
      <div class={styles.visuallyHidden} role="status" aria-atomic="true">{state.announcement.status}</div>
      <div class={styles.visuallyHidden} role="alert" aria-atomic="true">{state.announcement.alert}</div>
      <For each={state.items}>
        {(item) => (
          <div key={item.id} class={styles.toast} data-variant={item.variant}>
            <div class={styles.body}>
              <span class={styles.prefix}>{state.prefix(item.variant)}</span>
              <span class={styles.message}>{item.message}</span>
            </div>
            <Show when={state.actionHref(item)}>
              <a class={styles.link} href={state.actionHref(item)} onClick={(event) => state.act(item, event)}>{state.actionLabel(item)}</a>
            </Show>
            <Show when={item.action && !state.actionHref(item)}>
              <button type="button" class={controls.button} data-variant="tertiary" onClick={(event) => state.act(item, event)}>
                <span class={controls.surface}><span class={controls.label}>{state.actionLabel(item)}</span></span>
              </button>
            </Show>
            <button type="button" class={controls.button} data-variant="ghost" data-icon-only="true"
              aria-label={`${props.dismissLabel ?? '閉じる'}: ${item.message}`} onClick={() => state.dismiss(item.id)}>
              <span class={controls.surface}><XIcon /></span>
            </button>
          </div>
        )}
      </For>
    </section>
  );
}
