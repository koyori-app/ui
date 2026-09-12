import { useState, type FormEvent } from 'react';
import { Button, Field, Input, Textarea } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

export default function FieldDemo() {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState('未送信');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError('タイトルを入力してください。');
      setResult('未送信');
      document.getElementById('react-task-title')?.focus();
      return;
    }
    setError('');
    setResult(`「${title}」を作成しました`);
  };

  return (
    <form noValidate onSubmit={submit} style={{ display: 'grid', gap: 16, maxWidth: 360 }}>
      <Field id="react-task-title" label="タイトル" required error={error}>
        <Input name="title" value={title} autocomplete="off" onValueChange={setTitle} />
      </Field>
      <Field id="react-task-note" label="メモ" description="担当者に共有したい補足を書きます。">
        <Textarea name="note" rows={4} value={note} onValueChange={setNote} />
      </Field>
      <div><Button label="タスクを作成" type="submit" /></div>
      <p role="status">{result}</p>
    </form>
  );
}
