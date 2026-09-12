import { useState } from 'react';
import { Checkbox } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

export default function CheckboxDemo() {
  const [done, setDone] = useState(false);
  return <div style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
    <Checkbox label="タスクを完了" checked={done} onCheckedChange={setDone} />
    <Checkbox label="完了済み（変更不可）" checked disabled />
    <Checkbox label="TASK-140 を選択" hideLabel />
    <p role="status">{done ? '完了しました' : '未完了です'}</p>
  </div>;
}
