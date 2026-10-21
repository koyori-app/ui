import { For, Show, useStore } from '@builder.io/mitosis';
import { meterMax, meterSegments, meterTone, meterValue } from './meter';
import type { MeterTone } from './meter';
import styles from './meter.module.css';

export interface MeterProps {
  /** 読み上げ名。hideLabel でなければ左上に表示する。 */
  label: string;
  /** 読み上げ名を保ったまま、表示ラベルを隠す。 */
  hideLabel?: boolean;
  /** 満たした段の数。0..max に丸め、小数は切り捨て、非有限は 0。 */
  value: number;
  /** 段の数。既定 3。非有限・1 未満は 3、小数は切り捨て、上限 20。 */
  max?: number;
  /** 右上の表示と aria-valuetext（例: '弱い'）。無ければ右上は出ない。 */
  valueText?: string;
  /** 右上の valueText を隠す。読み上げには残る。 */
  hideValue?: boolean;
  /** 色。既定 'auto' = 0 は neutral、1/3 以下 danger、2/3 以下 warning、それ以上 success。
   * 残量のように「多いほど良い」と限らない場合や、色の意味を固定したい場合は明示する。 */
  tone?: MeterTone;
}

export default function Meter(props: MeterProps) {
  const state = useStore({
    /* getter 同士を参照すると Vue の生成物で ref のまま渡るため、どれも props から計算する。 */
    get limit() {
      return meterMax(props.max);
    },
    get current() {
      return meterValue(props.value, props.max);
    },
    get tone() {
      return meterTone(props.tone, props.value, props.max);
    },
    get segments() {
      return meterSegments(props.max);
    },
  });

  /* 値の変化は読み上げない（ProgressBar と同じ）。通知が要る場合は利用側が段の変わった時だけ status で出す。 */
  return (
    <div class={styles.root} data-tone={state.tone}>
      <Show when={!props.hideLabel || (!props.hideValue && props.valueText)}>
        <div class={styles.header}>
          <Show when={!props.hideLabel}><span class={styles.label}>{props.label}</span></Show>
          <Show when={!props.hideValue && props.valueText}>
            <span class={styles.value}>{props.valueText}</span>
          </Show>
        </div>
      </Show>
      <div class={styles.track} role="meter" aria-label={props.label}
        aria-valuemin={0} aria-valuemax={state.limit}
        aria-valuenow={state.current}
        aria-valuetext={props.valueText}
      >
        <For each={state.segments}>
          {(segment) => (
            <span key={segment} class={styles.segment} data-filled={segment < state.current ? 'true' : undefined} />
          )}
        </For>
      </div>
    </div>
  );
}
