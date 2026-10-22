import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { Button, EllipsisIcon } from './index';

const meta = {
  title: 'Components/Button',
  component: Button,
  args: { label: 'Continue', variant: 'primary', disabled: false, type: 'button' },
  argTypes: {
    variant: {
      control: 'radio',
      options: ['primary', 'secondary', 'tertiary', 'ghost', 'danger'],
    },
  },
  render: (args) => ({
    components: { Button },
    setup: () => ({ args }),
    template: '<Button v-bind="args" />',
  }),
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Tertiary: Story = { args: { variant: 'tertiary' } };
export const Ghost: Story = { args: { variant: 'ghost' } };

export const PrimaryDisabled: Story = { args: { disabled: true } };
export const SecondaryDisabled: Story = { args: { variant: 'secondary', disabled: true } };
export const TertiaryDisabled: Story = { args: { variant: 'tertiary', disabled: true } };
export const GhostDisabled: Story = { args: { variant: 'ghost', disabled: true } };
export const Danger: Story = { args: { label: '削除する', variant: 'danger' } };
export const DangerDisabled: Story = { args: { label: '削除する', variant: 'danger', disabled: true } };

const iconTemplate = '<Button v-bind="args"><template #icon><EllipsisIcon :size="16" /></template></Button>';

export const WithIcon: Story = {
  args: { variant: 'tertiary' },
  render: (args) => ({
    components: { Button, EllipsisIcon },
    setup: () => ({ args }),
    template: iconTemplate,
  }),
};
export const IconOnly: Story = {
  args: { variant: 'tertiary', ariaLabel: 'その他の操作' },
  render: ({ label, ...args }) => ({
    components: { Button, EllipsisIcon },
    setup: () => ({ args }),
    template: iconTemplate,
  }),
};

// 狭い flex の行でも縮まず、日本語のラベルが折れない。
export const NarrowRow: Story = {
  render: () => ({
    components: { Button },
    template: `<div style="display: flex; gap: 8px; width: 200px">
      <Button label="保存" />
      <Button label="重大" variant="danger" />
      <Button label="キャンセル" variant="tertiary" />
    </div>`,
  }),
};

// button を広げると、色の付いた面も同じ幅に広がり、ラベルは中央に来る。
export const FullWidth: Story = {
  args: { label: '保存' },
  render: (args) => ({
    components: { Button },
    setup: () => ({ args }),
    template: '<div style="width: 320px"><Button v-bind="args" style="width: 100%" /></div>',
  }),
};
