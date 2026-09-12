import { useContext, useStore } from '@builder.io/mitosis';
import FieldContext from '../Field/field.context.lite';
import { getFieldContext } from '../Field/field';
import styles from '../Field/field.module.css';

export interface TextareaProps {
  /** Inside Field, Field's id is used. */
  id?: string;
  /** Required when not inside Field. */
  ariaLabel?: string;
  name?: string;
  value?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  readOnly?: boolean;
  onValueChange?: (value: string) => void;
}

export default function Textarea(props: TextareaProps) {
  const field = useContext(FieldContext);
  const state = useStore({
    get context() {
      return getFieldContext(field);
    },
    /* React は onChange のない制御入力を警告し、Vue の change は確定時にしか届かない。両方を受けて input だけ扱う。 */
    change(event: { type: string; target: EventTarget | null }) {
      if (event.type === 'input') props.onValueChange?.((event.target as HTMLTextAreaElement).value);
    },
  });

  return (
    <textarea
      class={styles.control}
      id={state.context?.id ?? props.id}
      name={props.name}
      value={props.value}
      placeholder={props.placeholder}
      rows={props.rows ?? 3}
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
