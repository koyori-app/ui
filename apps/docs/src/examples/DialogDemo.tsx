import { useState } from 'react';
import { Button, ConfirmDialog, Dialog, Field, Input } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

export default function DialogDemo() {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [title, setTitle] = useState('請求書を送る');
  const [draft, setDraft] = useState('請求書を送る');
  const [result, setResult] = useState('変更なし');

  return (
    <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button label="タスクを編集" onClick={() => { setDraft(title); setEditing(true); }} />
        <Button label="タスクを削除" variant="danger" onClick={() => setDeleting(true)} />
      </div>

      <Dialog open={editing} title="タスクを編集" description="タイトルを変更して保存します。"
        onClose={() => setEditing(false)}
        actions={<>
          <Button label="キャンセル" variant="tertiary" onClick={() => setEditing(false)} />
          <Button label="保存" onClick={() => { setTitle(draft); setEditing(false); setResult(`「${draft}」に変更しました`); }} />
        </>}>
        <Field id="dialog-task-title" label="タイトル">
          <Input value={draft} onValueChange={setDraft} />
        </Field>
      </Dialog>

      <ConfirmDialog open={deleting} title="タスクを削除しますか？" message="この操作は取り消せません。"
        confirmLabel="削除する" destructive
        onCancel={() => setDeleting(false)}
        onConfirm={() => { setDeleting(false); setResult(`「${title}」を削除しました`); }} />

      <p role="status">{result}</p>
    </div>
  );
}
