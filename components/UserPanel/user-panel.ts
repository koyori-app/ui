import { menuLengths } from '../shared/menu';

export interface UserPanelItem {
  value: string;
  label: string;
  /** あれば <a>。既定の遷移は止めないので、利用側のルーターが click を拾える。 */
  href?: string;
  /** 取り消せない操作（ログアウトなど）。色だけに頼らず、ラベルにも結果が分かる語を入れる。 */
  destructive?: boolean;
  disabled?: boolean;
  /** ラベルの前に出すアイコン。React: 描画済みのノード。Vue: 真値を入れた項目だけ item-icon スロット（{ item }）を出す。
      スロットを渡していなければ何も出さない。装飾として読み上げから外す。どれかの項目にあれば、無い項目も同じ幅を空ける。 */
  icon?: any;
}

/** 節の間に区切りの線を引く。 */
export interface UserPanelSection {
  items: UserPanelItem[];
}

export function userPanelSections(items: UserPanelItem[] | UserPanelSection[] | undefined): UserPanelSection[] {
  const list = items ?? [];
  const first = list[0];
  return first && 'items' in first ? list as UserPanelSection[] : [{ items: list as UserPanelItem[] }];
}

export function userPanelHasIcons(items: UserPanelItem[] | UserPanelSection[] | undefined) {
  return userPanelSections(items).some((section) => section.items.some((item) => !!item.icon));
}

/* カードを起点（パネル）の上に出し、入らなければ下へ。Popover API があれば top layer に出して、
   overflow: hidden の祖先やモーダルの dialog に切られないようにする。無ければ fixed のまま置く。 */
export function placeUserPanelCard(anchor: HTMLElement | null, card: HTMLElement | null) {
  if (!anchor || !card || card.hidden) return;
  if (typeof card.showPopover === 'function') {
    card.popover = 'manual';
    if (!card.matches(':popover-open')) card.showPopover();
  }
  const { gap, margin } = menuLengths(card);
  const bounds = anchor.getBoundingClientRect();
  const above = Math.max(0, bounds.top - gap - margin);
  const below = Math.max(0, window.innerHeight - bounds.bottom - gap - margin);
  const natural = card.scrollHeight + card.offsetHeight - card.clientHeight;
  const side = natural > above && below > above ? 'bottom' : 'top';
  card.style.setProperty('--user-panel-available-height', `${side === 'top' ? above : below}px`);
  card.dataset.side = side;
  card.style.left = `${Math.max(margin, Math.min(bounds.left, window.innerWidth - margin - card.offsetWidth))}px`;
  card.style.top = `${side === 'top' ? bounds.top - gap - card.offsetHeight : bounds.bottom + gap}px`;
}

/** 開いたときにフォーカスする最初の項目。無効な項目は飛ばす。 */
export function firstUserPanelItem(card: HTMLElement | null) {
  return card?.querySelector<HTMLElement>('[data-user-panel-item]:not([aria-disabled="true"])') ?? null;
}
