import { listenToSidebar } from '../Sidebar/sidebar';

export interface TabItem {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface TabsContextValue {
  id?: string;
  value?: string;
}

export function getTabsContext(value: unknown): TabsContextValue | undefined {
  return value as TabsContextValue | undefined;
}

export function selectedTab(items: TabItem[], value: string): string | undefined {
  return items.find(item => item.value === value && !item.disabled)?.value
    ?? items.find(item => !item.disabled)?.value;
}

export function tabId(id: string, value: string) {
  return `${id}-tab-${encodeURIComponent(value)}`;
}

export function tabPanelId(id: string, value: string) {
  return `${id}-panel-${encodeURIComponent(value)}`;
}

/* Keep focus out of a panel hidden by an external value change. */
export function syncTabFocus(root: HTMLElement | null) {
  if (!root) return;
  const active = root.ownerDocument.activeElement;
  if (active instanceof HTMLElement && root.contains(active) && active.closest('[role="tabpanel"][hidden]')) {
    root.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus();
  }
  const list = root.querySelector<HTMLElement>('[role="tablist"]');
  if (list) tabStop(list, list.contains(root.ownerDocument.activeElement) ? root.ownerDocument.activeElement : null);
}

function tabStop(list: HTMLElement, focused: Element | null) {
  for (const tab of list.querySelectorAll<HTMLButtonElement>('[role="tab"]')) {
    tab.tabIndex = !tab.disabled && (focused ? tab === focused : tab.getAttribute('aria-selected') === 'true') ? 0 : -1;
  }
}

/* One selection surface and underline travel to the selected tab. Layout changes reposition them without animating. */
export function placeTabIndicator(list: HTMLElement | null, animate = true) {
  if (!list) return;
  const tab = list.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
  if (!tab) {
    list.style.setProperty('--tab-indicator-opacity', '0');
    return;
  }
  if (!animate) list.style.setProperty('--tab-indicator-transition', 'none');
  list.style.setProperty('--tab-indicator-x', `${tab.offsetLeft}px`);
  list.style.setProperty('--tab-indicator-y', `${tab.offsetTop}px`);
  list.style.setProperty('--tab-indicator-width', `${tab.offsetWidth}px`);
  list.style.setProperty('--tab-indicator-height', `${tab.offsetHeight}px`);
  list.style.setProperty('--tab-indicator-opacity', '1');
  if (!animate) {
    list.querySelector('[data-tab-indicator]')?.getBoundingClientRect();
    list.style.removeProperty('--tab-indicator-transition');
  }
}

export function listenToTabs(list: HTMLElement | null) {
  if (!list) return () => {};
  const highlight = listenToSidebar(list);
  const sizes = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => placeTabIndicator(list, false));
  const observeSizes = () => {
    sizes?.disconnect();
    sizes?.observe(list);
    list.querySelectorAll('[role="tab"]').forEach(tab => sizes?.observe(tab));
  };
  observeSizes();
  placeTabIndicator(list, false);
  let focusedTab: HTMLButtonElement | null = null;
  const focus = () => {
    focusedTab = list.querySelector<HTMLButtonElement>('[role="tab"]:focus');
    tabStop(list, focusedTab);
  };
  const blur = (event: FocusEvent) => {
    if (!list.contains(event.relatedTarget as Node | null)) {
      // Removal can fire blur before disconnecting the button. Check after the DOM update.
      const previous = focusedTab;
      queueMicrotask(() => {
        if (focusedTab === previous && previous?.isConnected && !previous.disabled && !list.contains(list.ownerDocument.activeElement)) focusedTab = null;
      });
      tabStop(list, null);
    }
  };
  const items = new MutationObserver((records) => {
    if (records.some(record => record.type === 'childList')) {
      observeSizes();
      placeTabIndicator(list, false);
    } else if (records.some(record => record.attributeName === 'aria-selected')) {
      placeTabIndicator(list, true);
    }
    if (!focusedTab || (list.contains(focusedTab) && !focusedTab.disabled)) return;
    const active = list.ownerDocument.activeElement;
    const restore = active === list.ownerDocument.body || active === focusedTab;
    focusedTab = null;
    if (restore) list.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]:not(:disabled)')?.focus();
  });
  items.observe(list, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'aria-selected'] });
  list.addEventListener('focusin', focus);
  list.addEventListener('focusout', blur);
  return () => {
    highlight();
    sizes?.disconnect();
    items.disconnect();
    list.removeEventListener('focusin', focus);
    list.removeEventListener('focusout', blur);
  };
}
