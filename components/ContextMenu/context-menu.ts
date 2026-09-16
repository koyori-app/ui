/* 右クリックの座標。キーボード（Shift+F10・メニューキー）では 0,0 で来るため、対象の左下に出す。 */
export function contextMenuPosition(event: { clientX?: number; clientY?: number; currentTarget?: EventTarget | null }) {
  const x = event.clientX ?? 0;
  const y = event.clientY ?? 0;
  if (x !== 0 || y !== 0) return { x, y };
  const target = event.currentTarget as { getBoundingClientRect?: () => { left: number; bottom: number } } | null;
  const bounds = target?.getBoundingClientRect?.();
  return bounds ? { x: bounds.left, y: bounds.bottom } : { x: 0, y: 0 };
}
