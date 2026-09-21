import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Tag, type TagProps } from './index';

function RemovableExample(args: TagProps) {
  const [requests, setRequests] = useState(0);
  const [submits, setSubmits] = useState(0);
  return <form onSubmit={event => { event.preventDefault(); setSubmits(count => count + 1); }}>
    <Tag {...args} onRemove={() => setRequests(count => count + 1)} />
    <p>削除通知: <output aria-label="削除通知">{requests}</output> / 送信: <output aria-label="送信回数">{submits}</output></p>
  </form>;
}

const meta = {
  title: 'Components/Tag', component: Tag,
  args: { label: 'デザイン' },
  argTypes: { size: { control: 'radio', options: ['sm', 'md'] }, dotColor: { control: 'color' } },
} satisfies Meta<typeof Tag>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const EmptyDot: Story = { args: { dotColor: '' } };
export const WithDot: Story = { args: { dotColor: 'var(--koyori-color-accent)' } };
export const Medium: Story = { args: { size: 'md', dotColor: '#23704b' } };
export const Removable: Story = { render: args => <RemovableExample {...args} /> };
export const CustomRemoveLabel: Story = { args: { removeLabel: 'Remove Design label' }, render: args => <RemovableExample {...args} /> };
export const LongLabel: Story = {
  args: { label: 'リリース前に確認するアクセシビリティとキーボード操作', dotColor: 'var(--koyori-color-accent)' },
  render: args => <div style={{ width: 220, maxWidth: '100%' }}><RemovableExample {...args} /></div>,
};
