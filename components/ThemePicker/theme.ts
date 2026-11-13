export type Theme = 'light' | 'dark' | 'system';

/** ThemePicker の項目。描画のたびに配列を作り直さない。 */
export const THEME_ITEMS = [{ value: 'light', label: 'ライト' }, { value: 'dark', label: 'ダーク' }, { value: 'system', label: 'システム' }];

const KEY = 'koyori-theme';
const LIGHT = '(prefers-color-scheme: light)';

/** <head> に inline の <script> として置く。最初の描画の前に html[data-theme] を決め、OS の配色の変化にも追従する。
    規則は storedTheme + setTheme と同じ（scripts/check-theme-picker.cjs が突き合わせる）。 */
export const themeScript = `(function(){var m=matchMedia('${LIGHT}');function a(){var t;try{t=localStorage.getItem('${KEY}')}catch(e){}document.documentElement.dataset.theme=t==='light'||t==='dark'?t:m.matches?'light':'dark'}a();m.addEventListener('change',a)})()`;

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
}
