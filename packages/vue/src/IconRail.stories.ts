import { ref } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ContextMenu, IconRail, IconRailItem, IconRailSeparator, type ContextMenuItem } from './index';

/* 外部の画像に頼らないよう、色の四角を data URI で描く。壊れた画像は読み込みに失敗させて絵文字へ落とす。 */
const image = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#3b82f6"/><circle cx="40" cy="40" r="20" fill="#fbbf24"/></svg>')}`;
const broken = 'data:image/png;base64,AAAA';
const plus = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>';
const tenants = [
  { id: 'acme', label: 'Acme', src: image },
  { id: 'yoshino', label: '𠮷野商店' },
  { id: 'tea', label: 'お茶会', emoji: '🍵' },
  { id: 'both', label: '画像と絵文字', src: image, emoji: '🌸' },
  { id: 'broken', label: '読めない画像', src: broken, emoji: '🌿' },
];
const frame = `display: flex; height: 480px; background: var(--koyori-color-surface)`;
const edge = `display: flex; border-right: 1px solid var(--koyori-color-border)`;

const meta = {
  title: 'Components/IconRail',
  component: IconRail,
  parameters: { layout: 'fullscreen' },
  args: { label: 'テナント' },
} satisfies Meta<typeof IconRail>;
export default meta;
type Story = StoryObj<typeof meta>;

// 押した項目を story の中に出す。検査はこの出力を読む。
export const Default: Story = {
  render: (args) => ({
    components: { IconRail, IconRailItem, IconRailSeparator },
    setup: () => {
      const log = ref<string[]>([]);
      const selected = ref('acme');
      return { args, tenants, plus, frame, edge, log, selected, pick(id: string) { selected.value = id; log.value.push(`click:${id}`); } };
    },
    template: `<div style="display: flex">
      <div :style="frame"><div :style="edge">
        <IconRail v-bind="args">
          <IconRailItem v-for="tenant in tenants" :key="tenant.id" v-bind="tenant" :id="'rail-' + tenant.id" :selected="selected === tenant.id" :on-click="() => pick(tenant.id)" />
          <IconRailSeparator />
          <IconRailItem id="rail-add" label="テナントを追加" variant="action" :on-click="() => log.push('click:add')"><template #icon><span v-html="plus" style="display: contents" /></template></IconRailItem>
          <IconRailItem id="rail-invite" label="招待（無効）" variant="action" disabled :on-click="() => log.push('click:invite')"><template #icon><span v-html="plus" style="display: contents" /></template></IconRailItem>
        </IconRail>
      </div></div>
      <output data-testid="log" style="display: block; padding: 16px">{{ log.join(' ') }}</output>
    </div>`,
  }),
};

export const Many: Story = {
  render: (args) => ({
    components: { IconRail, IconRailItem },
    setup: () => ({ args, edge }),
    template: `<div style="display: flex; height: 360px; background: var(--koyori-color-surface)"><div :style="edge">
      <IconRail v-bind="args">
        <IconRailItem v-for="i in 30" :key="i" :id="'rail-many-' + i" :label="'テナント ' + i" :selected="i === 1" />
      </IconRail>
    </div></div>`,
  }),
};

export const ActionAndSeparator: Story = {
  render: (args) => ({
    components: { IconRail, IconRailItem, IconRailSeparator },
    setup: () => ({ args, image, plus, frame, edge }),
    template: `<div :style="frame"><div :style="edge">
      <IconRail v-bind="args">
        <IconRailItem id="rail-home" label="ホーム" emoji="🏠" selected />
        <IconRailSeparator />
        <IconRailItem id="rail-acme" label="Acme" :src="image" />
        <IconRailItem id="rail-tea" label="お茶会" emoji="🍵" />
        <IconRailSeparator />
        <IconRailItem id="rail-add" label="テナントを追加" variant="action"><template #icon><span v-html="plus" style="display: contents" /></template></IconRailItem>
      </IconRail>
    </div></div>`,
  }),
};

const menuItems: ContextMenuItem[] = [
  { value: 'settings', label: 'テナントの設定' },
  { value: 'leave', label: 'テナントから抜ける', destructive: true },
];

export const WithMenu: Story = {
  render: (args) => ({
    components: { ContextMenu, IconRail, IconRailItem },
    setup: () => {
      const log = ref<string[]>([]);
      const menu = ref({ open: false, x: 0, y: 0, tenant: '' });
      return {
        args, tenants: tenants.slice(0, 3), frame, edge, log, menu, menuItems,
        openMenu(id: string, position: { x: number; y: number }) { log.value.push(`menu:${id}`); menu.value = { open: true, ...position, tenant: id }; },
      };
    },
    template: `<div style="display: flex">
      <div :style="frame"><div :style="edge">
        <IconRail v-bind="args">
          <IconRailItem v-for="tenant in tenants" :key="tenant.id" v-bind="tenant" :id="'rail-menu-' + tenant.id" :selected="tenant.id === 'acme'" :menu-open="menu.open && menu.tenant === tenant.id"
            :on-click="() => log.push('click:' + tenant.id)" :on-menu="(position) => openMenu(tenant.id, position)" />
          <IconRailItem id="rail-menu-plain" label="メニューなし" emoji="📦" :on-click="() => log.push('click:plain')" />
          <IconRailItem id="rail-menu-locked" label="無効なテナント" emoji="🔒" disabled :on-menu="() => log.push('menu:locked')" />
        </IconRail>
      </div></div>
      <ContextMenu label="テナントの操作" id="rail-context-menu" :open="menu.open" :x="menu.x" :y="menu.y" :items="menuItems"
        :on-select="(value) => log.push('select:' + menu.tenant + ':' + value)" :on-close="() => { menu.open = false; }" />
      <output data-testid="log" style="display: block; padding: 16px">{{ log.join(' ') }}</output>
    </div>`,
  }),
};
