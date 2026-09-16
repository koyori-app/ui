import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type CSSProperties } from 'react';
import { Accordion, Avatar, Button, CheckIcon, Dropdown, EllipsisIcon, MenuIcon, Picker, Sidebar, SidebarLink, type SidebarProps } from './index';

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

export const WithMenus: Story = {
  render: function WithMenus(args) {
    const [action, setAction] = useState('未実行');
    return <>
      <div style={{ height: 460 }}><Sidebar {...args}>
        <SidebarLink label="概要" href="#overview" />
        <div><Dropdown label="操作" items={[{ value: 'edit', label: '編集' }, { value: 'share', label: '共有' }, { value: 'duplicate', label: '複製' }]} onSelect={setAction} /></div>
        <div><Picker label="並び順" searchable={false} items={[{ value: 'name', label: '名前順' }, { value: 'created', label: '作成日順' }, { value: 'updated', label: '更新日順' }]} /></div>
      </Sidebar></div>
      <output aria-label="実行結果">{action}</output>
    </>;
  },
};

/* 最初から表示し、ハンバーガーで畳む。placement を Controls で切り替える。 */
function CollapsibleExample(args: SidebarProps) {
  const [open, setOpen] = useState(true);
  const vertical = args.placement === 'top' || args.placement === 'bottom';
  const sidebar = <Sidebar {...args} id="story-collapsible-sidebar" open={open}>
    <SidebarLink label="概要" href="#overview" current />
    <SidebarLink label="受信トレイ" href="#inbox" badge="4" />
    <SidebarLink label="自分のタスク" href="#tasks" />
  </Sidebar>;
  const after = args.placement === 'right' || args.placement === 'bottom';
  return <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', gap: 12, height: 460, ...(vertical ? { '--koyori-sidebar-width': '100%' } : {}) } as CSSProperties}>
    {!after && sidebar}
    <main style={{ flex: 1, minWidth: 0, minHeight: 0, padding: 12, border: '1px dashed var(--koyori-color-border)', borderRadius: 8 }}>
      <Button ariaLabel="メニュー" variant="ghost" icon={<MenuIcon />} ariaExpanded={open} ariaControls="story-collapsible-sidebar" onClick={() => setOpen(!open)} />
      <p>メイン領域。サイドバーを閉じると広がります。</p>
    </main>
    {after && sidebar}
  </div>;
}

export const Collapsible: Story = {
  args: { placement: 'left' },
  argTypes: { placement: { control: 'select', options: ['left', 'right', 'top', 'bottom'] } },
  render: args => <CollapsibleExample {...args} />,
};

/* 展開・アイコンだけ・完全に閉じるの 3 状態。 */
function RailExample(args: SidebarProps) {
  const [open, setOpen] = useState(true);
  const [rail, setRail] = useState(false);
  return <div style={{ display: 'flex', gap: 12, height: 460 }}>
    <Sidebar {...args} id="story-rail-sidebar" open={open} rail={rail} onRailChange={setRail}
      header={rail ? <Avatar name="Koyori" /> : <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Avatar name="Koyori" /><strong>Koyori workspace</strong></div>}>
      <SidebarLink label="自分のタスク" href="#tasks" icon={<CheckIcon />} current />
      <SidebarLink label="受信トレイ" href="#inbox" icon={<EllipsisIcon />} badge="4" />
      <Accordion id="story-rail-projects" label="プロジェクト" headingLevel={2} defaultOpen>
        <SidebarLink label="Koyori UI" href="#ui" icon={<CheckIcon />} />
      </Accordion>
    </Sidebar>
    <main style={{ flex: 1, minWidth: 0, padding: 12, border: '1px dashed var(--koyori-color-border)', borderRadius: 8 }}>
      <Button ariaLabel="メニュー" variant="ghost" icon={<MenuIcon />} ariaExpanded={open} ariaControls="story-rail-sidebar" onClick={() => setOpen(!open)} />
      <p>{open ? (rail ? 'アイコンだけ' : '展開') : '閉じている'}</p>
    </main>
  </div>;
}

export const Rail: Story = { render: args => <RailExample {...args} /> };
