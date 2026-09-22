import { useRef, useState } from 'react';
import { Button, EyeIcon, EyeOffIcon, Field, Input } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

export default function PasswordInputDemo() {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState('');
  const group = useRef<HTMLDivElement>(null);

  // type を変えると選択が失われるため、位置を控えて描画後に戻す。
  function toggle() {
    const input = group.current?.querySelector('input');
    const start = input?.selectionStart ?? null;
    const end = input?.selectionEnd ?? null;
    setVisible(!visible);
    requestAnimationFrame(() => {
      if (!input || start === null || end === null) return;
      input.focus();
      input.setSelectionRange(start, end);
    });
  }

  return <div ref={group} style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
    <Field id="password-demo" label="パスワード" description="8 文字以上で入力してください。">
      <Input type={visible ? 'text' : 'password'} value={value} autocomplete="current-password"
        onValueChange={setValue}
        suffix={<Button variant="ghost" ariaLabel="パスワードを表示" ariaPressed={visible ? 'true' : 'false'}
          icon={visible ? <EyeOffIcon /> : <EyeIcon />} onClick={toggle} />} />
    </Field>
    <Field id="amount-demo" label="金額">
      <Input type="number" min={0} prefix="¥" suffix="円" />
    </Field>
  </div>;
}
