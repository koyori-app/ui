import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import { Accordion, Avatar, CheckIcon, Dropdown, EllipsisIcon, Picker, Sidebar, SidebarLink } from './index';

const meta = {
  title: 'Components/Sidebar', component: Sidebar,
  parameters: { layout: 'padded' }, args: { label: 'メインナビゲーション' },
  render: args => ({ components: { Accordion, Avatar, Sidebar, SidebarLink }, setup: () => ({ args }),
    template: `<div style="height: 460px"><Sidebar v-bind="args">
      <template #header><div style="display: flex; gap: 10px; align-items: center"><Avatar name="Koyori" /><strong>Koyori workspace</strong></div></template>
      <SidebarLink label="概要" href="#overview" />
      <SidebarLink label="受信トレイ" href="#inbox" badge="4" />
      <SidebarLink label="自分のタスク" href="#tasks" />
      <Accordion id="sidebar-projects" label="プロジェクト" :heading-level="2" default-open>
        <SidebarLink label="Koyori UI" href="#ui" current /><SidebarLink label="Web サイト" href="#website" /><SidebarLink label="モバイルアプリ" href="#mobile" />
      </Accordion>
      <Accordion id="sidebar-team" label="チーム" :heading-level="2"><SidebarLink label="メンバー" href="#members" /><SidebarLink label="設定" href="#settings" /></Accordion>
      <template #footer><div style="display: flex; gap: 10px; align-items: center"><Avatar name="Yupix" :size="28" /><span>Yupix</span></div></template>
    </Sidebar></div>`,
  }),
} satisfies Meta<typeof Sidebar>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const LinksOnly: Story = { render: args => ({ components: { Sidebar, SidebarLink }, setup: () => ({ args }), template: '<Sidebar v-bind="args"><SidebarLink label="概要" href="#overview" current /><SidebarLink label="設定" href="#settings" /><SidebarLink label="準備中" href="#unavailable" disabled /></Sidebar>' }) };
export const WithIcons: Story = { render: args => ({ components: { Sidebar, SidebarLink, CheckIcon, EllipsisIcon }, setup: () => ({ args }), template: '<Sidebar v-bind="args"><SidebarLink label="自分のタスク" href="#tasks" current><template #icon><CheckIcon /></template></SidebarLink><SidebarLink label="その他" href="#more"><template #icon><EllipsisIcon /></template></SidebarLink></Sidebar>' }) };
export const Scrollable: Story = { render: args => ({ components: { Sidebar, SidebarLink }, setup: () => ({ args, indices: Array.from({ length: 40 }, (_, index) => index + 1) }), template: '<div style="height: 280px"><Sidebar v-bind="args"><template #header><strong>プロジェクト一覧</strong></template><SidebarLink v-for="index in indices" :key="index" :label="`プロジェクト ${index}`" :href="`#project-${index}`" /><template #footer><span>ワークスペース設定</span></template></Sidebar></div>' }) };
export const Narrow: Story = { render: args => ({ components: { Accordion, Sidebar, SidebarLink }, setup: () => ({ args }), template: '<div style="width: 180px"><Sidebar v-bind="args"><SidebarLink label="とても長い名前のプロジェクトを小さな画面で表示する例" href="#long" current /><Accordion id="sidebar-narrow" label="関連するプロジェクト" default-open><SidebarLink label="小さな画面で確認" href="#small" /></Accordion></Sidebar></div>' }) };

export const WithMenus: Story = {
  render: args => ({
    components: { Dropdown, Picker, Sidebar, SidebarLink },
    setup: () => ({ args, action: ref('未実行') }),
    template: `<div style="height: 460px"><Sidebar v-bind="args">
      <SidebarLink label="概要" href="#overview" />
      <div><Dropdown label="操作" :items="[{ value: 'edit', label: '編集' }, { value: 'share', label: '共有' }, { value: 'duplicate', label: '複製' }]" @select="action = $event" /></div>
      <div><Picker label="並び順" :searchable="false" :items="[{ value: 'name', label: '名前順' }, { value: 'created', label: '作成日順' }, { value: 'updated', label: '更新日順' }]" /></div>
    </Sidebar></div><output aria-label="実行結果">{{ action }}</output>`,
  }),
};
