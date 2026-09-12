import type { Meta, StoryObj } from '@storybook/react-vite';
import { Accordion, Avatar, CheckIcon, EllipsisIcon, Sidebar, SidebarLink } from './index';

const meta = {
  title: 'Components/Sidebar', component: Sidebar,
  parameters: { layout: 'padded' }, args: { label: 'メインナビゲーション' },
  render: args => <div style={{ height: 460 }}><Sidebar {...args}
    header={<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Avatar name="Koyori" /><strong>Koyori workspace</strong></div>}
    footer={<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Avatar name="Yupix" size={28} /><span>Yupix</span></div>}>
    <SidebarLink label="概要" href="#overview" />
    <SidebarLink label="受信トレイ" href="#inbox" badge="4" />
    <SidebarLink label="自分のタスク" href="#tasks" />
    <Accordion id="sidebar-projects" label="プロジェクト" headingLevel={2} defaultOpen>
      <SidebarLink label="Koyori UI" href="#ui" current />
      <SidebarLink label="Web サイト" href="#website" />
      <SidebarLink label="モバイルアプリ" href="#mobile" />
    </Accordion>
    <Accordion id="sidebar-team" label="チーム" headingLevel={2}>
      <SidebarLink label="メンバー" href="#members" />
      <SidebarLink label="設定" href="#settings" />
    </Accordion>
  </Sidebar></div>,
} satisfies Meta<typeof Sidebar>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const LinksOnly: Story = { render: args => <Sidebar {...args}><SidebarLink label="概要" href="#overview" current /><SidebarLink label="設定" href="#settings" /><SidebarLink label="準備中" href="#unavailable" disabled /></Sidebar> };
export const WithIcons: Story = { render: args => <Sidebar {...args}><SidebarLink label="自分のタスク" href="#tasks" icon={<CheckIcon />} current /><SidebarLink label="その他" href="#more" icon={<EllipsisIcon />} /></Sidebar> };
export const Scrollable: Story = {
  render: args => <div style={{ height: 280 }}><Sidebar {...args} header={<strong>プロジェクト一覧</strong>} footer={<span>ワークスペース設定</span>}>
    {Array.from({ length: 40 }, (_, index) => <SidebarLink key={index} label={`プロジェクト ${index + 1}`} href={`#project-${index + 1}`} />)}
  </Sidebar></div>,
};
export const Narrow: Story = { render: args => <div style={{ width: 180 }}><Sidebar {...args}><SidebarLink label="とても長い名前のプロジェクトを小さな画面で表示する例" href="#long" current /><Accordion id="sidebar-narrow" label="関連するプロジェクト" defaultOpen><SidebarLink label="小さな画面で確認" href="#small" /></Accordion></Sidebar></div> };
