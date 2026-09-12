import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import { Button, ConfirmDialog } from './index';

const meta = {
  title: 'Components/ConfirmDialog',
  component: ConfirmDialog,
  parameters: { layout: 'padded', docs: { story: { inline: false, iframeHeight: 360 } } },
  args: {
    open: true, title: 'タスクを削除しますか？', message: 'この操作は取り消せません。',
    confirmLabel: '削除する', destructive: true,
  },
  render: (args) => ({
    components: { ConfirmDialog },
    setup: () => ({ args }),
    template: '<ConfirmDialog v-bind="args" />',
  }),
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { open: false },
  render: (args) => ({
    components: { ConfirmDialog, Button },
    setup() {
      const open = ref(false);
      const result = ref('未実行');
      return { args, open, result };
    },
    template: `<div>
      <Button label="タスクを削除" variant="danger" :on-click="() => open = true" />
      <ConfirmDialog v-bind="args" :open="open"
        :on-cancel="() => { open = false; result = '取り消しました'; }"
        :on-confirm="() => { open = false; result = '削除しました'; }" />
      <output style="display: block; margin-top: 12px" aria-live="polite">{{ result }}</output>
    </div>`,
  }),
};
export const Destructive: Story = {};
export const Open: Story = {
  args: { title: '変更を保存しますか？', message: '未保存の変更があります。', confirmLabel: '保存する', destructive: false },
};
export const Localized: Story = {
  args: { title: 'Delete this task?', message: 'This cannot be undone.', confirmLabel: 'Delete', cancelLabel: 'Cancel' },
};
