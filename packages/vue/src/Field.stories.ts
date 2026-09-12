import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { Field, Input, Textarea } from './index';

const meta = {
  title: 'Components/Field',
  component: Field,
  parameters: { layout: 'padded' },
  decorators: [() => ({ template: '<div style="max-width: 360px"><story /></div>' })],
  args: { id: 'title', label: 'タイトル', description: '一覧に表示される名前です。', required: false },
  render: (args) => ({
    components: { Field, Input },
    setup: () => ({ args }),
    template: '<Field v-bind="args"><Input placeholder="例: 請求書を送る" /></Field>',
  }),
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Invalid: Story = { args: { required: true, error: 'タイトルを入力してください。' } };
export const Disabled: Story = {
  render: (args) => ({
    components: { Field, Input },
    setup: () => ({ args }),
    template: '<Field v-bind="args"><Input value="請求書を送る" disabled /></Field>',
  }),
};
export const WithTextarea: Story = {
  args: { id: 'note', label: 'メモ', description: '担当者に共有したい補足を書きます。' },
  render: (args) => ({
    components: { Field, Textarea },
    setup: () => ({ args }),
    template: '<Field v-bind="args"><Textarea :rows="4" /></Field>',
  }),
};
export const StandaloneInput: Story = {
  render: () => ({
    components: { Input },
    template: '<Input type="search" aria-label="タスクを検索" placeholder="検索" />',
  }),
};
