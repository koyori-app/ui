import { menuLengths, resetMenu } from '../shared/menu';

/** One tooltip owns its listeners, description token and native popover. */
export function connectTooltip(root: HTMLElement | null, panel: HTMLElement | null) {
  if (!root || !panel) return;
  let trigger: HTMLElement | null = null;
  let description = '';
  let hovered = false;
  let focused = false;
  let dismissed = false;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  const topLayer = typeof panel.showPopover === 'function';
  if (topLayer) panel.popover = 'manual';

  const removeDescription = () => {
    if (!trigger || !description) return;
    const ids = (trigger.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(id => id && id !== description);
    if (ids.length) trigger.setAttribute('aria-describedby', ids.join(' '));
    else trigger.removeAttribute('aria-describedby');
    description = '';
  };
  const enabled = () => !!trigger && !trigger.matches(':disabled') && root.dataset.disabled !== 'true' && !!panel.id && !!panel.textContent?.trim();
  const hide = () => {
    clearTimeout(closeTimer);
    if (topLayer && panel.matches(':popover-open')) panel.hidePopover();
    panel.hidden = true;
    resetMenu(panel, null);
  };
  const position = () => {
    if (panel.hidden || !trigger) return;
    const bounds = trigger.getBoundingClientRect();
    const { gap, margin } = menuLengths(panel);
    const width = window.innerWidth;
    const height = window.innerHeight;
    const room = { top: bounds.top - gap - margin, bottom: height - bounds.bottom - gap - margin,
      left: bounds.left - gap - margin, right: width - bounds.right - gap - margin };
    const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const;
    let side = root.dataset.placement as keyof typeof opposite;
    if (!(side in opposite)) side = 'top';
    const needed = side === 'top' || side === 'bottom' ? panel.offsetHeight : panel.offsetWidth;
    if (needed > room[side] && room[opposite[side]] > room[side]) side = opposite[side];
    const x = side === 'left' ? bounds.left - gap - panel.offsetWidth : side === 'right' ? bounds.right + gap : (bounds.left + bounds.right - panel.offsetWidth) / 2;
    const y = side === 'top' ? bounds.top - gap - panel.offsetHeight : side === 'bottom' ? bounds.bottom + gap : (bounds.top + bounds.bottom - panel.offsetHeight) / 2;
    panel.style.left = `${Math.max(margin, Math.min(x, width - margin - panel.offsetWidth))}px`;
    panel.style.top = `${Math.max(margin, Math.min(y, height - margin - panel.offsetHeight))}px`;
    panel.dataset.side = side;
  };
  const show = () => {
    clearTimeout(closeTimer);
    if (!enabled() || dismissed) return;
    if (topLayer) panel.popover = 'manual';
    panel.hidden = false;
    if (topLayer && !panel.matches(':popover-open')) panel.showPopover();
    position();
  };
  const update = () => {
    const next = root.firstElementChild;
    const candidate = next instanceof HTMLElement && next !== panel ? next : null;
    if (candidate !== trigger || description !== panel.id || !enabled()) {
      removeDescription();
      trigger = candidate;
    }
    if (!enabled()) { hide(); return; }
    const ids = (trigger!.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
    if (!ids.includes(panel.id)) {
      ids.push(panel.id);
      trigger!.setAttribute('aria-describedby', ids.join(' '));
      description = panel.id;
    }
    position();
  };
  const leave = () => {
    hovered = false;
    // Allow crossing the small gap between the trigger and the tooltip.
    closeTimer = setTimeout(() => {
      if (!hovered && !focused) { dismissed = false; hide(); }
    }, 150);
  };
  const enter = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    hovered = true;
    update();
    show();
  };
  const focus = () => {
    focused = true;
    update();
    show();
  };
  const blur = (event: FocusEvent) => {
    if (root.contains(event.relatedTarget as Node)) return;
    focused = false;
    if (!hovered) { dismissed = false; hide(); }
  };
  const escape = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.isComposing || event.keyCode === 229 || panel.hidden) return;
    dismissed = true;
    hide();
    // Dismiss only the tooltip, preserving a surrounding dialog or menu.
    event.stopPropagation();
    event.preventDefault();
  };
  root.addEventListener('pointerenter', enter);
  root.addEventListener('pointerleave', leave);
  root.addEventListener('focusin', focus);
  root.addEventListener('focusout', blur);
  document.addEventListener('keydown', escape, true);
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, true);
  const resize = new ResizeObserver(position);
  resize.observe(root);
  resize.observe(panel);
  update();
  // Hydration can finish after a pointer or autofocus has already reached the trigger.
  hovered = root.matches(':hover');
  focused = root.contains(document.activeElement);
  if (hovered || focused) show();
  return {
    update,
    destroy() {
      hide();
      removeDescription();
      resize.disconnect();
      root.removeEventListener('pointerenter', enter);
      root.removeEventListener('pointerleave', leave);
      root.removeEventListener('focusin', focus);
      root.removeEventListener('focusout', blur);
      document.removeEventListener('keydown', escape, true);
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    },
  };
}
