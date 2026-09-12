import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, Dialog, Field, Input, Picker, type DialogProps } from './index';

/* showModal() は開いた瞬間にページ全体を inert にするため、Docs では iframe で描画する。 */
const meta = {
  title: 'Components/Dialog',
  component: Dialog,
  parameters: { layout: 'padded', docs: { story: { inline: false, iframeHeight: 400 } } },
  args: { open: true, title: 'タスクを編集', description: '担当者と期限を変更できます。' },
  render: (args) => (
    <Dialog {...args} actions={<>
      <Button label="キャンセル" variant="tertiary" />
      <Button label="保存" />
    </>}>
      <p style={{ margin: 0 }}>本文をここに置きます。</p>
    </Dialog>
  ),
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function TriggerExample(args: DialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button label="ダイアログを開く" onClick={() => setOpen(true)} />
      <Dialog {...args} open={open} onClose={() => setOpen(false)} actions={
        <Button label="閉じる" onClick={() => setOpen(false)} />
      }>
        <p style={{ margin: 0 }}>Escape、背景クリック、ボタンのどれでも閉じます。</p>
      </Dialog>
      <output style={{ display: 'block', marginTop: 12 }} aria-live="polite">{open ? '開いています' : '閉じています'}</output>
    </div>
  );
}

export const Default: Story = { args: { open: false }, render: (args) => <TriggerExample {...args} /> };
export const Open: Story = {};
export const WithForm: Story = {
  render: (args) => (
    <Dialog {...args} actions={<>
      <Button label="キャンセル" variant="tertiary" />
      <Button label="保存" />
    </>}>
      <Field id="dialog-title" label="タイトル"><Input placeholder="例: 請求書を送る" /></Field>
      <Field id="dialog-team" label="担当チーム">
        <Picker label="選んでください" searchable={false} items={[
          { value: 'design', label: 'デザイン' },
          { value: 'frontend', label: 'Frontend' },
        ]} />
      </Field>
    </Dialog>
  ),
};
export const LongContent: Story = {
  render: (args) => (
    <Dialog {...args} title="利用条件" description="最後まで読んでから同意してください。"
      actions={<Button label="同意する" />}>
      {Array.from({ length: 12 }, (_, index) => (
        <p key={index} style={{ margin: 0 }}>
          {index + 1}. この文章はダイアログ内のスクロールを確認するための長い本文です。
        </p>
      ))}
    </Dialog>
  ),
};
export const NoActions: Story = {
  render: (args) => <Dialog {...args} title="保存しました" description="変更はすべて反映されています。" />,
};
