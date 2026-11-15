export interface ComboboxOption {
  /** 一覧の中で一意。onSelect に渡る。 */
  value: string;
  /** 候補の名前。 */
  label: string;
  /** label の右に続ける補足。 */
  description?: string;
  /** 行の右端の補足（件数など）。 */
  meta?: string;
  /** label の前に出す色の点（CSS の色）。装飾。 */
  color?: string;
  /** label の中で強調する範囲。[開始, 終了) の UTF-16 位置。 */
  highlight?: [number, number][];
  disabled?: boolean;
}

export interface ComboboxSection {
  heading?: string;
  options: ComboboxOption[];
}

export interface ComboboxTag {
  label: string;
  /** label の前に弱い色で出す字（`status:` など）。 */
  prefix?: string;
  /** 外すボタンの読み上げ名。既定は prefix + label + を外す。 */
  removeLabel?: string;
}

export interface ComboboxLabelPart { text: string; strong: boolean }

export function comboboxSections(options: ComboboxOption[] | ComboboxSection[] | undefined): ComboboxSection[] {
  const first = options?.[0];
  if (!first) return [];
  return 'options' in first ? options as ComboboxSection[] : [{ options: options as ComboboxOption[] }];
}

export function comboboxEnabledValues(sections: ComboboxSection[]): string[] {
  const values: string[] = [];
  for (const section of sections) for (const option of section.options) if (!option.disabled) values.push(option.value);
  return values;
}

/* 今の候補。activeValue が一覧に無ければ、autoHighlight のとき先頭、そうでなければ無し（''）。 */
export function comboboxActiveValue(enabled: string[], activeValue: string, autoHighlight: boolean): string {
  if (activeValue && enabled.includes(activeValue)) return activeValue;
  return autoHighlight ? enabled[0] ?? '' : '';
}

/* ↑↓ の移動先。端で回る。候補が無ければ ''。 */
export function nextComboboxValue(enabled: string[], current: string, key: string): string {
  if (!enabled.length) return '';
  const index = enabled.indexOf(current);
  if (key === 'ArrowDown') return enabled[(index + 1) % enabled.length];
  if (key === 'ArrowUp') return enabled[(index <= 0 ? enabled.length : index) - 1];
  return current;
}

/* 範囲を並べ直し、重なりをまとめ、label の外を切り落として、強調と地の文に分ける。 */
export function comboboxLabelParts(label: string, ranges: [number, number][] | undefined): ComboboxLabelPart[] {
  const sorted = (ranges ?? [])
    .map(([start, end]) => [Math.max(0, Math.min(label.length, Math.trunc(start))), Math.max(0, Math.min(label.length, Math.trunc(end)))])
    .filter(([start, end]) => start < end)
    .sort((a, b) => a[0] - b[0]);
  const parts: ComboboxLabelPart[] = [];
  let cursor = 0;
  for (const [start, end] of sorted) {
    if (end <= cursor) continue;
    const from = Math.max(start, cursor);
    if (from > cursor) parts.push({ text: label.slice(cursor, from), strong: false });
    const last = parts[parts.length - 1];
    if (last?.strong && from === cursor) last.text += label.slice(from, end);
    else parts.push({ text: label.slice(from, end), strong: true });
    cursor = end;
  }
  if (cursor < label.length || !parts.length) parts.push({ text: label.slice(cursor), strong: false });
  return parts;
}

/* 変換中のキーか。Safari は compositionend の後に keyCode 229 の keydown を出す。 */
export function isComposingKey(event: { isComposing?: boolean; keyCode?: number; nativeEvent?: { isComposing?: boolean } }): boolean {
  return !!event.isComposing || !!event.nativeEvent?.isComposing || event.keyCode === 229;
}
