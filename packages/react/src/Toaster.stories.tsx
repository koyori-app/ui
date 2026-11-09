import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Toaster, toast } from './index';

/* ストアはモジュールで共有され、ストーリー間で残る。表示時と破棄時に空にする。 */
function Fire({ fire, children }: { fire: () => void; children: ReactNode }) {
  useEffect(() => {
    toast.dismiss();
    fire();
    return () => toast.dismiss();
  }, []);
  return <>{children}</>;
}

const meta = {
  title: 'Components/Toaster',
  component: Toaster,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

const show = (fire: () => void): Story['render'] => (args) => <Fire fire={fire}><Toaster {...args} /></Fire>;

/* 既定の長さ（自動で消える・ホバーやフォーカスで止まる）を手で確かめる。 */
function PlaygroundExample(args: React.ComponentProps<typeof Toaster>) {
  useEffect(() => () => toast.dismiss(), []);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 16 }}>
      <button type="button" onClick={() => toast.success('保存しました。')}>成功</button>
      <button type="button" onClick={() => toast.error('保存できませんでした。時間をおいて試してください。')}>エラー</button>
      <button type="button" onClick={() => toast.info('3 月 1 日からメールの形式が変わります。')}>情報</button>
      <button type="button" onClick={() => toast.info('項目を削除しました。', { action: { label: '元に戻す', onClick: () => toast.success('元に戻しました。') } })}>操作付き</button>
      <button type="button" onClick={() => toast.success('タスクを作成しました。', { action: { label: 'タスクを開く', href: '#' } })}>リンク付き</button>
      <button type="button" onClick={() => toast.success('保存しました。', { duration: 400 })}>短く出す</button>
      <Toaster {...args} />
    </div>
  );
}

export const Playground: Story = { render: (args) => <PlaygroundExample {...args} /> };

export const Success: Story = { render: show(() => { toast.success('保存しました。', { duration: 0 }); }) };
export const Error: Story = { render: show(() => { toast.error('保存できませんでした。時間をおいて試してください。', { duration: 0 }); }) };
export const Info: Story = { render: show(() => { toast.info('3 月 1 日からメールの形式が変わります。', { duration: 0 }); }) };

export const WithLink: Story = {
  render: show(() => { toast.success('タスクを作成しました。', { action: { label: 'タスクを開く', href: '#' }, duration: 0 }); }),
};

export const WithAction: Story = {
  render: show(() => { toast.info('項目を削除しました。', { action: { label: '元に戻す', onClick: () => {} }, duration: 0 }); }),
};

/* limit 3 のまま 4 件出すと、最初の 1 件が消えて 3 件が積まれる。 */
export const Stacked: Story = {
  render: show(() => { for (const n of [1, 2, 3, 4]) toast.success(`${n} 件目の通知です。`, { duration: 0 }); }),
};

/* 狭い幅でも本文を細らせず、操作を次の行に回す。top layer に出るため、箱ではなく幅のトークンで狭める。 */
export const Narrow: Story = {
  render: (args) => (
    <Fire fire={() => { toast.success('共有リンクを作成しました。https://example.com/workspaces/acme/projects/q3-launch/docs/9f8e7d6c5b4a', { action: { label: 'タスクを開く', href: '#' }, duration: 0 }); }}>
      <div style={{ '--koyori-toast-width': '288px' } as React.CSSProperties}><Toaster {...args} /></div>
    </Fire>
  ),
};

/* 暗い背景でも枠と背景が消えないことを確認する。 */
export const DarkBackground: Story = {
  render: (args) => (
    <Fire fire={() => {
      toast.success('保存しました。', { duration: 0 });
      toast.error('保存できませんでした。', { duration: 0 });
      toast.info('メールの形式が変わります。', { duration: 0 });
    }}>
      <div style={{ position: 'fixed', inset: 0, background: '#2b2733' }}><Toaster {...args} /></div>
    </Fire>
  ),
};
