import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, ConfirmDialog, type ConfirmDialogProps } from './index';

const meta = {
  title: 'Components/ConfirmDialog',
  component: ConfirmDialog,
  parameters: { layout: 'padded', docs: { story: { inline: false, iframeHeight: 360 } } },
  args: {
    open: true, title: 'タスクを削除しますか？', message: 'この操作は取り消せません。',
    confirmLabel: '削除する', destructive: true,
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function TriggerExample(args: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState('未実行');
  return (
    <div>
      <Button label="タスクを削除" variant="danger" onClick={() => setOpen(true)} />
      <ConfirmDialog {...args} open={open}
        onCancel={() => { setOpen(false); setResult('取り消しました'); }}
        onConfirm={() => { setOpen(false); setResult('削除しました'); }} />
      <output style={{ display: 'block', marginTop: 12 }} aria-live="polite">{result}</output>
    </div>
  );
}

export const Default: Story = { args: { open: false }, render: (args) => <TriggerExample {...args} /> };
export const Destructive: Story = {};
export const Open: Story = {
  args: { title: '変更を保存しますか？', message: '未保存の変更があります。', confirmLabel: '保存する', destructive: false },
};
export const Localized: Story = {
  args: { title: 'Delete this task?', message: 'This cannot be undone.', confirmLabel: 'Delete', cancelLabel: 'Cancel' },
};
