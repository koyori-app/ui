import { useState } from 'react';
import { Field, Switch } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

export default function SwitchDemo() {
  const [notify, setNotify] = useState(true);
  const [digest, setDigest] = useState(false);
  return <div style={{ display: 'grid', gap: 16, maxWidth: 420 }}>
    <Switch label="メール通知" checked={notify} onCheckedChange={setNotify} />
    <Field id="switch-demo-digest" label="週次ダイジェスト" description="毎週月曜の朝にまとめて届きます。">
      <Switch label="週次ダイジェスト" hideLabel checked={digest} onCheckedChange={setDigest} />
    </Field>
    <p role="status" style={{ margin: 0 }}>
      メール通知: {notify ? '有効' : '無効'} / 週次ダイジェスト: {digest ? '有効' : '無効'}
    </p>
  </div>;
}
