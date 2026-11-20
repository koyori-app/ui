import { onMount, onUnMount, useRef, useStore } from '@builder.io/mitosis';
import { setTheme } from '../ThemePicker/theme';
import styles from './theme-switch.module.css';

export interface ThemeSwitchProps {
  /** 読み上げ名。入（aria-checked="true"）がダークなので、「ダークテーマ」のように付ける。 */
  label: string;
}

export default function ThemeSwitch(props: ThemeSwitchProps) {
  let observerRef = useRef<MutationObserver | null>(null);
  const state = useStore({
    /* サーバーは配色を知らない。data-theme が無いときの既定（ダーク）で描き、マウント後に読み直す。
       見た目は CSS が html[data-theme] から決めるので、マウント前から正しい位置で描かれる。 */
    dark: true,
    read() {
      state.dark = document.documentElement.dataset.theme !== 'light';
    },
    toggle() {
      /* 表示は html[data-theme] の変化で更新する。ThemePicker・setTheme・themeScript（OS の変化）でも同じ経路。 */
      setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
    },
  });
  onMount(() => {
    state.read();
    observerRef = new MutationObserver(() => state.read());
    observerRef.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  });
  onUnMount(() => { observerRef?.disconnect(); });

  return (
    <button type="button" role="switch" class={styles.track} aria-label={props.label}
      aria-checked={state.dark ? 'true' : 'false'} onClick={() => state.toggle()}>
      <span class={styles.day} aria-hidden="true" />
      <span class={styles.night} aria-hidden="true" />
      <span class={styles.halo} aria-hidden="true" />
      <span class={styles.stars} aria-hidden="true">
        <i /><i /><i /><i /><i /><i />
      </span>
      <span class={styles.clouds} aria-hidden="true" />
      <span class={styles.thumb} aria-hidden="true">
        <span class={styles.moon} />
      </span>
    </button>
  );
}
