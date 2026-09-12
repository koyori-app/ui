import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Dropdown, EllipsisIcon, type DropdownProps } from './index';

const meta = {
  title: 'Components/Dropdown',
  component: Dropdown,
  parameters: { layout: 'padded' },
  args: {
    label: 'ワークスペース',
    defaultOpen: false,
    disabled: false,
    items: [
      { value: 'recent', label: '最近使った項目' },
      { value: 'favorites', label: 'お気に入り' },
      { value: 'shared', label: '共有' },
      { value: 'private', label: 'プライベート' },
    ],
  },
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Open: Story = { args: { defaultOpen: true } };
export const Disabled: Story = { args: { disabled: true } };
export const DisabledItem: Story = {
  args: {
    defaultOpen: true,
    items: [
      { value: 'edit', label: '編集' },
      { value: 'share', label: '共有（権限が必要）', disabled: true },
      { value: 'duplicate', label: '複製' },
    ],
  },
};
export const Empty: Story = { args: { defaultOpen: true, items: [] } };
export const Localized: Story = { args: { label: 'Actions', defaultOpen: true, items: [], emptyMessage: 'No actions available' } };
export const LongLabel: Story = {
  args: {
    defaultOpen: true,
    items: [
      { value: 'short', label: '短い項目' },
      { value: 'long', label: '複数行に折り返す長い項目でも背景が項目の高さに合わせて滑らかに移動します' },
      { value: 'last', label: '最後の項目' },
    ],
  },
};

export const CustomIcon: Story = {
  render: (args) => <Dropdown {...args} icon={<EllipsisIcon />} />,
};
export const BottomEdge: Story = {
  args: { defaultOpen: true },
  render: (args) => <div style={{ position: 'fixed', bottom: 16, left: 16 }}><Dropdown {...args} /></div>,
};
export const NoIcon: Story = { args: { icon: null } };
export const Scrollable: Story = {
  args: {
    defaultOpen: true,
    items: Array.from({ length: 20 }, (_, index) => ({ value: String(index), label: `項目 ${index + 1}` })),
  },
};

function ActionExample(args: DropdownProps) {
  const [action, setAction] = useState('未実行');
  return <div>
    <button type="button">前の操作</button>
    <Dropdown {...args} onSelect={(value) => { setAction(value); args.onSelect?.(value); }} />
    <button type="button">次の操作</button>
    <output style={{ display: 'block', marginTop: 12 }} aria-live="polite">操作: {action}</output>
  </div>;
}
export const Actions: Story = {
  render: (args) => <ActionExample {...args} />,
};
export const TwoMenus: Story = {
  render: (args) => <div><Dropdown {...args} /><Dropdown {...args} label="別の操作" /></div>,
};
