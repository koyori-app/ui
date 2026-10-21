import { useStore } from '@builder.io/mitosis';
import { spinnerLabel, spinnerSize } from './spinner';
import styles from './spinner.module.css';

export interface SpinnerProps {
  /** 読み上げ文。hideLabel でなければ右側に表示する。既定 '読み込み中'。空白だけは既定に戻る。 */
  label?: string;
  /** 文字を見た目だけ隠し、読み上げには残す。Button のアイコンなど、狭い場所で使う。 */
  hideLabel?: boolean;
  /** リングの直径 px。既定 16（アイコンの既定と同じ）。非有限・0 以下は 16。 */
  size?: number;
}

export default function Spinner(props: SpinnerProps) {
  const state = useStore({
    /* getter 同士を参照すると Vue の生成物で ref のまま渡るため、どちらも props から計算する。 */
    get label() {
      return spinnerLabel(props.label);
    },
    get size() {
      return spinnerSize(props.size);
    },
  });

  /* role="status" の暗黙の aria-live に任せ、aria-live を重ねない（Alert と同じ）。
     リングは飾りなので読み上げから外し、状態は文字で伝える。 */
  return (
    <span class={styles.root} role="status">
      {/* インライン SVG に xmlns は付けない（EyeIcon のコメント参照）。 */}
      <svg
        class={styles.ring}
        width={state.size}
        height={state.size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
        style={{ display: 'block', flexShrink: '0', strokeWidth: '2.5', strokeLinecap: 'round' }}
      >
        <circle class={styles.track} cx="12" cy="12" r="10" />
        <circle class={styles.arc} cx="12" cy="12" r="10" />
      </svg>
      <span class={props.hideLabel ? styles.visuallyHidden : styles.label}>{state.label}</span>
    </span>
  );
}
