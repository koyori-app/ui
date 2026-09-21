import { useState } from 'react';
import { InlineEdit, Input, Textarea } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

export default function InlineEditDemo() {
  const [title, setTitle] = useState('請求書を送る');
  const [draft, setDraft] = useState(title);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('担当者と金額を確認する');
  const [noteDraft, setNoteDraft] = useState(note);
  const [noteEditing, setNoteEditing] = useState(false);

  async function save() {
    if (!draft.trim()) { setError('タイトルを入力してください。'); return; }
    setError('');
    setSaving(true);
    try {
      // 実際のアプリでは、ここでAPI更新を待つ。
      await new Promise(resolve => setTimeout(resolve, 600));
      if (draft.includes('失敗')) throw new Error('保存に失敗しました。内容を直して再試行してください。');
      setTitle(draft);
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存に失敗しました。');
    } finally { setSaving(false); }
  }
  return <div style={{ display: 'grid', gap: 24, maxWidth: 440 }}>
    <InlineEdit id="react-inline-title" label="タイトル" editing={editing} saving={saving} error={error}
      description="「失敗」を含めて保存すると、失敗時の動きを確認できます。"
      display={<strong>{title}</strong>} commitOnBlur
      onEdit={() => { setDraft(title); setError(''); setEditing(true); }}
      onCancel={() => { setDraft(title); setError(''); setEditing(false); }} onCommit={save}>
      <Input value={draft} onValueChange={setDraft} />
    </InlineEdit>
    <InlineEdit id="react-inline-note" label="メモ" editing={noteEditing} multiline
      description="Enterで改行、Ctrl / Command + Enterで保存します。" display={note || 'メモを追加'}
      onEdit={() => { setNoteDraft(note); setNoteEditing(true); }}
      onCancel={() => { setNoteDraft(note); setNoteEditing(false); }}
      onCommit={() => { setNote(noteDraft); setNoteEditing(false); }}>
      <Textarea value={noteDraft} onValueChange={setNoteDraft} />
    </InlineEdit>
  </div>;
}
