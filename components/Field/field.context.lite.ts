import { createContext } from '@builder.io/mitosis';
import type { FieldContextValue } from './field';

/* Field から中の Input・Textarea・Picker へ関連付けを渡す。 */
export default createContext<FieldContextValue>({
  id: undefined as string | undefined,
  labelId: undefined as string | undefined,
  describedBy: undefined as string | undefined,
  invalid: false,
  required: false,
  requiredId: undefined as string | undefined,
});
