export function hideHighlight(root: HTMLElement | null) {
  root?.style.setProperty('--highlight-opacity', '0');
}

export function highlightItem(root: HTMLElement | null, target: EventTarget | null) {
  if (!root || !(target instanceof HTMLElement)) return;
  if (target.matches(':disabled, [aria-disabled="true"]')) {
    hideHighlight(root);
    return;
  }
  // offsetTop / offsetHeight は整数に丸まるので、行の高さが小数のとき帯が一覧の端を
  // 1px 未満はみ出し、スクロール可能な一覧ではそれだけでスクロールバーが出る。
  // 丸めない矩形から求めれば、帯は行の箱とぴったり重なり、はみ出さない。
  const bounds = root.getBoundingClientRect();
  const item = target.getBoundingClientRect();
  const x = item.left - bounds.left - root.clientLeft + root.scrollLeft;
  const y = item.top - bounds.top - root.clientTop + root.scrollTop;
  root.style.setProperty('--highlight-x', `${x}px`);
  root.style.setProperty('--highlight-y', `${y}px`);
  root.style.setProperty('--highlight-width', `${item.width}px`);
  root.style.setProperty('--highlight-height', `${item.height}px`);
  root.style.setProperty('--highlight-opacity', '1');
}

export function enterHighlight(root: HTMLElement | null, event: { clientX: number; clientY: number }) {
  if (!root) return;
  // 位置を書いた後に clientTop などを読むとレイアウトが走り、幅がまだ既定の 100% のまま
  // 右へずれた帯が一覧をはみ出す。Safari はその瞬間に出したスクロールバーを次の
  // レイアウトまで残すので、先に測ってから、大きさ → 位置の順に書く。
  const bounds = root.getBoundingClientRect();
  const x = event.clientX - bounds.left - root.clientLeft + root.scrollLeft;
  const y = event.clientY - bounds.top - root.clientTop + root.scrollTop;
  root.style.setProperty('--highlight-transition', 'none');
  root.style.setProperty('--highlight-width', '0px');
  root.style.setProperty('--highlight-height', '0px');
  root.style.setProperty('--highlight-x', `${x}px`);
  root.style.setProperty('--highlight-y', `${y}px`);
  hideHighlight(root);
  root.querySelector('[data-hover-highlight]')?.getBoundingClientRect();
  root.style.removeProperty('--highlight-transition');
}

export function leaveHighlight(root: HTMLElement | null, active?: HTMLElement | null) {
  const focused = active || root?.querySelector<HTMLElement>(':focus-visible');
  if (focused) highlightItem(root, focused);
  else hideHighlight(root);
}
