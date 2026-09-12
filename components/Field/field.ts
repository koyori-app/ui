export interface FieldContextValue {
  id?: string;
  labelId?: string;
  describedBy?: string;
  invalid?: boolean;
  required?: boolean;
  requiredId?: string;
}

/* Vue's generated inject is untyped; keep the boundary in one place. */
export function getFieldContext(value: unknown): FieldContextValue | undefined {
  return value as FieldContextValue | undefined;
}
