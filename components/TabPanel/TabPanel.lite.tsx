import { useContext, useStore } from '@builder.io/mitosis';
import TabsContext from '../Tabs/tabs.context.lite';
import { getTabsContext, tabId, tabPanelId } from '../Tabs/tabs';
import styles from '../Tabs/tabs.module.css';

export interface TabPanelProps {
  /** Matches one item in the containing Tabs. */
  value: string;
  /** Use -1 when the panel starts with a focusable control. */
  tabIndex?: 0 | -1;
  children?: any;
}

export default function TabPanel(props: TabPanelProps) {
  const tabs = useContext(TabsContext);
  const state = useStore({
    get context() { return getTabsContext(tabs); },
  });
  return <div role="tabpanel" class={styles.panel}
    id={state.context?.id ? tabPanelId(state.context?.id ?? '', props.value) : undefined}
    aria-labelledby={state.context?.id ? tabId(state.context?.id ?? '', props.value) : undefined}
    hidden={!state.context?.id || state.context?.value !== props.value} tabIndex={props.tabIndex ?? 0}>
    {props.children}
  </div>;
}
