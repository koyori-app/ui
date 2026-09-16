import { hideHighlight, highlightItem } from './highlight';

export function normalizeMenuText(text: string) {
  return text.normalize('NFKC').toLocaleLowerCase().trim();
}

/* 矢印・Home/End の移動先。項目がなければ -1。 */
export function nextMenuIndex(key: string, current: number, length: number) {
  if (length === 0) return -1;
  if (key === 'Home') return 0;
  if (key === 'End') return length - 1;
  if (key === 'ArrowDown') return (current + 1) % length;
  if (key === 'ArrowUp') return (current <= 0 ? length : current) - 1;
  return current;
}

/* 先頭文字での移動先。現在位置の次から探し、末尾まで来たら先頭へ回る。見つからなければ -1。 */
export function typeaheadTarget(labels: string[], current: number, key: string) {
  const needle = normalizeMenuText(key);
  if (!needle || labels.length === 0) return -1;
  for (let step = 1; step <= labels.length; step++) {
    const index = (current + step + labels.length) % labels.length;
    if (normalizeMenuText(labels[index] || '').startsWith(needle)) return index;
  }
  return -1;
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
  const topLayer = !!root.closest('[data-menu-top-layer]') && typeof panel.showPopover === 'function';
  if (topLayer) {
    panel.popover = 'manual';
    panel.style.position = 'fixed';
    panel.style.margin = '0';
    panel.style.bottom = 'auto';
    if (!panel.matches(':popover-open')) panel.showPopover();
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
  if (topLayer) {
    panel.style.left = `${Math.max(margin, Math.min(left, window.innerWidth - margin - panel.offsetWidth))}px`;
    panel.style.top = `${side === 'top' ? bounds.top - gap - panel.offsetHeight : bounds.bottom + gap}px`;
  } else {
    panel.style.left = `${Math.max(margin - left, Math.min(0, window.innerWidth - margin - left - panel.offsetWidth))}px`;
  }
  const focused = list.querySelector<HTMLElement>(':focus-visible')
    || (document.activeElement === list ? list.querySelector<HTMLElement>('[data-active="true"]') : null);
  const hovered = list.querySelector<HTMLElement>('[role="menuitem"]:hover, [role="option"]:hover');
  if (focused || hovered) highlightItem(list, focused || hovered);
}

export function resetMenu(panel: HTMLElement | null, list: HTMLElement | null) {
  hideHighlight(list);
  panel?.removeAttribute('data-side');
  if (panel) {
    if (panel.popover === 'manual') {
      if (panel.matches(':popover-open')) panel.hidePopover();
      panel.removeAttribute('popover');
      for (const property of ['position', 'margin', 'top', 'bottom', 'left']) panel.style.removeProperty(property);
    }
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
  const toggle = (event: Event) => {
    if (event.target instanceof HTMLElement && event.target.hasAttribute('popover') && (event as ToggleEvent).newState === 'closed') close();
  };
  root?.addEventListener('toggle', toggle, true);
  document.addEventListener('pointerdown', outside);
  root?.addEventListener('focusout', blur);
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, true);
  return () => {
    root?.removeEventListener('toggle', toggle, true);
    document.removeEventListener('pointerdown', outside);
    root?.removeEventListener('focusout', blur);
    window.removeEventListener('resize', position);
    window.removeEventListener('scroll', position, true);
  };
}
export const MENU_TYPEAHEAD_TIMEOUT = 500;
