import { onMount, useStore } from '@builder.io/mitosis';
import Picker from '../Picker/Picker.lite';
import { setTheme, storedTheme, THEME_ITEMS } from './theme';
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
      state.choice = next;
      setTheme(next);
    },
  });
  onMount(() => { state.choice = storedTheme(); });

  return (
    <Picker label={props.label} searchable={false} selectedValues={[state.choice]} items={THEME_ITEMS}
      onSelectionChange={(values: string[]) => state.select(values)} />
  );
}
