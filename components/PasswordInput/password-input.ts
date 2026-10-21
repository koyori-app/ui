/* 読み上げ名の既定と、カーソル位置の控え・復元はここに置き、ブラウザーなしで検証する。 */

export const PASSWORD_TOGGLE_DEFAULT_LABEL = 'パスワードを表示';

/* 状態は aria-pressed で伝えるので、名前は切り替えても変えない。空白だけなら既定に戻す。 */
export function passwordToggleLabel(label: string | undefined) {
  return label && label.trim() ? label : PASSWORD_TOGGLE_DEFAULT_LABEL;
}

export interface PasswordSelection {
  start: number;
  end: number;
  direction: 'forward' | 'backward' | 'none';
}

type SelectionSource = Pick<HTMLInputElement, 'selectionStart' | 'selectionEnd' | 'selectionDirection'>;
type SelectionTarget = Pick<HTMLInputElement, 'value' | 'setSelectionRange'>;

/* type を password ⇔ text で入れ替えるとカーソル位置が失われるため、切り替える前に控える。 */
export function captureSelection(input: SelectionSource | null | undefined): PasswordSelection | null {
  if (!input || input.selectionStart === null || input.selectionEnd === null) return null;
  return {
    start: input.selectionStart,
    end: input.selectionEnd,
    direction: input.selectionDirection ?? 'none',
  };
}

/* 描画後に控えた位置へ戻す。値が短くなっていても範囲外を指さないよう、長さに収める。
   フォーカスは動かさない（切り替えボタンに留める）。 */
export function restoreSelection(input: SelectionTarget | null | undefined, selection: PasswordSelection | null) {
  if (!input || !selection) return false;
  const length = input.value.length;
  const start = Math.min(selection.start, length);
  const end = Math.min(Math.max(selection.end, start), length);
  input.setSelectionRange(start, end, selection.direction);
  return true;
}
