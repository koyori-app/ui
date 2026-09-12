import type { Meta, StoryObj } from '@storybook/react-vite';
import { Field, Input, Textarea } from './index';

const meta = {
  title: 'Components/Field',
  component: Field,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div style={{ maxWidth: 360 }}><Story /></div>],
  args: { id: 'title', label: 'タイトル', description: '一覧に表示される名前です。', required: false },
  render: (args) => (
    <Field {...args}>
      <Input placeholder="例: 請求書を送る" />
    </Field>
  ),
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Invalid: Story = { args: { required: true, error: 'タイトルを入力してください。' } };
export const Disabled: Story = {
  render: (args) => <Field {...args}><Input value="請求書を送る" disabled /></Field>,
};
export const WithTextarea: Story = {
  args: { id: 'note', label: 'メモ', description: '担当者に共有したい補足を書きます。' },
  render: (args) => <Field {...args}><Textarea rows={4} /></Field>,
};
export const StandaloneInput: Story = {
  render: () => <Input type="search" ariaLabel="タスクを検索" placeholder="検索" />,
};
