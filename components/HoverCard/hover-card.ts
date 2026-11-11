import { menuLengths, resetMenu } from '../shared/menu';

export interface HoverCardOptions {
  container: HTMLElement | null;
  selector?: string;
  openDelay?: number;
  closeDelay?: number;
  disabled?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, trigger: HTMLElement) => void;
}

const DEFAULT_SELECTOR = '[data-hover-card-trigger]';
// ポインターが横切っただけで開かないように待つ。開くとプロフィールを取りに行く利用側もあるため、フォーカスでも同じだけ待つ。
const OPEN_DELAY_MS = 400;
// 起点とカードの間の隙間を渡る時間。
const CLOSE_DELAY_MS = 150;
const TABBABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

const rendered = (element: HTMLElement) =>
  typeof element.checkVisibility === 'function' ? element.checkVisibility() : element.getClientRects().length > 0;
const tabbables = (scope: ParentNode) => Array.from(scope.querySelectorAll<HTMLElement>(TABBABLE)).filter(rendered);
const plainTab = (event: KeyboardEvent) => event.key === 'Tab' && !event.altKey && !event.ctrlKey && !event.metaKey && !event.isComposing;

/** 起点（子、または container の中でセレクターに合う要素）に載せたポインター・フォーカスでカードを開閉する。DOM だけを触る。 */
export function connectHoverCard(root: HTMLElement | null, panel: HTMLElement | null, options: HoverCardOptions) {
  if (!root || !panel) return;
  const card = panel;
  const wrapper = root;
  let current = options;
  let host: HTMLElement | null = null;
  let trigger: HTMLElement | null = null;
  let candidate: HTMLElement | null = null;
  let dismissed: HTMLElement | null = null;
  let pointerOnTrigger = false;
  let pointerOnCard = false;
  let focusInside = false;
  let openTimer: ReturnType<typeof setTimeout> | undefined;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let frame: number | undefined;
  let destroyed = false;
  card.id ||= `koyori-hover-card-${Math.random().toString(36).slice(2, 10)}`;
  const topLayer = typeof card.showPopover === 'function';
  if (topLayer) card.popover = 'manual';

  // 起点の解決。カードの中・container の外・セレクターに合わない要素は起点にしない。
  const resolve = (target: EventTarget | null): HTMLElement | null => {
    if (!(target instanceof Element) || card.contains(target)) return null;
    const container = current.container;
    if (container) {
      const element = target.closest<HTMLElement>(current.selector || DEFAULT_SELECTOR);
      return element && element !== container && container.contains(element) ? element : null;
    }
    const element = wrapper.firstElementChild;
    return element instanceof HTMLElement && element !== card && element.contains(target) ? element : null;
  };
  const addDetails = (element: HTMLElement) => {
    const ids = (element.getAttribute('aria-details') ?? '').split(/\s+/).filter(Boolean);
    if (!ids.includes(card.id)) element.setAttribute('aria-details', [...ids, card.id].join(' '));
  };
  const removeDetails = (element: HTMLElement) => {
    const ids = (element.getAttribute('aria-details') ?? '').split(/\s+/).filter(id => id && id !== card.id);
    if (ids.length) element.setAttribute('aria-details', ids.join(' '));
    else element.removeAttribute('aria-details');
  };
  const cancelOpen = () => {
    clearTimeout(openTimer);
    openTimer = undefined;
    candidate = null;
  };

  const position = () => {
    if (card.hidden || !trigger) return;
    if (!trigger.isConnected) { close(); return; }
    const { gap, margin } = menuLengths(card);
    const bounds = trigger.getBoundingClientRect();
    const below = Math.max(0, window.innerHeight - bounds.bottom - gap - margin);
    const above = Math.max(0, bounds.top - gap - margin);
    const natural = card.scrollHeight + card.offsetHeight - card.clientHeight;
    const side = natural > below && above > below ? 'top' : 'bottom';
    card.style.setProperty('--hover-card-available-height', `${side === 'top' ? above : below}px`);
    card.dataset.side = side;
    card.style.left = `${Math.max(margin, Math.min(bounds.left, window.innerWidth - margin - card.offsetWidth))}px`;
    card.style.top = `${side === 'top' ? bounds.top - gap - card.offsetHeight : bounds.bottom + gap}px`;
  };
  const resize = new ResizeObserver(() => position());
  resize.observe(card);

  const open = (element: HTMLElement) => {
    if (element === trigger || destroyed) return;
    if (trigger) close();
    cancelOpen();
    clearTimeout(closeTimer);
    trigger = element;
    addDetails(element);
    card.hidden = false;
    if (topLayer) {
      card.popover = 'manual';
      if (!card.matches(':popover-open')) card.showPopover();
    }
    resize.observe(element);
    current.onOpenChange?.(true, element);
    // 利用側が中身を差し替える描画を待ってから測る。測るまでは CSS が隠している。
    cancelAnimationFrame(frame ?? 0);
    frame = requestAnimationFrame(position);
  };
  const close = (notify = true) => {
    cancelOpen();
    clearTimeout(closeTimer);
    cancelAnimationFrame(frame ?? 0);
    pointerOnCard = false;
    const previous = trigger;
    if (previous) {
      removeDetails(previous);
      resize.unobserve(previous);
    }
    resetMenu(card, null);
    card.style.removeProperty('--hover-card-available-height');
    card.hidden = true;
    trigger = null;
    if (previous && notify) current.onOpenChange?.(false, previous);
  };
  const scheduleClose = () => {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      if (!pointerOnTrigger && !pointerOnCard && !focusInside) { dismissed = null; close(); }
    }, current.closeDelay ?? CLOSE_DELAY_MS);
  };
  const scheduleOpen = (element: HTMLElement) => {
    if (candidate === element && openTimer !== undefined) return;
    cancelOpen();
    candidate = element;
    openTimer = setTimeout(() => {
      const next = candidate;
      cancelOpen();
      if (next && !current.disabled && resolve(next)) open(next);
    }, current.openDelay ?? OPEN_DELAY_MS);
  };
  // 起点・カードのどちらからも離れたとき。
  const released = () => {
    focusInside = false;
    if (pointerOnTrigger) return;
    cancelOpen();
    if (!pointerOnCard) { dismissed = null; close(); }
  };

  const pointerOver = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || current.disabled) return;
    const element = resolve(event.target);
    if (!element) return;
    pointerOnTrigger = true;
    if (element === trigger) clearTimeout(closeTimer);
    else if (dismissed !== element) scheduleOpen(element);
  };
  const pointerOut = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    const element = resolve(event.target);
    if (!element) return;
    if (event.relatedTarget instanceof Node && element.contains(event.relatedTarget)) return;
    pointerOnTrigger = false;
    if (candidate === element && !focusInside) cancelOpen();
    if (element === trigger) scheduleClose();
    if (dismissed === element && !focusInside) dismissed = null;
  };
  const cardEnter = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    pointerOnCard = true;
    clearTimeout(closeTimer);
  };
  const cardLeave = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    pointerOnCard = false;
    scheduleClose();
  };
  const focusIn = (event: FocusEvent) => {
    const element = resolve(event.target);
    // タップやクリックで入ったフォーカスでは開かない。
    if (!element || current.disabled || !(event.target as Element).matches(':focus-visible')) return;
    focusInside = true;
    if (element === trigger) clearTimeout(closeTimer);
    else if (dismissed !== element) scheduleOpen(element);
  };
  const focusOut = (event: FocusEvent) => {
    const element = resolve(event.target);
    if (!element) return;
    const next = event.relatedTarget;
    if (next instanceof Node && (element.contains(next) || card.contains(next))) return;
    released();
  };
  const cardFocusIn = () => {
    focusInside = true;
    clearTimeout(closeTimer);
  };
  const cardFocusOut = (event: FocusEvent) => {
    const next = event.relatedTarget;
    if (next instanceof Node && (card.contains(next) || trigger?.contains(next))) return;
    released();
  };
  // top layer のカードの DOM は本文の外にあり、文書順の Tab ではカードに入れない。起点 → カード → 起点の次、の順を作る。
  const triggerKey = (event: KeyboardEvent) => {
    if (!plainTab(event) || event.shiftKey || !trigger || card.hidden || event.target !== trigger) return;
    const first = tabbables(card)[0];
    if (!first) return;
    event.preventDefault();
    first.focus({ preventScroll: true });
  };
  const cardKey = (event: KeyboardEvent) => {
    if (!plainTab(event) || !trigger) return;
    const items = tabbables(card);
    const index = items.indexOf(event.target as HTMLElement);
    if (event.shiftKey) {
      if (index !== 0) return;
      event.preventDefault();
      trigger.focus({ preventScroll: true });
      return;
    }
    if (index !== items.length - 1) return;
    const origin = trigger;
    const scope: ParentNode = origin.closest('dialog[open]') ?? document;
    const next = tabbables(scope).find(element => !card.contains(element) && !origin.contains(element) && !element.closest('[inert]')
      && origin.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING);
    if (next) {
      event.preventDefault();
      next.focus();
    } else origin.focus({ preventScroll: true });
    // 閉じてから既定の Tab に任せる（開いたままだとカードへ戻ってしまう）。
    close();
  };
  const escape = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.isComposing || event.keyCode === 229) return;
    if (card.hidden || !trigger) {
      // 開く待ちだけを取り消す。外の Dialog などには伝える。
      if (candidate) dismissed = candidate;
      cancelOpen();
      return;
    }
    const origin = trigger;
    if (card.contains(document.activeElement)) origin.focus({ preventScroll: true });
    dismissed = origin;
    close();
    // 閉じるのはカードだけ。外の Dialog やメニューは閉じない。
    event.stopPropagation();
    event.preventDefault();
  };
  // v-html の描き直しなどで起点が外れたら閉じる。
  const mutations = new MutationObserver(() => {
    if (candidate && !candidate.isConnected) cancelOpen();
    if (trigger && (!trigger.isConnected || !host?.contains(trigger))) {
      pointerOnTrigger = false;
      focusInside = false;
      close();
    }
  });
  const attach = () => {
    host = current.container ?? wrapper;
    host.addEventListener('pointerover', pointerOver);
    host.addEventListener('pointerout', pointerOut);
    host.addEventListener('focusin', focusIn);
    host.addEventListener('focusout', focusOut);
    host.addEventListener('keydown', triggerKey);
    mutations.observe(host, { childList: true, subtree: true });
  };
  const detach = () => {
    mutations.disconnect();
    host?.removeEventListener('pointerover', pointerOver);
    host?.removeEventListener('pointerout', pointerOut);
    host?.removeEventListener('focusin', focusIn);
    host?.removeEventListener('focusout', focusOut);
    host?.removeEventListener('keydown', triggerKey);
    host = null;
  };

  attach();
  card.addEventListener('pointerenter', cardEnter);
  card.addEventListener('pointerleave', cardLeave);
  card.addEventListener('focusin', cardFocusIn);
  card.addEventListener('focusout', cardFocusOut);
  card.addEventListener('keydown', cardKey);
  document.addEventListener('keydown', escape, true);
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, true);
  const first = wrapper.firstElementChild;
  if (current.defaultOpen && !current.container && !current.disabled && first instanceof HTMLElement && first !== card) open(first);

  return {
    configure(next: HoverCardOptions) {
      if (destroyed) return;
      const moved = (next.container ?? null) !== (current.container ?? null) || (next.selector || DEFAULT_SELECTOR) !== (current.selector || DEFAULT_SELECTOR);
      current = next;
      if (moved) {
        detach();
        attach();
        if (trigger && !resolve(trigger)) close();
        if (candidate && !resolve(candidate)) cancelOpen();
      }
      if (current.disabled) close();
    },
    // アンマウント中に利用側の state を触らないよう、onOpenChange は呼ばない。何度呼んでもよい。
    destroy() {
      if (destroyed) return;
      close(false);
      destroyed = true;
      detach();
      resize.disconnect();
      card.removeEventListener('pointerenter', cardEnter);
      card.removeEventListener('pointerleave', cardLeave);
      card.removeEventListener('focusin', cardFocusIn);
      card.removeEventListener('focusout', cardFocusOut);
      card.removeEventListener('keydown', cardKey);
      document.removeEventListener('keydown', escape, true);
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    },
  };
}
