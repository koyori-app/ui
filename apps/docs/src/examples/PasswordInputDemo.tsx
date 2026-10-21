import { useState } from 'react';
import { Field, PasswordInput } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

export default function PasswordInputDemo() {
  // 値は利用側が持つ。表示の切り替えは PasswordInput に任せる（visible を渡せば親が持てる）。
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');

  return <div style={{ display: 'grid', gap: 16, maxWidth: 360 }}>
    <Field id="password-input-demo-current" label="現在のパスワード">
      <PasswordInput autocomplete="current-password" value={current} onValueChange={setCurrent} />
    </Field>
    <Field id="password-input-demo-new" label="新しいパスワード" description="12 文字以上を推奨します。">
      <PasswordInput autocomplete="new-password" value={next} onValueChange={setNext} />
    </Field>
  </div>;
}
