import { useState } from 'react';
import { Field, Input } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

export default function NumberInputDemo() {
  const [draft, setDraft] = useState('0');
  const [value, setValue] = useState<number | null>(0);
  const [error, setError] = useState('');
  return (
    <div style={{ maxWidth: 360 }}>
      <Field id="react-progress-input" label="進捗率" description="0〜100の整数。空欄は未設定です。" error={error}>
        <Input type="number" min={0} max={100} step={1} value={draft}
          onValueChange={(text) => { setDraft(text); setError(''); }}
          onNumberCommit={(number) => { setValue(number); setError(''); }}
          onNumberInvalid={setError} />
      </Field>
      <p>確定値: {value === null ? '未設定' : `${value}%`}</p>
    </div>
  );
}
