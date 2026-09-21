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

export function listenToTabs(list: HTMLElement | null) {
  if (!list) return () => {};
  const highlight = listenToSidebar(list);
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
  const items = new MutationObserver(() => {
    if (!focusedTab || (list.contains(focusedTab) && !focusedTab.disabled)) return;
    const active = list.ownerDocument.activeElement;
    const restore = active === list.ownerDocument.body || active === focusedTab;
    focusedTab = null;
    if (restore) list.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]:not(:disabled)')?.focus();
  });
  items.observe(list, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
  list.addEventListener('focusin', focus);
  list.addEventListener('focusout', blur);
  return () => {
    highlight();
    items.disconnect();
    list.removeEventListener('focusin', focus);
    list.removeEventListener('focusout', blur);
  };
}
