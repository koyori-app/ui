import { createContext } from '@builder.io/mitosis';
import type { TabsContextValue } from './tabs';

export default createContext<TabsContextValue>({
  id: undefined as string | undefined,
  value: undefined as string | undefined,
});
