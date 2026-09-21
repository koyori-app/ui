import { onMount, onUnMount, onUpdate, Slot, useRef, useStore } from '@builder.io/mitosis';
import Field from '../Field/Field.lite';
import { createInlineEdit } from './inline-edit';
import type { InlineEditOptions } from './inline-edit';
import controls from '../shared/control.module.css';
import styles from './inline-edit.module.css';

export interface InlineEditProps extends InlineEditOptions {
  /** Unique on the page. Applied to the Input/Textarea through Field. */
  id: string;
  label: string;
  /** React: rendered, non-interactive content. Vue: use the display slot. */
  display?: any;
  /** The app owns the editor value/draft. Vue: default slot. */
  children?: any;
  description?: string;
  editLabel?: string;
  saveLabel?: string;
  cancelLabel?: string;
  savingLabel?: string;
}

export default function InlineEdit(props: InlineEditProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  let behavior = useRef<ReturnType<typeof createInlineEdit> | null>(null);
  const state = useStore({
    get status() {
      return props.saving ? props.savingLabel ?? '保存中…' : '';
    },
    sync() {
      if (!rootRef) return;
      if (!behavior) behavior = createInlineEdit(rootRef);
      behavior.update({
        editing: props.editing, saving: props.saving, disabled: props.disabled,
        commitOnBlur: props.commitOnBlur, multiline: props.multiline, error: props.error,
        onEdit: props.onEdit, onCommit: props.onCommit, onCancel: props.onCancel,
      });
    },
  });
  onMount(() => {
    state.sync();
  });
  onUpdate(() => {
    state.sync();
  }, [props.editing, props.saving, props.disabled, props.commitOnBlur, props.multiline, props.error, props.onEdit, props.onCommit, props.onCancel]);
  onUnMount(() => {
    behavior?.dispose();
    behavior = null;
  });

  return (
    <div ref={rootRef!} class={styles.root}>
      <button type="button" class={`${controls.button} ${styles.trigger}`} data-variant="ghost"
        data-inline-edit-action="edit" hidden={props.editing} disabled={props.disabled || props.saving}
        aria-labelledby={`${props.id}-edit-label ${props.id}-display`}
      >
        <span class={`${controls.surface} ${styles.display}`}>
          <span id={`${props.id}-edit-label`} class={styles.srOnly}>{props.editLabel ?? `${props.label}を編集`}:</span>
          <span id={`${props.id}-display`}><Slot name="display"><span>{props.label}</span></Slot></span>
        </span>
      </button>
      <fieldset class={styles.editor} data-inline-edit-editor="" hidden={!props.editing}
        disabled={props.disabled || props.saving} aria-busy={props.saving || undefined}
        aria-label={`${props.label}の編集`} tabIndex={-1}
        onKeyDown={(event) => behavior?.keydown(event)}
      >
        <Field id={props.id} label={props.label} description={props.description} error={props.error}>
          {props.children}
        </Field>
        <div class={styles.actions}>
          <button type="button" class={controls.button} data-inline-edit-action="commit">
            <span class={controls.surface}>{props.saveLabel ?? '保存'}</span>
          </button>
          <button type="button" class={controls.button} data-variant="tertiary" data-inline-edit-action="cancel">
            <span class={controls.surface}>{props.cancelLabel ?? 'キャンセル'}</span>
          </button>
        </div>
      </fieldset>
      <p class={styles.status} role="status" aria-atomic="true">{state.status}</p>
    </div>
  );
}
