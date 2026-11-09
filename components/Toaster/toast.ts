// トーストのストアと命令的 API。Mitosis の元ソースはモジュール内状態を持てないため、素の .ts に置く。
// モジュール読み込み時に window / document へ触れない（SSR 安全）。

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  /** 指定するとリンク（<a>）。省略すると操作ボタン。 */
  href?: string;
  onClick?: () => void;
}

export interface ToastOptions {
  action?: ToastAction;
  /** 自動で消えるまでの ms。0 は手動で閉じるまで残す。既定は 5000、action 付きは 8000。 */
  duration?: number;
}

export interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: string;
  action?: ToastAction;
  duration: number;
  /** 残り時間。一時停止で減らし、再開で使う。 */
  remaining: number;
  /** 動いていなければ null。 */
  startedAt: number | null;
  timer?: ReturnType<typeof setTimeout>;
}

export const TOAST_DEFAULT_DURATION = 5000;
export const TOAST_ACTION_DURATION = 8000;
export const TOAST_DEFAULT_LIMIT = 3;

let items: ToastItem[] = [];
let nextId = 1;
let limit = TOAST_DEFAULT_LIMIT;
let paused = false;
const listeners = new Set<(items: ToastItem[]) => void>();

// 毎回新しい配列を渡す（React が変化に気づけるように）。
const emit = () => {
  const snapshot = items.slice();
  listeners.forEach((listener) => listener(snapshot));
};

function stop(item: ToastItem) {
  clearTimeout(item.timer);
  item.timer = undefined;
  if (item.startedAt !== null) item.remaining -= performance.now() - item.startedAt;
  item.startedAt = null;
}

function start(item: ToastItem) {
  if (paused || item.duration <= 0 || item.startedAt !== null) return;
  item.startedAt = performance.now();
  item.timer = setTimeout(() => toast.dismiss(item.id), Math.max(item.remaining, 0));
}

function trim() {
  while (items.length > limit) stop(items.shift()!);
}

function push(variant: ToastVariant, message: string, options: ToastOptions = {}) {
  const duration = options.duration ?? (options.action ? TOAST_ACTION_DURATION : TOAST_DEFAULT_DURATION);
  const item: ToastItem = { id: nextId++, variant, message, action: options.action, duration, remaining: duration, startedAt: null };
  items.push(item);
  trim();
  start(item);
  emit();
  return item.id;
}

export const toast = {
  success: (message: string, options?: ToastOptions) => push('success', message, options),
  error: (message: string, options?: ToastOptions) => push('error', message, options),
  info: (message: string, options?: ToastOptions) => push('info', message, options),
  /** id を省略すると全部閉じる。 */
  dismiss(id?: number) {
    const closing = items.filter((item) => id === undefined || item.id === id);
    if (!closing.length) return;
    closing.forEach(stop);
    items = items.filter((item) => !closing.includes(item));
    emit();
  },
};

/** Toaster の初期状態。Mitosis が `[] as ToastItem[]` の型を落として never[] になるため、型付きの空配列を関数で返す。 */
export function emptyToasts(): ToastItem[] {
  return [];
}

/** 登録時に現在の一覧を渡す。解除関数を返す。 */
export function subscribeToasts(listener: (items: ToastItem[]) => void) {
  listeners.add(listener);
  listener(items.slice());
  return () => { listeners.delete(listener); };
}

/** 同時に表示する上限。非有限・1 未満は 1。超過分は古いものから捨てる。 */
export function setToastLimit(next: number) {
  limit = Number.isFinite(next) && next >= 1 ? Math.floor(next) : 1;
  const before = items.length;
  trim();
  if (items.length !== before) emit();
}

export function pauseToasts() {
  paused = true;
  items.forEach(stop);
}

export function resumeToasts() {
  paused = false;
  items.forEach(start);
}

/** エラーだけ割り込んで読ませ、完了と案内は進行中の読み上げを待つ。 */
export function toastRole(variant: ToastVariant): 'status' | 'alert' {
  return variant === 'error' ? 'alert' : 'status';
}

/** 色だけに意味を頼らないための接頭辞（Alert と同じ言葉）。 */
export function toastPrefix(variant: ToastVariant) {
  return variant === 'success' ? '完了' : variant === 'error' ? 'エラー' : 'お知らせ';
}

/** Toaster 1 つ分。購読・top layer・ホバー/フォーカス中の停止を束ね、破棄関数を返す。ref が null（SSR）なら何もしない。 */
export function connectToaster(region: HTMLElement | null, listener: (items: ToastItem[]) => void) {
  if (!region) return;
  // Dialog（top layer）の裏に隠れないよう、対応ブラウザーでは popover="manual" で常時開く。
  if (typeof region.showPopover === 'function') {
    region.popover = 'manual';
    if (!region.matches(':popover-open')) region.showPopover();
  }
  const unsubscribe = subscribeToasts(listener);
  // マウスが離れてもフォーカスが中にあれば止めたまま。フォーカスが外へ出てもホバー中なら止めたまま。
  const leave = (event: FocusEvent | MouseEvent) => {
    if (region.matches(':hover') || region.contains(event.relatedTarget as Node | null)) return;
    resumeToasts();
  };
  region.addEventListener('mouseenter', pauseToasts);
  region.addEventListener('focusin', pauseToasts);
  region.addEventListener('mouseleave', leave);
  region.addEventListener('focusout', leave);
  return () => {
    unsubscribe();
    region.removeEventListener('mouseenter', pauseToasts);
    region.removeEventListener('focusin', pauseToasts);
    region.removeEventListener('mouseleave', leave);
    region.removeEventListener('focusout', leave);
    if (region.matches(':popover-open')) region.hidePopover();
    resumeToasts();
  };
}
