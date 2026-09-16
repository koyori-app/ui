import { Show, useStore } from '@builder.io/mitosis';
import { formatPercent, progressRatio } from './progress';
import styles from './progress-bar.module.css';

export interface ProgressBarProps {
  /** Accessible name, also shown unless hideLabel is set. */
  label: string;
  /** Keep the accessible name while hiding the visible label. */
  hideLabel?: boolean;
  /** Current value, clamped to 0..max. */
  value: number;
  max?: number;
  /** Shown instead of the percentage and read out as the value, e.g. "3 / 5 件". */
  valueText?: string;
  /** Hides the number on the right. */
  hideValue?: boolean;
}

export default function ProgressBar(props: ProgressBarProps) {
  const state = useStore({
    get limit() {
      return props.max !== undefined && props.max > 0 ? props.max : 100;
    },
    /* getter 同士を参照すると Vue の生成物で ref のまま渡るため、props から計算する。 */
    get ratio() {
      return progressRatio(props.value, props.max ?? 100);
    },
  });

  return (
    <div class={styles.root} data-complete={state.ratio >= 1 ? 'true' : undefined}>
      <Show when={!props.hideLabel || !props.hideValue}>
        <div class={styles.header}>
          <Show when={!props.hideLabel}><span class={styles.label}>{props.label}</span></Show>
          <Show when={!props.hideValue}>
            <span class={styles.value}>{props.valueText ?? formatPercent(state.ratio)}</span>
          </Show>
        </div>
      </Show>
      <div class={styles.track} role="progressbar" aria-label={props.label}
        aria-valuemin={0} aria-valuemax={state.limit}
        aria-valuenow={state.ratio * state.limit}
        aria-valuetext={props.valueText}
      >
        <div class={styles.fill} style={{ width: `${state.ratio * 100}%` }} />
      </div>
    </div>
  );
}
