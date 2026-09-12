import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import { Button, Dialog, Field, Input, Picker } from './index';

/* showModal() は開いた瞬間にページ全体を inert にするため、Docs では iframe で描画する。 */
const meta = {
  title: 'Components/Dialog',
  component: Dialog,
  parameters: { layout: 'padded', docs: { story: { inline: false, iframeHeight: 400 } } },
  args: { open: true, title: 'タスクを編集', description: '担当者と期限を変更できます。' },
  render: (args) => ({
    components: { Dialog, Button },
    setup: () => ({ args }),
    template: `<Dialog v-bind="args">
      <p style="margin: 0">本文をここに置きます。</p>
      <template #actions>
        <Button label="キャンセル" variant="tertiary" />
        <Button label="保存" />
      </template>
    </Dialog>`,
  }),
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { open: false },
  render: (args) => ({
    components: { Dialog, Button },
    setup() {
      const open = ref(false);
      return { args, open };
    },
    template: `<div>
      <Button label="ダイアログを開く" :on-click="() => open = true" />
      <Dialog v-bind="args" :open="open" :on-close="() => open = false">
        <p style="margin: 0">Escape、背景クリック、ボタンのどれでも閉じます。</p>
        <template #actions><Button label="閉じる" :on-click="() => open = false" /></template>
      </Dialog>
      <output style="display: block; margin-top: 12px" aria-live="polite">{{ open ? '開いています' : '閉じています' }}</output>
    </div>`,
  }),
};
export const Open: Story = {};
export const WithForm: Story = {
  render: (args) => ({
    components: { Dialog, Button, Field, Input, Picker },
    setup: () => ({ args, teams: [{ value: 'design', label: 'デザイン' }, { value: 'frontend', label: 'Frontend' }] }),
    template: `<Dialog v-bind="args">
      <Field id="dialog-title" label="タイトル"><Input placeholder="例: 請求書を送る" /></Field>
      <Field id="dialog-team" label="担当チーム">
        <Picker label="選んでください" :items="teams" :searchable="false" />
      </Field>
      <template #actions>
        <Button label="キャンセル" variant="tertiary" />
        <Button label="保存" />
      </template>
    </Dialog>`,
  }),
};
export const LongContent: Story = {
  args: { title: '利用条件', description: '最後まで読んでから同意してください。' },
  render: (args) => ({
    components: { Dialog, Button },
    setup: () => ({ args, lines: Array.from({ length: 12 }, (_, index) => index + 1) }),
    template: `<Dialog v-bind="args">
      <p v-for="line in lines" :key="line" style="margin: 0">
        {{ line }}. この文章はダイアログ内のスクロールを確認するための長い本文です。
      </p>
      <template #actions><Button label="同意する" /></template>
    </Dialog>`,
  }),
};
export const NoActions: Story = {
  args: { title: '保存しました', description: '変更はすべて反映されています。' },
  render: (args) => ({
    components: { Dialog },
    setup: () => ({ args }),
    template: '<Dialog v-bind="args" />',
  }),
};
