import { onMount, onUpdate, useContext, useRef, useStore } from '@builder.io/mitosis';
import FieldContext from '../Field/field.context.lite';
import { getFieldContext } from '../Field/field';
import styles from '../Field/field.module.css';

export interface InputProps {
  /** Inside Field, the Field id is used. */
  id?: string;
  /** Required when not inside Field. */
  ariaLabel?: string;
  name?: string;
  type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number';
  /** Numeric constraints use native HTML validation; values are not clamped. */
  min?: number;
  max?: number;
  step?: number | 'any';
  value?: string;
  placeholder?: string;
  autocomplete?: string;
  disabled?: boolean;
  readOnly?: boolean;
  onValueChange?: (value: string) => void;
  /** Number inputs only: valid value on blur or Enter. Empty is null; zero is 0. */
  onNumberCommit?: (value: number | null) => void;
  /** Number inputs only: native validation message when a commit is rejected. */
  onNumberInvalid?: (message: string) => void;
}

export default function Input(props: InputProps) {
  const field = useContext(FieldContext);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const state = useStore({
    numberCommitted: false,
    numberInvalid: false,
    get context() {
      return getFieldContext(field);
    },
    syncValidity() {
      // React mirrors value into the HTML attribute; Vue only sets the property.
      // Keep the step base at min (or 0), independent of the current draft.
      if (props.type === 'number' && inputRef?.hasAttribute('value')) {
        const value = inputRef.value;
        inputRef.removeAttribute('value');
        if (inputRef.value !== value) inputRef.value = value;
      }
      const invalid = props.type === 'number' && !!inputRef && !inputRef.validity.valid;
      if (invalid !== state.numberInvalid) state.numberInvalid = invalid;
    },
    /* React は onChange のない制御入力を警告し、Vue の change は確定時にしか届かない。両方を受けて input だけ扱う。 */
    change(event: { type: string; target: EventTarget | null }) {
      if (event.type !== 'input' || props.disabled || props.readOnly) return;
      const input = event.target as HTMLInputElement;
      state.numberCommitted = false;
      state.syncValidity();
      props.onValueChange?.(input.value);
    },
    commit(event: { target: EventTarget | null }) {
      if (props.type !== 'number' || props.disabled || props.readOnly || state.numberCommitted) return;
      const input = event.target as HTMLInputElement;
      state.syncValidity();
      if (!input.validity.valid) {
        props.onNumberInvalid?.(input.validationMessage);
        return;
      }
      state.numberCommitted = true;
      props.onNumberCommit?.(input.value === '' ? null : input.valueAsNumber);
    },
    keydown(event: { key: string; keyCode?: number; isComposing?: boolean; nativeEvent?: { isComposing?: boolean }; target: EventTarget | null }) {
      if (event.key === 'Enter' && !event.isComposing && !event.nativeEvent?.isComposing && event.keyCode !== 229) state.commit(event);
    },
  });

  onMount(() => { state.syncValidity(); });
  onUpdate(() => { state.syncValidity(); });

  return (
    <input
      ref={inputRef!}
      class={styles.control}
      id={state.context?.id ?? props.id}
      type={props.type || 'text'}
      min={props.type === 'number' ? props.min : undefined}
      max={props.type === 'number' ? props.max : undefined}
      step={props.type === 'number' ? props.step : undefined}
      name={props.name}
      value={props.value}
      placeholder={props.placeholder}
      autoComplete={props.autocomplete}
      disabled={props.disabled}
      readOnly={props.readOnly}
      required={state.context?.required}
      aria-label={props.ariaLabel}
      aria-describedby={state.context?.describedBy}
      aria-invalid={state.context?.invalid || (props.type === 'number' && state.numberInvalid) || undefined}
      onFocus={() => { state.numberCommitted = false; }}
      onBlur={(event) => state.commit(event)}
      onKeyDown={(event) => state.keydown(event)}
      onInput={(event) => state.change(event)}
      onChange={(event) => state.change(event)}
    />
  );
}
