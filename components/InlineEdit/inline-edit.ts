export type InlineEditCommitReason = 'enter' | 'blur' | 'button';

export interface InlineEditOptions {
  editing: boolean;
  saving?: boolean;
  disabled?: boolean;
  commitOnBlur?: boolean;
  multiline?: boolean;
  error?: string;
  onEdit?: (event?: unknown) => void;
  onCommit?: (reason: InlineEditCommitReason) => void;
  onCancel?: (event?: unknown) => void;
}

type InlineEditKeyEvent = Pick<KeyboardEvent, 'key' | 'keyCode' | 'ctrlKey' | 'metaKey' | 'target' | 'defaultPrevented' | 'preventDefault' | 'stopPropagation'> & {
  isComposing?: boolean;
  nativeEvent?: { isComposing?: boolean };
};

// Native bubbling events keep composition and focusout identical in Vue and React.
export function createInlineEdit(root: HTMLElement) {
  const trigger = root.querySelector<HTMLButtonElement>('[data-inline-edit-action="edit"]')!;
  const editor = root.querySelector<HTMLFieldSetElement>('[data-inline-edit-editor]')!;
  let options: InlineEditOptions = { editing: false };
  let ended = false;
  let requesting = false;
  let composing = false;
  let restoreFocus = true;
  let frame = 0;

  const blocked = () => options.disabled || options.saving || (options.editing ? editor.disabled : trigger.disabled);
  const focusEditor = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (!options.editing || ended || blocked()) return;
      const control = editor.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), select:not(:disabled), [contenteditable="true"], [tabindex]:not([tabindex="-1"])',
      );
      (control ?? editor).focus();
    });
  };
  const commit = (reason: InlineEditCommitReason) => {
    if (!options.editing || ended || requesting || blocked() || composing) return;
    restoreFocus = reason !== 'blur';
    requesting = true;
    try {
      options.onCommit?.(reason);
    } finally {
      // A synchronous close/disable can emit focusout before framework props update.
      queueMicrotask(() => { requesting = false; });
    }
  };
  const cancel = () => {
    if (!options.editing || ended || blocked() || composing) return;
    ended = true; // Set before notifying: unmount/hide may immediately emit blur.
    restoreFocus = true;
    options.onCancel?.();
  };
  const click = (event: MouseEvent) => {
    const action = (event.target as Element).closest<HTMLElement>('[data-inline-edit-action]');
    if (!action || !root.contains(action) || blocked()) return;
    if (action.dataset.inlineEditAction === 'edit') options.onEdit?.();
    else if (action.dataset.inlineEditAction === 'cancel') cancel();
    else commit('button');
  };
  const keydown = (event: InlineEditKeyEvent) => {
    if (!options.editing || event.defaultPrevented || composing || event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      cancel();
    } else if (event.key === 'Enter') {
      const target = event.target as HTMLElement;
      if (!target.matches('input, textarea, [contenteditable="true"]') && !target.isContentEditable) return;
      const multiline = options.multiline || target.matches('textarea') || target.isContentEditable;
      if (multiline && !(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      event.stopPropagation();
      commit('enter');
    }
  };
  const focusout = (event: FocusEvent) => {
    if (event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) return;
    if (options.commitOnBlur) commit('blur');
  };
  const compositionstart = () => { composing = true; };
  const compositionend = () => { composing = false; };
  root.addEventListener('click', click);
  editor.addEventListener('focusout', focusout);
  editor.addEventListener('compositionstart', compositionstart);
  editor.addEventListener('compositionend', compositionend);

  return {
    keydown,
    update(next: InlineEditOptions) {
      const previous = options;
      options = next;
      if (next.editing && !previous.editing) {
        ended = false;
        composing = false;
        restoreFocus = true;
        focusEditor();
      } else if (!next.editing && previous.editing) {
        ended = true;
        composing = false;
        cancelAnimationFrame(frame);
        // Outside clicks/Tab keep their destination, including during async saves.
        if (restoreFocus) {
          frame = requestAnimationFrame(() => {
            if (!options.editing && (root.contains(document.activeElement) || document.activeElement === document.body)) trigger.focus();
          });
        }
      } else if (next.editing && !next.saving && next.error && (previous.saving || next.error !== previous.error)) {
        if (root.contains(document.activeElement) || document.activeElement === document.body) focusEditor();
      }
    },
    dispose() {
      cancelAnimationFrame(frame);
      root.removeEventListener('click', click);
      editor.removeEventListener('focusout', focusout);
      editor.removeEventListener('compositionstart', compositionstart);
      editor.removeEventListener('compositionend', compositionend);
    },
  };
}
