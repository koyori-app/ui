import { ref } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { Button, Drawer, UserPanel, type UserPanelSection } from './index';

const gear = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>';
const items: UserPanelSection[] = [
  { items: [{ value: 'profile', label: 'プロフィール', href: '#profile' }, { value: 'settings', label: 'アカウントの設定', href: '#settings' }] },
  { items: [{ value: 'logout', label: 'ログアウト', destructive: true }] },
];
// icon には色を入れ、item-icon スロットで丸を描く。
const iconItems: UserPanelSection[] = [
  { items: [
    { value: 'profile', label: 'プロフィール', href: '#profile', icon: '#3b82f6' },
    { value: 'theme', label: '表示の設定', icon: '#a855f7' },
    { value: 'help', label: 'ヘルプ（準備中）', disabled: true },
  ] },
  { items: [{ value: 'logout', label: 'ログアウト', destructive: true, icon: '#ef4444' }] },
];
const sidebar = (align: 'start' | 'end') => `display: flex; flex-direction: column; justify-content: ${align === 'end' ? 'flex-end' : 'flex-start'}; box-sizing: border-box; width: 240px; height: 100vh; padding: 8px; overflow: hidden; background: var(--koyori-color-surface-raised); border-right: 1px solid var(--koyori-color-border)`;

const meta = {
  title: 'Components/UserPanel',
  component: UserPanel,
  parameters: { layout: 'fullscreen' },
  args: { name: 'hanako', description: 'hanako@example.com', cardLabel: 'hanako のプロフィール', items },
} satisfies Meta<typeof UserPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

// onSelect・onOpenChange の呼ばれ方を story の中に出す。検査はこの出力を読む。
// サイドバーの下端に置く。overflow: hidden の中でもカードが切られないことを見る。
const example = (align: 'start' | 'end' = 'end') => (args: any) => ({
  components: { Button, UserPanel },
  setup: () => ({ args, gear, style: sidebar(align), log: ref<string[]>([]) }),
  template: `<div style="display: flex">
    <div :style="style">
      <UserPanel v-bind="args" :on-select="(value) => log.push('select:' + value)" :on-open-change="(open) => log.push(open ? 'open' : 'close')">
        <template #action><Button ariaLabel="設定" variant="ghost" :on-click="() => log.push('action')"><template #icon><span v-html="gear" style="display: contents" /></template></Button></template>
        <template #item-icon="{ item }"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5" :fill="item.icon" /></svg></template>
      </UserPanel>
    </div>
    <div style="padding: 16px"><button type="button">外のボタン</button><output data-testid="log" style="display: block; padding: 16px">{{ log.join(' ') }}</output></div>
  </div>`,
});

export const Default: Story = { render: example() };
export const Open: Story = { args: { defaultOpen: true }, render: example() };
export const Compact: Story = {
  render: (args) => ({
    components: { Button, UserPanel },
    setup: () => ({ args, gear, log: ref<string[]>([]) }),
    template: `<div style="display: flex">
      <div style="display: flex; flex-direction: column; justify-content: flex-end; height: 100vh; padding: 8px; box-sizing: border-box">
        <UserPanel v-bind="args" compact :on-select="(value) => log.push('select:' + value)">
          <template #action><Button ariaLabel="設定" variant="ghost"><template #icon><span v-html="gear" style="display: contents" /></template></Button></template>
        </UserPanel>
      </div>
      <output data-testid="log" style="display: block; padding: 16px">{{ log.join(' ') }}</output>
    </div>`,
  }),
};
export const LongText: Story = {
  args: { name: 'とても長い表示名のユーザー・プロダクト開発部・デザインチーム', description: 'a-very-long-email-address-for-testing@subdomain.example.com', defaultOpen: true },
  render: example(),
};
export const WithIcons: Story = { args: { items: iconItems, defaultOpen: true }, render: example() };
// 上端に置くと、上に入らないので下に出る。
export const TopEdge: Story = { args: { defaultOpen: true }, render: example('start') };
export const InDrawer: Story = {
  render: (args) => ({
    components: { Button, Drawer, UserPanel },
    setup: () => ({ args, open: ref(true), log: ref<string[]>([]) }),
    template: `<div>
      <Button label="ドロワーを開く" :on-click="() => open = true" />
      <Drawer :open="open" label="メニュー" placement="left" :on-close="() => open = false">
        <div style="display: flex; flex-direction: column; justify-content: flex-end; height: 100%; box-sizing: border-box; padding: 8px; overflow: hidden">
          <UserPanel v-bind="args" :on-select="(value) => log.push('select:' + value)" />
        </div>
      </Drawer>
      <output data-testid="log" style="display: block; padding: 16px">{{ log.join(' ') }}</output>
    </div>`,
  }),
};
