import { useState } from 'react';
import { Field, Input, Meter } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

// 文字は見た目だけ隠し、読み上げには残す。
const visuallyHidden = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' } as const;

export default function MeterDemo() {
  const [password, setPassword] = useState('');
  // 長さだけの簡易判定。実際の判定はアプリ側で行う。
  const level = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const text = ['未入力', '弱い', '普通', '強い'][level];

  return <div style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
    <Field id="meter-demo-password" label="新しいパスワード" description="12 文字以上で「強い」になります。">
      <Input type="password" autocomplete="new-password" value={password} onValueChange={setPassword} />
    </Field>
    <Meter label="パスワードの強度" value={level} valueText={text} />
    {/* 文は段が変わった時だけ変わるので、打鍵ごとには読み上げない。 */}
    <p role="status" style={visuallyHidden}>{level ? `パスワードの強度: ${text}` : ''}</p>
  </div>;
}
