/** Values and notifications use CSS pixels, independently of persistence. */
export function splitSize(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function splitLayout(size: number, available: number, minimum: number | undefined, secondaryMinimum: number | undefined) {
  const primary = splitSize(minimum, 160);
  const secondary = splitSize(secondaryMinimum, 160);
  const space = available < 0 ? Math.max(size, primary) + secondary : Math.max(0, available);
  // In a narrow parent both minima yield proportionally; remember the requested size for later.
  const min = space < primary + secondary ? space * (primary / (primary + secondary)) : primary;
  const max = space < primary + secondary ? min : space - secondary;
  return { min, max, size: Math.min(max, Math.max(min, size)) };
}

export function observeSplitPane(root: HTMLElement | null, handle: HTMLElement | null, measure: (available: number) => void) {
  if (!root || !handle) return () => {};
  let width = 0, handleWidth = 0;
  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      if (entry.target === root) width = entry.contentRect.width;
      if (entry.target === handle) handleWidth = entry.contentRect.width;
    }
    measure(Math.max(0, width - handleWidth));
  });
  observer.observe(root);
  observer.observe(handle);
  return () => observer.disconnect();
}

export interface SplitDrag {
  pointerId: number;
  startX: number;
  startSize: number;
  finish(): void;
}

export function beginSplitDrag(handle: HTMLElement, pointerId: number, startX: number, startSize: number, end: () => void): SplitDrag {
  const finish = () => {
    window.removeEventListener('blur', finish);
    document.removeEventListener('visibilitychange', hidden);
    end();
    if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
  };
  const hidden = () => { if (document.hidden) finish(); };
  handle.setPointerCapture(pointerId);
  window.addEventListener('blur', finish);
  document.addEventListener('visibilitychange', hidden);
  return { pointerId, startX, startSize, finish };
}
