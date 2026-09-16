import { menuLengths } from '../shared/menu';

/* 右クリックの座標。キーボード（Shift+F10・メニューキー）では 0,0 で来るため、対象の左下に出す。 */
export function contextMenuPosition(event: { clientX?: number; clientY?: number; currentTarget?: EventTarget | null }) {
  const x = event.clientX ?? 0;
  const y = event.clientY ?? 0;
  if (x !== 0 || y !== 0) return { x, y };
  const target = event.currentTarget as { getBoundingClientRect?: () => { left: number; bottom: number } } | null;
  const bounds = target?.getBoundingClientRect?.();
  return bounds ? { x: bounds.left, y: bounds.bottom } : { x: 0, y: 0 };
}

/* メニューボタン（三点ボタンなど）から開くときの座標。ボタンの左下に出す。
   Safari はクリックでボタンにフォーカスを置かないため、ここでフォーカスする。
   Escape や実行のあとに、フォーカスがボタンへ戻るようにするため。 */
export function menuButtonPosition(event: { currentTarget?: EventTarget | null }) {
  const button = event.currentTarget as { getBoundingClientRect?: () => { left: number; bottom: number }; focus?: () => void } | null;
  const bounds = button?.getBoundingClientRect?.();
  if (!bounds) return { x: 0, y: 0 };
  button?.focus?.();
  return { x: bounds.left, y: bounds.bottom };
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

/* ホバーでサブメニューを開閉するまでの待ち時間。斜めに移動する途中で別の項目に触れても閉じないようにする。
   ponytail: 単純な遅延。足りなければポインタの軌跡から判定する（安全三角形）。 */
export const SUBMENU_DELAY = 300;

/* サブメニューの位置。親メニューの右に出し、右に入らなければ左へ反転する。
   左右どちらにも入らなければ広い側に出して画面内へ寄せる。縦は親項目に揃え、はみ出したら上へずらす。 */
export function submenuPlacement(input: {
  panel: { left: number; right: number };
  itemTop: number;
  inset: number;
  size: { width: number; height: number };
  viewport: { width: number; height: number };
  margin: number;
}) {
  const { panel, size, viewport, margin } = input;
  const roomRight = viewport.width - margin - panel.right;
  const roomLeft = panel.left - margin;
  const side: 'right' | 'left' = size.width <= roomRight || roomRight >= roomLeft ? 'right' : 'left';
  const preferred = side === 'right' ? panel.right : panel.left - size.width;
  const left = Math.max(margin, Math.min(preferred, viewport.width - margin - size.width));
  const maxHeight = Math.max(0, viewport.height - 2 * margin);
  const height = Math.min(size.height, maxHeight);
  const top = Math.max(margin, Math.min(input.itemTop - input.inset, viewport.height - margin - height));
  return { left, top, side, maxHeight };
}

/* サブメニューに関わるキーの扱い。それ以外（矢印・Home/End・文字）はその階層の中で動かす。 */
export function submenuKeyAction(key: string, context: { inSubmenu: boolean; isParent: boolean; disabled: boolean }) {
  if (key === 'Tab') return 'closeAll';
  if (key === 'Escape') return context.inSubmenu ? 'closeSubmenu' : 'closeAll';
  if (key === 'ArrowLeft') return context.inSubmenu ? 'closeSubmenu' : 'none';
  if (key === 'ArrowRight' || key === 'Enter' || key === ' ') return context.isParent && !context.disabled ? 'open' : 'none';
  return 'none';
}

/* 開いているサブメニューを置く。ルートと同じく、Popover API があればトップレイヤーに fixed で、
   なければ root からの相対位置で置く。 */
export function positionSubmenu(root: HTMLElement | null, parentPanel: HTMLElement | null, item: HTMLElement | null, panel: HTMLElement | null) {
  if (!root || !parentPanel || !item || !panel || panel.hidden) return;
  const topLayer = typeof panel.showPopover === 'function';
  if (topLayer) {
    panel.popover = 'manual';
    panel.style.position = 'fixed';
    panel.style.margin = '0';
    panel.style.bottom = 'auto';
    if (!panel.matches(':popover-open')) panel.showPopover();
  }
  const { margin } = menuLengths(panel);
  panel.style.setProperty('--menu-available-height', `${Math.max(0, window.innerHeight - 2 * margin)}px`);
  panel.setAttribute('data-side', 'bottom');
  const style = getComputedStyle(panel);
  const place = submenuPlacement({
    panel: parentPanel.getBoundingClientRect(),
    itemTop: item.getBoundingClientRect().top,
    inset: parseFloat(style.paddingTop) + parseFloat(style.borderTopWidth),
    size: { width: panel.offsetWidth, height: panel.offsetHeight },
    viewport: { width: window.innerWidth, height: window.innerHeight },
    margin,
  });
  panel.setAttribute('data-submenu-side', place.side);
  const origin = topLayer ? { left: 0, top: 0 } : root.getBoundingClientRect();
  panel.style.left = `${place.left - origin.left}px`;
  panel.style.top = `${place.top - origin.top}px`;
}
