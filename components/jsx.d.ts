import '@builder.io/mitosis/jsx-runtime';

// Mitosis 0.14 omits some native attributes and events.
declare module '@builder.io/mitosis/jsx-runtime' {
  namespace JSX {
    interface ThHTMLAttributes<T> {
      scope?: 'col' | 'row' | 'colgroup' | 'rowgroup';
    }

    // Mitosis 0.14 omits the dialog cancel and close events. Escape fires cancel before close.
    interface HTMLAttributes<T> {
      onCancel?: (event: { target: EventTarget | null; cancelable: boolean; preventDefault: Function }) => void;
      onClose?: (event: { target: EventTarget | null }) => void;
      inert?: boolean;
    }
  }
}
