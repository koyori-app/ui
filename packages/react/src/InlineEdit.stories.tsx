import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { InlineEdit, Input, Textarea, type InlineEditProps, type InlineEditCommitReason } from './index';

function Example({ args, asynchronous = false, initial = '請求書を送る' }: {
  args: InlineEditProps; asynchronous?: boolean; initial?: string;
}) {
  const [value, setValue] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [editing, setEditing] = useState(args.editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [commits, setCommits] = useState(0);
  const [cancels, setCancels] = useState(0);
  const [reason, setReason] = useState('未保存');
  const commit = (nextReason: InlineEditCommitReason) => {
    setCommits(count => count + 1);
    setReason(nextReason);
    if (!draft.trim()) { setError('タイトルを入力してください。'); return; }
    setError('');
    if (asynchronous) setSaving(true);
    else { setValue(draft); setEditing(false); }
  };
  return <div style={{ display: 'grid', gap: 16, maxWidth: 360 }}>
    <InlineEdit {...args} editing={editing} saving={saving} error={error}
      display={<strong>{value || '未入力'}</strong>}
      onEdit={() => { setDraft(value); setError(''); setEditing(true); }}
      onCancel={() => { setCancels(count => count + 1); setDraft(value); setError(''); setEditing(false); }}
      onCommit={commit}>
      {args.multiline
        ? <Textarea value={draft} onValueChange={setDraft} />
        : <Input value={draft} onValueChange={setDraft} />}
    </InlineEdit>
    <button type="button">次の項目</button>
    {asynchronous && <>
      <button type="button" disabled={!saving} onClick={() => { setValue(draft); setSaving(false); setEditing(false); }}>保存を成功させる</button>
      <button type="button" disabled={!saving} onClick={() => { setSaving(false); setError('保存に失敗しました。再試行してください。'); }}>保存を失敗させる</button>
    </>}
    <output>確定: {commits} / 取消: {cancels} / 理由: {reason} / 値: {value}</output>
  </div>;
}

const meta = {
  title: 'Components/InlineEdit',
  component: InlineEdit,
  parameters: { layout: 'padded' },
  args: { id: 'inline-title', label: 'タイトル', editing: false },
  render: args => <Example args={args} />,
} satisfies Meta<typeof InlineEdit>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const CommitOnBlur: Story = { args: { commitOnBlur: true } };
export const Multiline: Story = { args: { multiline: true, description: 'Enterで改行、Ctrl / Command + Enterで保存します。' } };
export const AsyncSave: Story = {
  args: { commitOnBlur: true },
  render: args => <Example args={args} asynchronous />,
};
export const Empty: Story = { render: args => <Example args={args} initial="" /> };
export const Disabled: Story = { args: { disabled: true } };
export const InitiallyEditing: Story = { args: { editing: true } };

function NativeFormExample({ args }: { args: InlineEditProps }) {
  const [editing, setEditing] = useState(false);
  const [submits, setSubmits] = useState(0);
  return <form onSubmit={event => { event.preventDefault(); setSubmits(count => count + 1); }}>
    <InlineEdit {...args} editing={editing} onEdit={() => setEditing(true)} onCancel={() => setEditing(false)}>
      <input id={args.id} name="title" required />
    </InlineEdit>
    <button type="submit">フォームを送信</button>
    <output>送信: {submits}</output>
  </form>;
}
export const NativeForm: Story = { render: args => <NativeFormExample args={args} /> };
