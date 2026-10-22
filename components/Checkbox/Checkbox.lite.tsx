import { Show, onMount, onUpdate, useDefaultProps, useRef, useStore } from '@builder.io/mitosis';
import styles from './checkbox.module.css';

export interface CheckboxProps {
  label: string;
  /** Keep the accessible name while hiding the visible label. */
  hideLabel?: boolean;
  id?: string;
  name?: string;
  value?: string;
  /** Omit to let the native input manage its state. */
  checked?: boolean;
  /** Shows the mixed state while true. A click still reports the flipped checked; derive this from it. */
  indeterminate?: boolean;
  disabled?: boolean;
  required?: boolean;
  ariaDescribedBy?: string;
  onCheckedChange?: (checked: boolean) => void;
}

export default function Checkbox(props: CheckboxProps) {
  // Vue otherwise casts an omitted Boolean prop to false.
  useDefaultProps({ checked: undefined });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const state = useStore({
    // indeterminate exists only as a DOM property, not as an attribute.
    syncIndeterminate() {
      if (inputRef) inputRef.indeterminate = !!props.indeterminate;
    },
    change(event: { target: EventTarget | null }) {
      const input = event.target as HTMLInputElement;
      const checked = input.checked;
      // Keep controlled inputs in sync even when the parent rejects a change.
      if (props.checked !== undefined) input.checked = props.checked;
      // The browser clears indeterminate on click; restore it while the parent still asks for it.
      input.indeterminate = !!props.indeterminate;
      props.onCheckedChange?.(checked);
    },
  });

  onMount(() => { state.syncIndeterminate(); });
  onUpdate(() => { state.syncIndeterminate(); }, [props.indeterminate]);

  return (
    <label class={styles.root} data-disabled={props.disabled || undefined}>
      <span class={styles.control}>
        <input ref={inputRef!} class={styles.input} type="checkbox" id={props.id} name={props.name}
          value={props.value ?? 'on'} checked={props.checked} disabled={props.disabled}
          required={props.required} aria-checked={props.indeterminate ? 'mixed' : undefined} aria-label={props.hideLabel ? props.label : undefined} aria-describedby={props.ariaDescribedBy}
          onChange={(event) => state.change(event)}
        />
        <span class={styles.box} aria-hidden="true">
          <svg class={styles.mark} viewBox="0 0 20 20" fill="none">
            <path class={styles.check} d="M4 10 8 14 16 6" pathLength="1" />
            <path class={styles.dash} d="M5 10h10" />
          </svg>
        </span>
      </span>
      <Show when={!props.hideLabel}><span class={styles.label}>{props.label}</span></Show>
    </label>
  );
}
