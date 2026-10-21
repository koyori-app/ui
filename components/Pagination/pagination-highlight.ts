import { hideHighlight, highlightItem } from '../shared/highlight';

/* ホバーの面をポインターの下か :focus-visible の項目へ置き直す（Sidebar の listener と同じ優先順）。
   キーボードで番号を押すと並びが変わってフォーカス中のボタンが動くが、項目数が同じで大きさが変わらず、
   listener は測り直さないため、描画のたびに呼ぶ。 */
export function syncPaginationHighlight(root: HTMLElement | null) {
  if (!root) return;
  const items = Array.from(root.querySelectorAll<HTMLElement>('[data-hover-item]'));
  const target = items.find(item => item.matches(':hover')) ?? items.find(item => item.matches(':focus-visible'));
  if (target) highlightItem(root, target);
  else hideHighlight(root);
}
