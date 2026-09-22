import { useState } from 'react';
import { Button, Field, Input } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

export default function CardSeparatorDemo() {
  const [email, setEmail] = useState('');
  return <div className="koyori-card" style={{ maxWidth: 360 }}>
    <h2 className="koyori-card-heading">ログイン</h2>
    <Field id="card-demo-email" label="メールアドレス" description="登録に使ったアドレスを入力してください。">
      <Input type="email" autocomplete="email" value={email} onValueChange={setEmail} />
    </Field>
    <Field id="card-demo-password" label="パスワード">
      <Input type="password" autocomplete="current-password" />
    </Field>
    <hr className="koyori-separator" />
    <div className="koyori-card-actions">
      <Button variant="tertiary" label="パスワードを忘れた" />
      <Button label="ログイン" />
    </div>
  </div>;
}
