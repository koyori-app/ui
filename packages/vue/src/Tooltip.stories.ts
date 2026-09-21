import { ref } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { Button, EllipsisIcon, Tooltip } from './index';

const meta = {
  title: 'Components/Tooltip',
  component: Tooltip,
  parameters: { layout: 'padded' },
  args: { id: 'action-help', content: 'タスクの移動・複製などを選びます。' },
  render: (args) => ({
    components: { Tooltip, Button, EllipsisIcon }, setup: () => ({ args }),
    template: `<div style="padding: 64px"><Tooltip v-bind="args"><Button ariaLabel="その他の操作" variant="tertiary"><template #icon><EllipsisIcon /></template></Button></Tooltip><button style="margin-left: 24px">次へ</button></div>`,
  }),
} satisfies Meta<typeof Tooltip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Bottom: Story = { args: { placement: 'bottom' } };
export const Left: Story = { args: { placement: 'left' } };
export const Right: Story = { args: { placement: 'right' } };
export const Empty: Story = { args: { content: '   ' } };
export const Disabled: Story = { args: { disabled: true } };
export const LongText: Story = { args: { content: '担当者・期限・進捗率は詳細画面でも確認できます。変更前に内容を確認してください。'.repeat(4) + '\n' + 'long-unbroken-reference-'.repeat(8) } };
export const ExistingDescription: Story = {
  render: (args) => ({
    components: { Tooltip }, setup: () => ({ args }),
    template: '<div style="padding: 64px"><p id="existing-description">操作は取り消せます。</p><Tooltip v-bind="args"><button aria-describedby="existing-description">編集</button></Tooltip></div>',
  }),
};
export const DisabledTrigger: Story = {
  render: (args) => ({ components: { Tooltip, Button }, setup: () => ({ args }), template: '<Tooltip v-bind="args"><Button label="削除" disabled /></Tooltip>' }),
};
export const DisabledWrapper: Story = {
  args: { content: 'このタスクを削除する権限がありません。' },
  render: (args) => ({
    components: { Tooltip, Button }, setup: () => ({ args }),
    template: '<div style="padding: 64px"><Tooltip v-bind="args"><span tabindex="0" role="group" aria-label="削除できない理由"><span style="pointer-events: none"><Button label="削除" disabled /></span></span></Tooltip></div>',
  }),
};
export const Edges: Story = {
  render: (args) => ({
    components: { Tooltip, Button }, setup: () => ({ args, placements: ['top', 'bottom', 'left', 'right'] }),
    template: `<div v-for="(placement, i) in placements" :key="placement" :style="{ position: 'fixed', [i < 2 ? 'top' : 'bottom']: 0, [i % 2 ? 'right' : 'left']: 0 }"><Tooltip v-bind="args" :id="'edge-' + placement" :placement="placement"><Button :label="placement" /></Tooltip></div>`,
  }),
};
export const Clipped: Story = {
  render: (args) => ({
    components: { Tooltip, Button }, setup: () => ({ args }),
    template: '<div style="margin: 80px; width: 100px; height: 40px; overflow: hidden; transform: translateX(10px)"><Tooltip v-bind="args"><Button label="補足" /></Tooltip></div>',
  }),
};
export const InDialog: Story = {
  render: (args) => ({
    components: { Tooltip, Button }, setup: () => ({ args }),
    template: '<dialog id="tooltip-dialog" style="padding: 48px"><Tooltip v-bind="args"><Button label="補足" /></Tooltip><button style="margin-left: 24px">次へ</button></dialog>',
  }),
};
const ChangingTrigger = {
  setup() {
    const description = ref('existing-description');
    return { description, change() {
      description.value = description.value === 'existing-description' ? 'updated-description' : description.value === 'updated-description' ? '' : 'existing-description';
    } };
  },
  template: '<button :aria-describedby="description || undefined" @click="change">補足</button>',
};
export const Dynamic: Story = {
  render: () => ({
    components: { Tooltip, ChangingTrigger }, setup: () => ({ content: ref('最初の説明'), disabled: ref(false), mounted: ref(true) }),
    template: `<div style="padding: 64px">
      <p id="existing-description">操作は取り消せます。</p><p id="updated-description">操作を変更しました。</p>
      <Tooltip v-if="mounted" id="changing-help" :content="content" :disabled="disabled"><ChangingTrigger /></Tooltip>
      <button @click="content = '変更した説明'">内容を変更</button><button @click="disabled = !disabled">無効を切り替え</button>
      <button @click="mounted = false">Tooltipを破棄</button>
    </div>`,
  }),
};
