import { Show, useContext, useDefaultProps, useStore } from '@builder.io/mitosis';
import FieldContext from '../Field/field.context.lite';
import { getFieldContext } from '../Field/field';
import styles from './switch.module.css';

export interface SwitchProps {
  /** 読み上げ名。hideLabel でなければ右側に表示する。 */
  label: string;
  /** Field の中で使うとき、Field のラベルを見える名前にするために付ける。 */
  hideLabel?: boolean;
  /** Field の中では Field の id を使う。 */
  id?: string;
  /** 省略すると内部で状態を持つ（defaultChecked が初期値）。 */
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  ariaDescribedBy?: string;
  onCheckedChange?: (checked: boolean) => void;
}

export default function Switch(props: SwitchProps) {
  // Vue otherwise casts an omitted Boolean prop to false.
  useDefaultProps({ checked: undefined });
  const field = useContext(FieldContext);
  const state = useStore({
    storedChecked: props.defaultChecked ?? false,
    get context() {
      return getFieldContext(field);
    },
    isChecked() {
      return props.checked ?? state.storedChecked;
    },
    toggle() {
      const next = !state.isChecked();
      /* 制御されているときは親の返事を待ち、内部状態は動かさない。 */
      if (props.checked === undefined) state.storedChecked = next;
      props.onCheckedChange?.(next);
    },
  });

  /* button は labelable なので、ラベルの文字を押しても切り替わる。 */
  return (
    <label class={styles.root} data-disabled={props.disabled || undefined}>
      <button type="button" role="switch" class={styles.track}
        id={state.context?.id ?? props.id}
        aria-checked={state.isChecked() ? 'true' : 'false'}
        aria-describedby={state.context?.describedBy ?? props.ariaDescribedBy}
        aria-label={props.hideLabel ? props.label : undefined}
        disabled={props.disabled}
        onClick={() => state.toggle()}
      >
        <span class={styles.thumb} aria-hidden="true" />
      </button>
      <Show when={!props.hideLabel}><span class={styles.label}>{props.label}</span></Show>
    </label>
  );
}
