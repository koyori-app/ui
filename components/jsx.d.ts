import '@builder.io/mitosis/jsx-runtime';

// Mitosis 0.14 omits the native table-header scope attribute.
declare module '@builder.io/mitosis/jsx-runtime' {
  namespace JSX {
    interface ThHTMLAttributes<T> {
      scope?: 'col' | 'row' | 'colgroup' | 'rowgroup';
    }
  }
}
