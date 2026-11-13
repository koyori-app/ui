export type Theme = 'light' | 'dark' | 'system';

/** ThemePicker の項目。描画のたびに配列を作り直さない。 */
export const THEME_ITEMS = [{ value: 'light', label: 'ライト' }, { value: 'dark', label: 'ダーク' }, { value: 'system', label: 'システム' }];

const KEY = 'koyori-theme';
const LIGHT = '(prefers-color-scheme: light)';

/** setTheme が現在の選択（detail: Theme）を window に知らせるイベント。themeScript と ThemePicker が聞く。 */
export const THEME_EVENT = 'koyori-theme-change';

/** <head> に inline の <script> として置く。最初の描画の前に html[data-theme] を決め、OS の配色の変化にも追従する。
    選択は初期値だけ localStorage から読み、以後は setTheme のイベントで持つ（保存に失敗しても OS の変化で戻らない）。
    規則は storedTheme + setTheme と同じ（scripts/check-theme-picker.cjs が突き合わせる）。 */
export const themeScript = `(function(){var m=matchMedia('${LIGHT}'),c;function a(){document.documentElement.dataset.theme=c==='light'||c==='dark'?c:m.matches?'light':'dark'}try{c=localStorage.getItem('${KEY}')}catch(e){}a();m.addEventListener('change',a);window.addEventListener('${THEME_EVENT}',function(e){c=e.detail;a()})})()`;

/** 保持している選択。無い・読めない・知らない値は 'system'。 */
export function storedTheme(): Theme {
  try {
    const theme = localStorage.getItem(KEY);
    return theme === 'light' || theme === 'dark' ? theme : 'system';
  } catch {
    return 'system';
  }
}

/** 選択を保持し、html[data-theme] を 'light' か 'dark' にする。'system' は保持を消して OS の配色に合わせる。 */
export function setTheme(theme: Theme) {
  try {
    if (theme === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch { /* 保持できなくても、この表示の間は切り替える。 */ }
  document.documentElement.dataset.theme = theme === 'system' ? (matchMedia(LIGHT).matches ? 'light' : 'dark') : theme;
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}
