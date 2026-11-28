import { contextMenuPosition } from '../ContextMenu/context-menu';

/** タッチの長押しで onMenu を呼ぶまで（ms）。 */
export const LONG_PRESS_DELAY = 500;
/** 長押しの途中で指がこれを超えて動いたら（px）、スクロールとみなして取り消す。ちょうどは続く。 */
export const LONG_PRESS_TOLERANCE = 10;

/** 長押しを始めるのはタッチだけ。マウスとペンは右クリック（contextmenu）で開く。 */
export function startsLongPress(pointerType: string) {
  return pointerType === 'touch';
}

export function longPressMoved(start: { x: number; y: number }, point: { x: number; y: number }) {
  return Math.hypot(point.x - start.x, point.y - start.y) > LONG_PRESS_TOLERANCE;
}

export function longPressElapsed(start: number, now: number) {
  return now - start >= LONG_PRESS_DELAY;
}

/** 長押しの判定。時刻と座標だけを受け取り、DOM には触らない。 */
export function longPressTracker() {
  let press: { x: number; y: number; time: number } | null = null;
  let touching = false;
  let fired = false;
  return {
    /** 押した。長押しを数え始めたら true。前の長押しの「click を捨てる」は持ち越さない。 */
    down(pointerType: string, x: number, y: number, time: number) {
      fired = false;
      touching = startsLongPress(pointerType);
      press = touching ? { x, y, time } : null;
      return press !== null;
    },
    move(x: number, y: number) {
      if (press && longPressMoved(press, { x, y })) press = null;
    },
    /** 指が離れた・取り消された。 */
    up() {
      press = null;
      touching = false;
    },
    /** キーボードの操作など。捨てる予定の click も取り消す。 */
    reset() {
      press = null;
      touching = false;
      fired = false;
    },
    /** 時刻 now で長押しになったか。なったら 1 回だけ true を返す。 */
    tick(now: number) {
      if (!press || !longPressElapsed(press.time, now)) return false;
      press = null;
      fired = true;
      return true;
    },
    /** click を捨てるか。長押しのあとの 1 回だけ true。 */
    click() {
      const swallow = fired;
      fired = false;
      return swallow;
    },
    /** タッチで押している間か長押しの直後。Android がこの間に出す contextmenu は止める。 */
    get touching() {
      return touching || fired;
    },
  };
}

export interface IconRailItemHandlers {
  onClick?: () => void;
  onMenu?: (position: { x: number; y: number }) => void;
}

/** 押下・右クリック・長押しを button に配線する。onMenu が無ければ contextmenu も長押しも触らない。 */
export function connectIconRailItem(button: HTMLElement | null, handlers: IconRailItemHandlers) {
  if (!button) return null;
  let current = handlers;
  const tracker = longPressTracker();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  const corner = () => {
    const bounds = button.getBoundingClientRect();
    return { x: bounds.left, y: bounds.bottom };
  };
  const down = (event: PointerEvent) => {
    stop();
    if (!current.onMenu || !event.isPrimary) {
      tracker.reset();
      return;
    }
    const start = performance.now();
    if (!tracker.down(event.pointerType, event.clientX, event.clientY, start)) return;
    timer = setTimeout(() => {
      timer = undefined;
      // 時計の丸めで 500ms にわずかに届かない値になっても、待ち終えたので長押しとして数える。
      const now = Math.max(performance.now(), start + LONG_PRESS_DELAY);
      if (tracker.tick(now) && current.onMenu && !button.matches(':disabled')) current.onMenu(corner());
    }, LONG_PRESS_DELAY);
  };
  const move = (event: PointerEvent) => {
    if (!event.isPrimary) return;
    tracker.move(event.clientX, event.clientY);
  };
  const up = () => {
    stop();
    tracker.up();
  };
  const click = (event: MouseEvent) => {
    if (tracker.click()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    current.onClick?.();
  };
  const contextmenu = (event: MouseEvent) => {
    if (!current.onMenu || button.matches(':disabled')) return;
    event.preventDefault();
    // 長押しは自前の時計で開く。Android が長押しで出す contextmenu で二重に開かない。
    if (tracker.touching) return;
    current.onMenu(contextMenuPosition(event));
  };
  // 長押しのあとは touchend を止め、続く互換のマウスイベントと click を出させない。
  // mousedown がフォーカスを項目へ戻すと、開いたメニューが focusout で閉じるため。
  const touchend = (event: TouchEvent) => {
    if (tracker.touching && event.cancelable) event.preventDefault();
  };
  const keydown = () => tracker.reset();
  button.addEventListener('pointerdown', down);
  button.addEventListener('pointermove', move);
  button.addEventListener('pointerup', up);
  button.addEventListener('pointercancel', up);
  button.addEventListener('click', click);
  button.addEventListener('contextmenu', contextmenu);
  button.addEventListener('touchend', touchend, { passive: false });
  button.addEventListener('keydown', keydown);
  return {
    configure(next: IconRailItemHandlers) {
      current = next;
      if (!next.onMenu) {
        stop();
        tracker.reset();
      }
    },
    destroy() {
      stop();
      button.removeEventListener('pointerdown', down);
      button.removeEventListener('pointermove', move);
      button.removeEventListener('pointerup', up);
      button.removeEventListener('pointercancel', up);
      button.removeEventListener('click', click);
      button.removeEventListener('contextmenu', contextmenu);
      button.removeEventListener('touchend', touchend);
      button.removeEventListener('keydown', keydown);
    },
  };
}
