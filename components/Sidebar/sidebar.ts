import { enterHighlight, hideHighlight, highlightItem, leaveHighlight } from '../shared/highlight';

export function listenToSidebar(root: HTMLElement | null) {
  if (!root) return () => {};
  let pointer: { clientX: number; clientY: number } | null = null;
  let frame = 0;
  const itemAt = (target: EventTarget | null) => {
    const item = target instanceof Element ? target.closest<HTMLElement>('[data-hover-item]') : null;
    return item?.closest('[data-hover-group]') === root ? item : null;
  };
  const update = () => {
    const hovered = pointer ? itemAt(document.elementFromPoint(pointer.clientX, pointer.clientY)) : null;
    const focused = itemAt(root.querySelector(':focus-visible'));
    if (hovered || focused) highlightItem(root, hovered || focused);
    else hideHighlight(root);
  };
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  };
  const move = (event: MouseEvent) => { pointer = { clientX: event.clientX, clientY: event.clientY }; };
  const over = (event: MouseEvent) => {
    if (!root.contains(event.relatedTarget as Node | null)) enterHighlight(root, event);
    move(event);
    const item = itemAt(event.target);
    if (item) highlightItem(root, item);
  };
  const leave = () => {
    pointer = null;
    leaveHighlight(root, itemAt(root.querySelector(':focus-visible')));
  };
  const focus = (event: FocusEvent) => {
    const item = itemAt(event.target);
    if (item) highlightItem(root, item);
  };
  // The inner wrapper resizes when groups open/close; the outer nav owns scrolling.
  const resize = new ResizeObserver(schedule);
  resize.observe(root);
  root.addEventListener('mouseover', over);
  root.addEventListener('mousemove', move);
  root.addEventListener('mouseleave', leave);
  root.addEventListener('focusin', focus);
  root.addEventListener('focusout', schedule);
  window.addEventListener('scroll', schedule, true);
  return () => {
    resize.disconnect();
    cancelAnimationFrame(frame);
    root.removeEventListener('mouseover', over);
    root.removeEventListener('mousemove', move);
    root.removeEventListener('mouseleave', leave);
    root.removeEventListener('focusin', focus);
    root.removeEventListener('focusout', schedule);
    window.removeEventListener('scroll', schedule, true);
  };
}

/* 閉じるときに中にあったフォーカスを、aria-controls で指している開閉ボタンへ戻す。 */
export function restoreFocus(root: HTMLElement | null, id: string | undefined) {
  const active = root?.ownerDocument.activeElement;
  if (!root || !id || !active || !root.contains(active)) return;
  const toggle = Array.from(root.ownerDocument.querySelectorAll<HTMLElement>('[aria-controls]'))
    .find((element) => element.getAttribute('aria-controls')!.split(/\s+/).includes(id));
  toggle?.focus();
}
