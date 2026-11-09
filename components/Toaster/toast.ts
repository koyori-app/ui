// トーストのストアと命令的 API。Mitosis の元ソースはモジュール内状態を持てないため、素の .ts に置く。
// モジュール読み込み時に window / document へ触れない（SSR 安全）。

export type ToastVariant = 'success' | 'error' | 'info';

/** action.onClick に渡るイベント。Vue ではネイティブの MouseEvent、React では合成イベントなので、共通して使える部分だけを型にする。 */
export type ToastClickEvent = Pick<MouseEvent, 'preventDefault' | 'defaultPrevented' | 'button' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>;

export interface ToastAction {
  label: string;
  /** 指定するとリンク（<a>）。省略すると操作ボタン。 */
  href?: string;
  /** href 付きのリンクでも呼ぶ。event.preventDefault() で遷移を止め、ルーターで移動できる。呼んだあとトーストは閉じる。 */
  onClick?: (event: ToastClickEvent) => void;
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

/** 読み上げ領域（status・alert）の中身。通知が出たときに入り、その通知が消えたら空になる。 */
export interface ToastAnnouncement {
  status: string;
  alert: string;
  /** 各領域に入れた通知の番号。無ければ 0。 */
  statusId: number;
  alertId: number;
  /** ここまでに見た最大の番号。新しい通知かどうかの判定に使う。 */
  seen: number;
}

export function emptyAnnouncement(): ToastAnnouncement {
  return { status: '', alert: '', statusId: 0, alertId: 0, seen: 0 };
}

/** 一覧の更新を読み上げ領域に反映する。エラーは alert、成功・情報は status。消えた通知の分は空にし、残った通知は読み直さない。 */
export function announceToasts(previous: ToastAnnouncement, items: ToastItem[]): ToastAnnouncement {
  const next = { ...previous };
  if (!items.some((item) => item.id === next.statusId)) { next.status = ''; next.statusId = 0; }
  if (!items.some((item) => item.id === next.alertId)) { next.alert = ''; next.alertId = 0; }
  for (const item of items) {
    if (item.id <= previous.seen) continue;
    const text = `${toastPrefix(item.variant)} ${item.message}`;
    if (toastRole(item.variant) === 'alert') { next.alert = text; next.alertId = item.id; } else { next.status = text; next.statusId = item.id; }
    next.seen = item.id;
  }
  return next;
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
  // 止めるか再開するかは領域の実状態で決める。マウスとフォーカスのどちらかが残っていれば止めたまま。
  const sync = () => {
    if (region.matches(':hover') || region.matches(':focus-within')) pauseToasts();
    else resumeToasts();
  };
  // 離れた・フォーカスが外れた直後はまだ状態が更新されていないことがあるため、次のタスクで判定する。
  let pending: ReturnType<typeof setTimeout> | undefined;
  const settle = () => {
    clearTimeout(pending);
    pending = setTimeout(sync);
  };
  // フォーカスを持つ要素が消えても focusout が出ないブラウザー（Firefox）がある。描画後の DOM の変化でも判定する。
  const observer = new MutationObserver(settle);
  observer.observe(region, { childList: true, subtree: true });
  region.addEventListener('mouseenter', sync);
  region.addEventListener('focusin', sync);
  region.addEventListener('mouseleave', settle);
  region.addEventListener('focusout', settle);
  return () => {
    unsubscribe();
    clearTimeout(pending);
    observer.disconnect();
    region.removeEventListener('mouseenter', sync);
    region.removeEventListener('focusin', sync);
    region.removeEventListener('mouseleave', settle);
    region.removeEventListener('focusout', settle);
    if (region.matches(':popover-open')) region.hidePopover();
    resumeToasts();
  };
}
