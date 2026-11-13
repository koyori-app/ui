import { onMount, onUnMount, useStore } from '@builder.io/mitosis';
import Picker from '../Picker/Picker.lite';
import { setTheme, storedTheme, THEME_EVENT, THEME_ITEMS } from './theme';
import type { Theme } from './theme';

export interface ThemePickerProps {
  /** 読み上げ名（トリガーは「<label>: ライト」のように読まれる）。 */
  label: string;
}

export default function ThemePicker(props: ThemePickerProps) {
  const state = useStore({
    /* サーバーは保持した選択を知らない。'system' で描き、マウント後に読み直す。 */
    choice: 'system' as Theme,
    select(values: string[]) {
      /* 選択中の項目をもう一度押しても、選択なしにはしない。 */
      const next = values[0] as Theme | undefined;
      if (!next) return;
      /* 表示は setTheme のイベントで更新する。別の ThemePicker や setTheme の直接呼び出しでも同じ経路。 */
      setTheme(next);
    },
    sync(event: Event) {
      state.choice = (event as CustomEvent<Theme>).detail;
    },
  });
  onMount(() => {
    state.choice = storedTheme();
    window.addEventListener(THEME_EVENT, state.sync);
  });
  onUnMount(() => { window.removeEventListener(THEME_EVENT, state.sync); });

  return (
    <Picker label={props.label} searchable={false} selectedValues={[state.choice]} items={THEME_ITEMS}
      onSelectionChange={(values: string[]) => state.select(values)} />
  );
}
