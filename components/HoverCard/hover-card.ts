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
const FOCUSABLE = 'a[href], area[href], button, input, select, textarea, summary, [tabindex], [contenteditable]:not([contenteditable="false"])';

const rendered = (element: HTMLElement) =>
  typeof element.checkVisibility === 'function'
    ? element.checkVisibility({ visibilityProperty: true, checkVisibilityCSS: true })
    : element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
// Tab で止まる要素。tabindex が負・無効・inert（祖先を含む）・表示されていないものは含めない。
const tabbables = (scope: ParentNode) =>
  Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && !element.closest('[inert]') && rendered(element));
// 実際にフォーカスが移った最初の要素があれば true。
const focusFirst = (items: HTMLElement[], options?: FocusOptions) =>
  items.some(item => {
    item.focus(options);
    return document.activeElement === item;
  });
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
  // ポインターとフォーカスの所在は、どの起点かを要素で持つ。真偽値だと別の札のものと区別できない。
  let hovered: HTMLElement | null = null;
  let focused: HTMLElement | null = null;
  let pointerOnCard = false;
  // キーボードで入ったフォーカスがカードの中にある。マウスで押して得たフォーカスは数えない。
  let focusOnCard = false;
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
    // 行をまたいで折り返した起点は、行ごとの箱を持つ。下に開くなら最後の行、上に開くなら最初の行に付ける。
    const boxes = trigger.getClientRects();
    const fallback = trigger.getBoundingClientRect();
    const first = boxes[0] ?? fallback;
    const last = boxes[boxes.length - 1] ?? fallback;
    const below = Math.max(0, window.innerHeight - last.bottom - gap - margin);
    const above = Math.max(0, first.top - gap - margin);
    const natural = card.scrollHeight + card.offsetHeight - card.clientHeight;
    const side = natural > below && above > below ? 'top' : 'bottom';
    const anchor = side === 'top' ? first : last;
    card.style.setProperty('--hover-card-available-height', `${side === 'top' ? above : below}px`);
    card.dataset.side = side;
    card.style.left = `${Math.max(margin, Math.min(anchor.left, window.innerWidth - margin - card.offsetWidth))}px`;
    card.style.top = `${side === 'top' ? anchor.top - gap - card.offsetHeight : anchor.bottom + gap}px`;
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
  // 開く予約は取り消さない。カードの閉じ方（別の札へ Tab で出る場合など）と無関係に、候補の札の所在で決まる。
  const close = (notify = true) => {
    clearTimeout(closeTimer);
    closeTimer = undefined;
    cancelAnimationFrame(frame ?? 0);
    pointerOnCard = false;
    focusOnCard = false;
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
  // 開く待ち・閉じる待ち・Esc 後の抑止は、ポインターとフォーカスの所在から判断する。所在が変わるたびにここを通す。
  const engaged = (element: HTMLElement | null) => element !== null && (hovered === element || focused === element);
  const held = () => engaged(trigger) || pointerOnCard || focusOnCard;
  const settle = (immediate = false) => {
    // 候補の札自身にポインターもフォーカスも無くなったら、開く予約を取り消す。
    if (candidate && !engaged(candidate)) cancelOpen();
    if (dismissed && !engaged(dismissed)) dismissed = null;
    // 横切った札の予約が 1 つしかない予約を押しのけていたら、フォーカスのある札の予約を入れ直す（遅れは openDelay のまま）。
    if (!candidate && !trigger && focused && dismissed !== focused && !current.disabled) scheduleOpen(focused);
    if (!trigger) return;
    if (held()) {
      clearTimeout(closeTimer);
      closeTimer = undefined;
    } else if (immediate) close();
    else scheduleClose();
  };
  const scheduleClose = () => {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      closeTimer = undefined;
      settle(true);
    }, current.closeDelay ?? CLOSE_DELAY_MS);
  };
  const scheduleOpen = (element: HTMLElement) => {
    if (candidate === element && openTimer !== undefined) return;
    cancelOpen();
    candidate = element;
    openTimer = setTimeout(() => {
      const next = candidate;
      cancelOpen();
      // 発火の時点でも、その札にポインターかフォーカスが残っていることを確かめる。
      // キーボードのフォーカスがカードの中にある間は、ホバーだけの札へ入れ替えない（フォーカスがカードごと body に落ちる）。
      if (next && engaged(next) && !(focusOnCard && focused !== next) && !current.disabled && resolve(next)) open(next);
    }, current.openDelay ?? OPEN_DELAY_MS);
  };

  const pointerOver = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || current.disabled) return;
    const element = resolve(event.target);
    if (!element) return;
    hovered = element;
    if (element !== trigger && dismissed !== element && !focusOnCard) scheduleOpen(element);
    settle();
  };
  const pointerOut = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    const element = resolve(event.target);
    if (!element) return;
    if (event.relatedTarget instanceof Node && element.contains(event.relatedTarget)) return;
    if (hovered === element) hovered = null;
    settle();
  };
  const cardEnter = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    pointerOnCard = true;
    settle();
  };
  const cardLeave = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    pointerOnCard = false;
    settle();
  };
  const focusIn = (event: FocusEvent) => {
    const element = resolve(event.target);
    if (!element || current.disabled) return;
    // タップやクリックで入ったフォーカスでは開かない。
    if ((event.target as Element).matches(':focus-visible')) {
      focused = element;
      if (element !== trigger && dismissed !== element) scheduleOpen(element);
    }
    settle();
  };
  const focusOut = (event: FocusEvent) => {
    const element = resolve(event.target);
    if (!element) return;
    const next = event.relatedTarget;
    if (next instanceof Node && element.contains(next)) return;
    if (focused === element) focused = null;
    // 起点とカードの間を移るだけなら、続く focusin で所在が戻るので待つ。それ以外はすぐ閉じる。
    settle(!(next instanceof Node && card.contains(next)));
  };
  const cardFocusIn = (event: FocusEvent) => {
    focusOnCard = (event.target as Element).matches(':focus-visible');
    settle();
  };
  const cardFocusOut = (event: FocusEvent) => {
    focusOnCard = false;
    const next = event.relatedTarget;
    settle(!(next instanceof Node && (card.contains(next) || trigger?.contains(next))));
  };
  // top layer のカードの DOM は本文の外にあり、文書順の Tab ではカードに入れない。起点 → カード → 起点の次、の順を作る。
  const triggerKey = (event: KeyboardEvent) => {
    if (!plainTab(event) || event.shiftKey || !trigger || card.hidden || event.target !== trigger) return;
    if (focusFirst(tabbables(card), { preventScroll: true })) event.preventDefault();
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
    const following = tabbables(scope).filter(element => !card.contains(element) && !origin.contains(element)
      && origin.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING);
    // 実際にフォーカスが移ったものへ。どれにも移れなければ起点に戻し、既定の Tab に任せる。
    if (focusFirst(following)) event.preventDefault();
    else origin.focus({ preventScroll: true });
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
    const active = document.activeElement;
    const focusHere = card.contains(active) || origin.contains(active);
    if (card.contains(active)) origin.focus({ preventScroll: true });
    dismissed = origin;
    close();
    // フォーカスが起点かカードにあるときだけ、Esc をここで受け止める（外の Dialog やメニューは閉じない）。
    // ホバーで開いただけなら、カードだけ閉じて Esc は入力欄などへ通す。
    if (focusHere) {
      event.stopPropagation();
      event.preventDefault();
    }
  };
  // v-html の描き直しなどで起点が外れたら閉じる。
  const mutations = new MutationObserver(() => {
    const gone = (element: HTMLElement | null) => element !== null && (!element.isConnected || !host?.contains(element));
    let lost = false;
    if (gone(hovered)) { hovered = null; lost = true; }
    if (gone(focused)) { focused = null; lost = true; }
    if (gone(candidate)) cancelOpen();
    if (gone(trigger)) close();
    if (lost) settle();
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
        if (hovered && !resolve(hovered)) hovered = null;
        if (focused && !resolve(focused)) focused = null;
      }
      if (current.disabled) {
        cancelOpen();
        close();
      }
    },
    // アンマウント中に利用側の state を触らないよう、onOpenChange は呼ばない。何度呼んでもよい。
    destroy() {
      if (destroyed) return;
      cancelOpen();
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
