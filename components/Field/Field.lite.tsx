import { Show, Slot, setContext } from '@builder.io/mitosis';
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
  /** How the required mark looks. 'asterisk' shows "*" and keeps requiredText for screen readers. Default 'text'. */
  requiredMark?: 'text' | 'asterisk';
  /** Where the description goes: above the control (default) or below it. */
  descriptionPosition?: 'top' | 'bottom';
  /** React: rendered element. Vue: use the aside slot. Shown at the end of the label row, e.g. a link. */
  aside?: any;
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

  /* aside は label の外に置く。中に入れるとリンクの操作がラベルのクリックと干渉し、読み上げ名にも混ざる。 */
  return (
    <div class={styles.field}>
      <div class={styles.labelRow}>
        <label class={styles.label} for={props.id}>
          <span id={`${props.id}-label`}>{props.label}</span>
          {/* 印は読み上げから外し、Picker などは aria-labelledby で ${id}-required の文言を名前に含める。
              asterisk では、その id を見た目だけ隠した requiredText に付け、見える * は別の要素にする。 */}
          <Show when={props.required && props.requiredMark !== 'asterisk'}>
            <span id={`${props.id}-required`} class={styles.required} aria-hidden="true">{props.requiredText ?? '必須'}</span>
          </Show>
          <Show when={props.required && props.requiredMark === 'asterisk'}>
            <span class={styles.required} aria-hidden="true">*</span>
            <span id={`${props.id}-required`} class={styles.srOnly} aria-hidden="true">{props.requiredText ?? '必須'}</span>
          </Show>
        </label>
        <span class={styles.aside}><Slot name="aside" /></span>
      </div>
      {/* 位置を変えても id は同じなので、中の入力欄の aria-describedby はそのまま。 */}
      <Show when={props.description && props.descriptionPosition !== 'bottom'}>
        <p id={`${props.id}-description`} class={styles.description}>{props.description}</p>
      </Show>
      {props.children}
      <Show when={props.description && props.descriptionPosition === 'bottom'}>
        <p id={`${props.id}-description`} class={styles.description}>{props.description}</p>
      </Show>
      <p id={`${props.id}-error`} class={styles.error} aria-live="polite" aria-atomic="true">{props.error}</p>
    </div>
  );
}
