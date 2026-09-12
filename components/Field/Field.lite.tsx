import { Show, setContext } from '@builder.io/mitosis';
import FieldContext from './field.context.lite';
import styles from './field.module.css';

export interface FieldProps {
  /** Applied to the Input, Textarea or Picker trigger inside. */
  id: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  requiredText?: string;
  children?: any;
}

export default function Field(props: FieldProps) {
  setContext(FieldContext, {
    get id() {
      return props.id;
    },
    get labelId() {
      return `${props.id}-label`;
    },
    get describedBy() {
      const ids = [props.description && `${props.id}-description`, props.error && `${props.id}-error`];
      return ids.filter(Boolean).join(' ') || undefined;
    },
    get invalid() {
      return !!props.error;
    },
    get required() {
      return !!props.required;
    },
    get requiredId() {
      return props.required ? `${props.id}-required` : undefined;
    },
  });

  return (
    <div class={styles.field}>
      <label class={styles.label} for={props.id}>
        <span id={`${props.id}-label`}>{props.label}</span>
        <Show when={props.required}>
          <span id={`${props.id}-required`} class={styles.required} aria-hidden="true">{props.requiredText ?? '必須'}</span>
        </Show>
      </label>
      <Show when={props.description}>
        <p id={`${props.id}-description`} class={styles.description}>{props.description}</p>
      </Show>
      {props.children}
      <p id={`${props.id}-error`} class={styles.error} aria-live="polite" aria-atomic="true">{props.error}</p>
    </div>
  );
}
