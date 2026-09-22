import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState } from 'react';
import { Alert } from './index';

const meta = {
  title: 'Components/Alert',
  component: Alert,
  parameters: { layout: 'padded' },
  args: { message: '保存できませんでした。時間をおいて試してください。' },
  argTypes: { variant: { control: 'radio', options: ['danger', 'warning', 'info', 'success'] } },
  render: args => <div style={{ width: 460 }}><Alert {...args} /></div>,
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Danger: Story = { args: { onRetry: () => {} } };
export const Warning: Story = { args: { variant: 'warning', message: '公開予定日が過ぎています。' } };
export const Info: Story = { args: { variant: 'info', message: '3 月 1 日からメールの形式が変わります。' } };
export const Success: Story = { args: { variant: 'success', message: '下書きを保存しました。' } };
export const CustomPrefix: Story = { args: { variant: 'warning', prefix: '確認', message: '未保存の変更があります。' } };

/* 閉じたあとのフォーカス先は利用側が決める。ここでは再表示のボタンへ戻す。Tab の順は 再試行 → 閉じる。 */
function DismissibleExample() {
  const [open, setOpen] = useState(true);
  const restore = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (!open) restore.current?.focus(); }, [open]);
  return (
    <div style={{ display: 'grid', gap: 12, justifyItems: 'start', width: 460 }}>
      {open && <div style={{ width: '100%' }}><Alert message="共有リンクの作成に失敗しました。"
        onRetry={() => {}} onDismiss={() => setOpen(false)} /></div>}
      <button ref={restore} type="button" onClick={() => setOpen(true)}>もう一度表示</button>
    </div>
  );
}

export const Dismissible: Story = { render: () => <DismissibleExample /> };

/* 同じ要素のまま本文だけを差し替え、読み上げが 1 回で済むかを確かめる。 */
function LiveUpdateExample() {
  const [count, setCount] = useState(1);
  return (
    <div style={{ display: 'grid', gap: 12, justifyItems: 'start', width: 460 }}>
      <div style={{ width: '100%' }}><Alert message={`${count} 件のタスクを保存できませんでした。`} /></div>
      <button type="button" onClick={() => setCount(count + 1)}>件数を増やす</button>
    </div>
  );
}

export const LiveUpdate: Story = { render: () => <LiveUpdateExample /> };

/* 複数を同時に出すと上から順に読み上げられる。数を絞ること。 */
export const Multiple: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, width: 460 }}>
      <Alert message="添付ファイルをアップロードできませんでした。" onRetry={() => {}} />
      <Alert variant="warning" message="下書きの保存から 30 分が経過しています。" />
      <Alert variant="info" message="編集内容は自動では共有されません。" />
    </div>
  ),
};
