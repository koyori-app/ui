import { normalizeMenuText } from '../shared/menu';

export const PICKER_ANNOUNCE_DELAY = 300;

interface Item {
  value: string;
  label: string;
  disabled?: boolean;
  src?: string;
}

export interface PickerOption extends Item {
  sourceIndex: number;
  selected: boolean;
  above: boolean;
  below: boolean;
}

export function pickerValues(items: Item[], values: string[], multiple: boolean): string[] {
  const selected = new Set(values);
  const available = items.filter(item => selected.has(item.value)).map(item => item.value);
  return multiple ? available : available.slice(0, 1);
}

/** Precompute row state once per list, including neighbours after filtering. */
export function pickerOptions(items: Item[], values: string[], query: string): PickerOption[] {
  const selected = new Set(values);
  const term = normalizeMenuText(query);
  const rows = items.flatMap((item, sourceIndex) => normalizeMenuText(item.label).includes(term)
    ? [{ ...item, sourceIndex, selected: selected.has(item.value), above: false, below: false }]
    : []);
  return rows.map((row, index) => ({ ...row, above: !!rows[index - 1]?.selected, below: !!rows[index + 1]?.selected }));
}
