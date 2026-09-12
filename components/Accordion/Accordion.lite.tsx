import { onUpdate, Slot, useDefaultProps, useRef, useStore } from '@builder.io/mitosis';
import ChevronDownIcon from '../ChevronDownIcon/ChevronDownIcon.lite';
import controls from '../shared/control.module.css';
import styles from './accordion.module.css';

export interface AccordionProps {
  /** Unique on the page; also keeps the server-rendered ARIA references stable. */
  id: string;
  label: string;
  open?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** React: rendered icon. Vue: use the icon slot. */
  icon?: any;
  children?: any;
  onOpenChange?: (open: boolean) => void;
}

export default function Accordion(props: AccordionProps) {
  // Preserve undefined in Vue so an omitted open prop uses internal state.
  useDefaultProps({ open: undefined });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const state = useStore({
    storedOpen: props.defaultOpen ?? false,
    isOpen() {
      return props.open ?? state.storedOpen;
    },
    toggle() {
      if (props.disabled) return;
      const next = !state.isOpen();
      if (props.open === undefined) state.storedOpen = next;
      props.onOpenChange?.(next);
    },
  });

  onUpdate(() => {
    if (!state.isOpen() && panelRef?.contains(document.activeElement)) triggerRef?.focus();
  }, [props.open, state.storedOpen]);

  return (
    <div class={styles.root}>
      <div class={styles.heading} role="heading" aria-level={props.headingLevel ?? 3}>
        <button ref={triggerRef!} id={`${props.id}-trigger`} type="button"
          class={`${controls.button} ${styles.trigger}`} data-variant="ghost" disabled={props.disabled}
          aria-expanded={state.isOpen()} aria-controls={`${props.id}-panel`} onClick={() => state.toggle()}
        >
          <span class={`${controls.surface} ${styles.surface}`}>
            <span class={controls.icon} aria-hidden="true"><Slot name="icon" /></span>
            <span class={styles.label}>{props.label}</span>
            <span class={styles.chevron} aria-hidden="true"><ChevronDownIcon /></span>
          </span>
        </button>
      </div>
      <div ref={panelRef!} id={`${props.id}-panel`} class={styles.panel} hidden={!state.isOpen()}>
        {props.children}
      </div>
    </div>
  );
}
