import type { Meta, StoryObj } from '@storybook/react-vite';
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

export const WithIcon: Story = { args: { variant: 'tertiary', icon: <EllipsisIcon size={16} /> } };
export const IconOnly: Story = {
  args: { variant: 'tertiary', ariaLabel: 'その他の操作', icon: <EllipsisIcon size={16} /> },
  render: ({ label, ...args }) => <Button {...args} ariaLabel={args.ariaLabel ?? 'その他の操作'} />,
};

// 狭い flex の行でも縮まず、日本語のラベルが折れない。
export const NarrowRow: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, width: 200 }}>
      <Button label="保存" />
      <Button label="重大" variant="danger" />
      <Button label="キャンセル" variant="tertiary" />
    </div>
  ),
};

// button を広げると、色の付いた面も同じ幅に広がり、ラベルは中央に来る。
// React の Button は style を受けないため、外側の CSS で width: 100% を付ける。
export const FullWidth: Story = {
  args: { label: '保存' },
  render: (args) => (
    <div className="button-full-width" style={{ width: 320 }}>
      <style>{'.button-full-width > button { width: 100%; }'}</style>
      <Button {...args} />
    </div>
  ),
};
