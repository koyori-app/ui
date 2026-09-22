import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Dialog, Field, Input, Sidebar, SidebarLink } from './index';

/* 部品ではなくユーティリティクラス。マークアップに付けて使う。 */
const meta = {
  title: 'Styles/Card・Separator',
  /* 「・」がそのまま id に入ると URL が読みにくいため、明示する。 */
  id: 'styles-card-separator',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => (
    <div className="koyori-card" style={{ maxWidth: 360 }}>
      <h2 className="koyori-card-heading">ログイン</h2>
      <Field id="card-email" label="メールアドレス"><Input type="email" autocomplete="email" /></Field>
      <hr className="koyori-separator" />
      <div className="koyori-card-actions">
        <Button variant="tertiary" label="キャンセル" />
        <Button label="ログイン" />
      </div>
    </div>
  ),
};

/* 外側の角丸は「内側の角丸 + 外側の padding」。入れ子でも角がずれない。 */
export const Nested: Story = {
  render: () => (
    <div className="koyori-card" style={{ maxWidth: 420 }}>
      <h2 className="koyori-card-heading">通知</h2>
      <div className="koyori-card" style={{ boxShadow: 'none' }}>
        <h3 className="koyori-card-heading">メール</h3>
        <p style={{ margin: 0 }}>重要な更新だけを受け取ります。</p>
      </div>
      <div className="koyori-card" style={{ boxShadow: 'none' }}>
        <h3 className="koyori-card-heading">アプリ内</h3>
        <p style={{ margin: 0 }}>すべての更新を受け取ります。</p>
      </div>
    </div>
  ),
};

export const InDialog: Story = {
  render: () => (
    <Dialog open title="メンバーを招待" plain>
      <div className="koyori-card" style={{ border: 0, boxShadow: 'none' }}>
        <h2 className="koyori-card-heading">メンバーを招待</h2>
        <Field id="card-invite" label="メールアドレス"><Input type="email" /></Field>
        <hr className="koyori-separator" />
        <div className="koyori-card-actions">
          <Button variant="tertiary" label="閉じる" />
          <Button label="招待する" />
        </div>
      </div>
    </Dialog>
  ),
};

export const InSidebar: Story = {
  render: () => (
    <div style={{ height: 300 }}>
      <Sidebar label="設定"
        footer={<div className="koyori-card" style={{ boxShadow: 'none' }}>
          <p style={{ margin: 0 }}>無料プランを使用中です。</p>
          <div className="koyori-card-actions"><Button variant="secondary" label="変更" /></div>
        </div>}>
        <SidebarLink label="一般" href="#general" current />
        <hr className="koyori-separator" />
        <SidebarLink label="メンバー" href="#members" />
      </Sidebar>
    </div>
  ),
};

export const Separators: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16, maxWidth: 360 }}>
      <p style={{ margin: 0 }}>上の内容</p>
      <hr className="koyori-separator" />
      <p style={{ margin: 0 }}>下の内容</p>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span>作成者</span>
        <hr className="koyori-separator" aria-orientation="vertical" />
        <span>2026-04-01</span>
        <hr className="koyori-separator" aria-orientation="vertical" />
        <span>公開</span>
      </div>
    </div>
  ),
};

export const DarkBackground: Story = {
  render: () => (
    <div style={{ padding: 24, borderRadius: 16, background: '#2b2733' }}>
      <div className="koyori-card" style={{ maxWidth: 320 }}>
        <h2 className="koyori-card-heading">請求先</h2>
        <p style={{ margin: 0 }}>暗い背景の上でも枠と影で浮きます。</p>
        <hr className="koyori-separator" />
        <div className="koyori-card-actions"><Button variant="secondary" label="変更" /></div>
      </div>
    </div>
  ),
};
