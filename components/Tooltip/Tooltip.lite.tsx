import { onMount, onUnMount, onUpdate, useRef } from '@builder.io/mitosis';
import { connectTooltip } from './tooltip';
import styles from './tooltip.module.css';

export interface TooltipProps {
  /** Unique, stable id for the description. */
  id: string;
  /** Plain text only. Keep essential instructions visible outside the tooltip. */
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Disables the tooltip, not the trigger. */
  disabled?: boolean;
  /** One element with a focusable DOM root. Vue: default slot. */
  children?: any;
}

export default function Tooltip(props: TooltipProps) {
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const panelRef = useRef<HTMLSpanElement | null>(null);
  let connection = useRef<ReturnType<typeof connectTooltip> | null>(null);
  onMount(() => { connection = connectTooltip(rootRef, panelRef); });
  onUpdate(() => { connection?.update(); });
  onUnMount(() => { connection?.destroy(); });

  return (
    <span ref={rootRef!} class={styles.root} data-placement={props.placement ?? 'top'} data-disabled={props.disabled || undefined}>
      {props.children}
      <span ref={panelRef!} class={styles.panel} id={props.id} role="tooltip" hidden>{props.content}</span>
    </span>
  );
}
