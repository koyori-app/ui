export function hideHighlight(root: HTMLElement | null) {
  root?.style.setProperty('--highlight-opacity', '0');
}

export function highlightItem(root: HTMLElement | null, target: EventTarget | null) {
  if (!root || !(target instanceof HTMLElement)) return;
  if (target.matches(':disabled, [aria-disabled="true"]')) {
    hideHighlight(root);
    return;
  }
  // Nested navigation rows can have a different offset parent from the surface.
  let x = target.offsetLeft;
  let y = target.offsetTop;
  if (target.offsetParent !== root) {
    const bounds = root.getBoundingClientRect();
    const item = target.getBoundingClientRect();
    x = item.left - bounds.left - root.clientLeft + root.scrollLeft;
    y = item.top - bounds.top - root.clientTop + root.scrollTop;
  }
  root.style.setProperty('--highlight-x', `${x}px`);
  root.style.setProperty('--highlight-y', `${y}px`);
  root.style.setProperty('--highlight-width', `${target.offsetWidth}px`);
  root.style.setProperty('--highlight-height', `${target.offsetHeight}px`);
  root.style.setProperty('--highlight-opacity', '1');
}

export function enterHighlight(root: HTMLElement | null, event: { clientX: number; clientY: number }) {
  if (!root) return;
  const bounds = root.getBoundingClientRect();
  root.style.setProperty('--highlight-transition', 'none');
  root.style.setProperty('--highlight-x', `${event.clientX - bounds.left - root.clientLeft + root.scrollLeft}px`);
  root.style.setProperty('--highlight-y', `${event.clientY - bounds.top - root.clientTop + root.scrollTop}px`);
  root.style.setProperty('--highlight-width', '0px');
  root.style.setProperty('--highlight-height', '0px');
  hideHighlight(root);
  root.querySelector('[data-hover-highlight]')?.getBoundingClientRect();
  root.style.removeProperty('--highlight-transition');
}

export function leaveHighlight(root: HTMLElement | null, active?: HTMLElement | null) {
  const focused = active || root?.querySelector<HTMLElement>(':focus-visible');
  if (focused) highlightItem(root, focused);
  else hideHighlight(root);
}
