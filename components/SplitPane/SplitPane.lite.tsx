import { onMount, onUnMount, onUpdate, Slot, useRef, useStore } from '@builder.io/mitosis';
import { beginSplitDrag, observeSplitPane, splitLayout, splitSize } from './split-pane';
import type { SplitDrag } from './split-pane';
import styles from './split-pane.module.css';

export interface SplitPaneProps {
  /** Name of the left pane, also used for the resize handle. */
  label: string;
  /** Unique id of the left pane, used by aria-controls. Stable across SSR and hydration. */
  primaryId: string;
  /** Id of the visible heading in the left pane, when present. Overrides label for the handle. */
  ariaLabelledBy?: string;
  /** Controlled requested left width in CSS pixels. Omit to manage it internally. */
  size?: number;
  defaultSize?: number;
  /** Minimum widths in CSS pixels, each defaulting to 160. */
  minSize?: number;
  minSecondarySize?: number;
  /** User requests only. A controlled size changes only when the caller accepts it. */
  onSizeChange?: (size: number) => void;
  disabled?: boolean;
  primary?: any;
  secondary?: any;
}

export default function SplitPane(props: SplitPaneProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);
  let observerRef = useRef<(() => void) | null>(null);
  let dragRef = useRef<SplitDrag | null>(null);
  const state = useStore({
    storedSize: splitSize(props.defaultSize, 320),
    available: -1,
    dragging: false,
    layout() {
      return splitLayout(splitSize(props.size, state.storedSize), state.available, props.minSize, props.minSecondarySize);
    },
    unavailable() {
      const snapshot = state.layout();
      return !!props.disabled || snapshot.min === snapshot.max || state.available < 0;
    },
    change(size: number) {
      if (state.unavailable()) return;
      const snapshot = state.layout();
      const next = Math.min(snapshot.max, Math.max(snapshot.min, size));
      if (next === snapshot.size) return;
      if (props.size === undefined) state.storedSize = next;
      props.onSizeChange?.(next);
    },
    stop() {
      dragRef?.finish();
    },
    start(event: { button: number; isPrimary: boolean; pointerId: number; clientX: number; preventDefault(): void }) {
      if (state.unavailable() || !event.isPrimary || event.button !== 0 || !handleRef) return;
      event.preventDefault();
      state.stop();
      handleRef.focus({ preventScroll: true });
      dragRef = beginSplitDrag(handleRef, event.pointerId, event.clientX, state.layout().size, () => {
        dragRef = null;
        state.dragging = false;
      });
      state.dragging = true;
    },
    move(event: { pointerId: number; clientX: number; buttons: number }) {
      if (!dragRef || event.pointerId !== dragRef.pointerId) return;
      if (!event.buttons) { state.stop(); return; }
      state.change(dragRef.startSize + event.clientX - dragRef.startX);
    },
    end(event: { pointerId: number }) {
      if (event.pointerId === dragRef?.pointerId) state.stop();
    },
    key(event: { key: string; shiftKey: boolean; altKey: boolean; ctrlKey: boolean; metaKey: boolean; isComposing?: boolean; nativeEvent?: { isComposing?: boolean }; preventDefault(): void; stopPropagation(): void }) {
      if (event.isComposing || event.nativeEvent?.isComposing) return;
      if (event.key === 'Escape' && dragRef) {
        event.preventDefault();
        event.stopPropagation();
        state.stop();
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey || state.unavailable()) return;
      const snapshot = state.layout();
      const step = event.shiftKey ? 50 : 10;
      const next = event.key === 'ArrowLeft' ? snapshot.size - step : event.key === 'ArrowRight' ? snapshot.size + step
        : event.key === 'Home' ? snapshot.min : event.key === 'End' ? snapshot.max : null;
      if (next === null) return;
      event.preventDefault();
      state.stop();
      state.change(next);
    },
  });

  onMount(() => {
    observerRef = observeSplitPane(rootRef, handleRef, (space) => { state.available = space; });
  });
  // A changed container or constraint ends the drag; subsequent moves need a fresh origin.
  onUpdate(() => { state.stop(); }, [state.available, props.minSize, props.minSecondarySize, props.disabled]);
  onUnMount(() => { observerRef?.(); state.stop(); });

  return (
    <div ref={rootRef!} class={styles.root} dir="ltr" data-dragging={state.dragging || undefined}
      style={{ gridTemplateColumns: `minmax(0, ${state.layout().size}px) min(calc(var(--koyori-space-md) * 3), 100%) minmax(0, 1fr)` }}>
      <div class={styles.pane} id={props.primaryId} inert={state.layout().size === 0}><Slot name="primary" /></div>
      <div ref={handleRef!} class={styles.handle} role="separator" tabIndex={0}
        aria-orientation="vertical" aria-label={props.ariaLabelledBy ? undefined : props.label}
        aria-labelledby={props.ariaLabelledBy} aria-controls={props.primaryId}
        aria-valuemin={state.layout().min} aria-valuemax={state.layout().max} aria-valuenow={state.layout().size}
        aria-valuetext={`${Math.round(state.layout().size)}px`} aria-disabled={state.unavailable() || undefined}
        onKeyDown={(event) => state.key(event)} onPointerDown={(event) => state.start(event)}
        onPointerMove={(event) => state.move(event)} onPointerUp={(event) => state.end(event)}
        onPointerCancel={(event) => state.end(event)} onLostPointerCapture={(event) => state.end(event)}
        onBlur={() => state.stop()}>
        <span class={styles.grip} aria-hidden="true" />
      </div>
      <div class={styles.pane} inert={state.available >= 0 && state.available - state.layout().size === 0}><Slot name="secondary" /></div>
    </div>
  );
}
