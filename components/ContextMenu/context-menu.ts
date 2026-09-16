/* 右クリックの座標。キーボード（Shift+F10・メニューキー）では 0,0 で来るため、対象の左下に出す。 */
export function contextMenuPosition(event: { clientX?: number; clientY?: number; currentTarget?: EventTarget | null }) {
  const x = event.clientX ?? 0;
  const y = event.clientY ?? 0;
  if (x !== 0 || y !== 0) return { x, y };
  const target = event.currentTarget as { getBoundingClientRect?: () => { left: number; bottom: number } } | null;
  const bounds = target?.getBoundingClientRect?.();
  return bounds ? { x: bounds.left, y: bounds.bottom } : { x: 0, y: 0 };
}

/* ポインタの座標に起点を置く。transform などを持つ祖先があると fixed の基準がその要素になるため、
   一度置いてから実際の位置との差で補正する。
   ponytail: 祖先の拡大縮小（scale）は補正しない。必要になれば行列から逆算する。 */
export function placeContextMenu(root: { style: { left: string; top: string }; getBoundingClientRect(): { left: number; top: number } } | null, x: number, y: number) {
  if (!root) return;
  root.style.left = `${x}px`;
  root.style.top = `${y}px`;
  const bounds = root.getBoundingClientRect();
  root.style.left = `${2 * x - bounds.left}px`;
  root.style.top = `${2 * y - bounds.top}px`;
}
