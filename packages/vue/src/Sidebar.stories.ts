import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import { Accordion, Avatar, Button, CheckIcon, Dropdown, EllipsisIcon, MenuIcon, Picker, Sidebar, SidebarLink } from './index';

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

/* 最初から表示し、ハンバーガーで畳む。placement を Controls で切り替える。 */
export const Collapsible: Story = {
  args: { placement: 'left' },
  argTypes: { placement: { control: 'select', options: ['left', 'right', 'top', 'bottom'] } },
  render: args => ({
    components: { Button, MenuIcon, Sidebar, SidebarLink },
    setup() {
      const open = ref(true);
      const vertical = () => args.placement === 'top' || args.placement === 'bottom';
      const after = () => args.placement === 'right' || args.placement === 'bottom';
      return { args, open, vertical, after };
    },
    template: `<div :style="{ display: 'flex', flexDirection: vertical() ? 'column' : 'row', gap: '12px', height: '460px', ...(vertical() ? { '--koyori-sidebar-width': '100%' } : {}) }">
      <main :style="{ order: after() ? 0 : 1, flex: 1, minWidth: 0, minHeight: 0, padding: '12px', border: '1px dashed var(--koyori-color-border)', borderRadius: '8px' }">
        <Button ariaLabel="メニュー" variant="ghost" :aria-expanded="open" aria-controls="story-collapsible-sidebar" :on-click="() => open = !open"><template #icon><MenuIcon /></template></Button>
        <p>メイン領域。サイドバーを閉じると広がります。</p>
      </main>
      <Sidebar v-bind="args" id="story-collapsible-sidebar" :open="open" :style="{ order: after() ? 1 : 0 }">
        <SidebarLink label="概要" href="#overview" current />
        <SidebarLink label="受信トレイ" href="#inbox" badge="4" />
        <SidebarLink label="自分のタスク" href="#tasks" />
      </Sidebar>
    </div>`,
  }),
};

/* 展開・アイコンだけ・完全に閉じるの 3 状態。 */
export const Rail: Story = {
  render: args => ({
    components: { Accordion, Avatar, Button, CheckIcon, EllipsisIcon, MenuIcon, Sidebar, SidebarLink },
    setup() {
      const open = ref(true);
      const rail = ref(false);
      return { args, open, rail };
    },
    template: `<div style="display: flex; gap: 12px; height: 460px">
      <Sidebar v-bind="args" id="story-rail-sidebar" :open="open" :rail="rail" :on-rail-change="(next) => rail = next">
        <template #header>
          <div style="display: flex; gap: 10px; align-items: center">
            <Avatar name="Koyori" /><strong v-if="!rail">Koyori workspace</strong>
          </div>
        </template>
        <SidebarLink label="自分のタスク" href="#tasks" current><template #icon><CheckIcon /></template></SidebarLink>
        <SidebarLink label="受信トレイ" href="#inbox" badge="4"><template #icon><EllipsisIcon /></template></SidebarLink>
        <Accordion id="story-rail-projects" label="プロジェクト" :heading-level="2" default-open>
          <SidebarLink label="Koyori UI" href="#ui"><template #icon><CheckIcon /></template></SidebarLink>
        </Accordion>
      </Sidebar>
      <main style="flex: 1; min-width: 0; padding: 12px; border: 1px dashed var(--koyori-color-border); border-radius: 8px">
        <Button ariaLabel="メニュー" variant="ghost" :aria-expanded="open" aria-controls="story-rail-sidebar" :on-click="() => open = !open"><template #icon><MenuIcon /></template></Button>
        <p>{{ open ? (rail ? 'アイコンだけ' : '展開') : '閉じている' }}</p>
      </main>
    </div>`,
  }),
};
