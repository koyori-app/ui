import { useState } from 'react';
import { DatePicker, Field } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

// Fixed calendar dates keep the server and client preview identical.
const presets = [{ label: '今日', value: '2026-12-31' }, { label: '明日', value: '2027-01-01' }];

export default function DatePickerDemo() {
  const [date, setDate] = useState('');
  return <div style={{ maxWidth: 360 }}>
    <Field id="react-due-date" label="期限" description="日付を選ぶか、クリアで未設定にできます。">
      <DatePicker label="期限" value={date} onValueChange={setDate} locale="ja-JP"
        today="2026-12-31" presets={presets} />
    </Field>
    <p>選択: {date || '未設定'}</p>
  </div>;
}
