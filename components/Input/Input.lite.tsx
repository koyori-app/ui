import { useContext, useStore } from '@builder.io/mitosis';
import FieldContext from '../Field/field.context.lite';
import { getFieldContext } from '../Field/field';
import styles from '../Field/field.module.css';

export interface InputProps {
  /** Inside Field, Field's id is used. */
  id?: string;
  /** Required when not inside Field. */
  ariaLabel?: string;
  name?: string;
  type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';
  value?: string;
  placeholder?: string;
  autocomplete?: string;
  disabled?: boolean;
  readOnly?: boolean;
  onValueChange?: (value: string) => void;
}

export default function Input(props: InputProps) {
  const field = useContext(FieldContext);
  const state = useStore({
    get context() {
      return getFieldContext(field);
    },
    /* React は onChange のない制御入力を警告し、Vue の change は確定時にしか届かない。両方を受けて input だけ扱う。 */
    change(event: { type: string; target: EventTarget | null }) {
      if (event.type === 'input') props.onValueChange?.((event.target as HTMLInputElement).value);
    },
  });

  return (
    <input
      class={styles.control}
      id={state.context?.id ?? props.id}
      type={props.type || 'text'}
      name={props.name}
      value={props.value}
      placeholder={props.placeholder}
      autoComplete={props.autocomplete}
      disabled={props.disabled}
      readOnly={props.readOnly}
      required={state.context?.required}
      aria-label={props.ariaLabel}
      aria-describedby={state.context?.describedBy}
      aria-invalid={state.context?.invalid || undefined}
      onInput={(event) => state.change(event)}
      onChange={(event) => state.change(event)}
    />
  );
}
