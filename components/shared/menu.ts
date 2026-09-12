export function normalizeMenuText(text: string) {
  return text.normalize('NFKC').toLocaleLowerCase().trim();
}

const menuLengthCache = new WeakMap<HTMLElement, { gap: number; maximum: number; margin: number }>();

/* Resolve rem/calc once per opening, then reuse the same lengths in CSS and JS. */
function menuLengths(panel: HTMLElement) {
  const cached = menuLengthCache.get(panel);
  if (cached) return cached;
  const probe = document.createElement('div');
  probe.style.cssText = 'all: initial; position: absolute; visibility: hidden; pointer-events: none; font: inherit; box-sizing: content-box; width: var(--koyori-menu-gap); height: var(--koyori-menu-max-height); padding-top: var(--koyori-menu-viewport-margin);';
  panel.append(probe);
  const css = getComputedStyle(probe);
  const lengths = { gap: parseFloat(css.width), maximum: parseFloat(css.height), margin: parseFloat(css.paddingTop) };
  probe.remove();
  menuLengthCache.set(panel, lengths);
  panel.style.setProperty('--menu-resolved-gap', `${lengths.gap}px`);
  panel.style.setProperty('--menu-resolved-max-height', `${lengths.maximum}px`);
  return lengths;
}

export function positionMenu(root: HTMLElement | null, trigger: HTMLElement | null, panel: HTMLElement | null, list: HTMLElement | null) {
  if (!root || !trigger || !panel || !list) return;
  if (panel.hidden) {
    if (panel.hasAttribute('data-side')) resetMenu(panel, list);
    return;
  }
  const { gap, margin, maximum } = menuLengths(panel);
  const bounds = trigger.getBoundingClientRect();
  const below = Math.max(0, window.innerHeight - bounds.bottom - gap - margin);
  const above = Math.max(0, bounds.top - gap - margin);
  const height = Math.min(maximum, panel.scrollHeight + list.scrollHeight - list.clientHeight + panel.offsetHeight - panel.clientHeight);
  const side = height > below && above > below ? 'top' : 'bottom';
  panel.style.setProperty('--menu-available-height', `${side === 'top' ? above : below}px`);
  panel.setAttribute('data-side', side);
  const left = root.getBoundingClientRect().left;
  panel.style.left = `${Math.max(margin - left, Math.min(0, window.innerWidth - margin - left - panel.offsetWidth))}px`;
  const focused = list.querySelector<HTMLElement>(':focus-visible')
    || (document.activeElement === list ? list.querySelector<HTMLElement>('[data-active="true"]') : null);
  const hovered = list.querySelector<HTMLElement>('[role="menuitem"]:hover, [role="option"]:hover');
  if (focused || hovered) highlightMenuItem(list, focused || hovered);
}

export function hideMenuHighlight(list: HTMLElement | null) {
  list?.style.setProperty('--highlight-opacity', '0');
}

export function highlightMenuItem(list: HTMLElement | null, target: EventTarget | null) {
  if (!list || !(target instanceof HTMLElement)) return;
  if (target.getAttribute('aria-disabled') === 'true') {
    hideMenuHighlight(list);
    return;
  }
  list.style.setProperty('--highlight-x', `${target.offsetLeft}px`);
  list.style.setProperty('--highlight-y', `${target.offsetTop}px`);
  list.style.setProperty('--highlight-width', `${target.offsetWidth}px`);
  list.style.setProperty('--highlight-height', `${target.offsetHeight}px`);
  list.style.setProperty('--highlight-opacity', '1');
}

export function enterMenu(list: HTMLElement | null, event: { clientX: number; clientY: number }) {
  if (!list) return;
  const bounds = list.getBoundingClientRect();
  list.style.setProperty('--highlight-transition', 'none');
  list.style.setProperty('--highlight-x', `${event.clientX - bounds.left - list.clientLeft + list.scrollLeft}px`);
  list.style.setProperty('--highlight-y', `${event.clientY - bounds.top - list.clientTop + list.scrollTop}px`);
  list.style.setProperty('--highlight-width', '0px');
  list.style.setProperty('--highlight-height', '0px');
  hideMenuHighlight(list);
  list.querySelector('span')?.getBoundingClientRect();
  list.style.removeProperty('--highlight-transition');
}

export function leaveMenu(list: HTMLElement | null, active?: HTMLElement | null) {
  const focused = active || list?.querySelector<HTMLElement>(':focus-visible');
  if (focused) highlightMenuItem(list, focused);
  else hideMenuHighlight(list);
}

export function resetMenu(panel: HTMLElement | null, list: HTMLElement | null) {
  hideMenuHighlight(list);
  panel?.removeAttribute('data-side');
  if (panel) {
    menuLengthCache.delete(panel);
    panel.style.removeProperty('--menu-resolved-gap');
    panel.style.removeProperty('--menu-resolved-max-height');
  }
}

export function listenToMenu(root: HTMLElement | null, close: () => void, position: () => void) {
  const outside = (event: PointerEvent) => {
    if (!root?.contains(event.target as Node)) close();
  };
  const blur = (event: FocusEvent) => {
    if (!root?.contains(event.relatedTarget as Node)) close();
  };
  document.addEventListener('pointerdown', outside);
  root?.addEventListener('focusout', blur);
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, true);
  return () => {
    document.removeEventListener('pointerdown', outside);
    root?.removeEventListener('focusout', blur);
    window.removeEventListener('resize', position);
    window.removeEventListener('scroll', position, true);
  };
}
export const MENU_TYPEAHEAD_TIMEOUT = 500;
