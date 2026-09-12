import type { Meta, StoryObj } from '@storybook/react-vite';
import { AvatarGroup } from './index';

const photo = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><rect width="2" height="2" fill="%23c4b5df"/><circle cx="1" cy="0.75" r="0.45" fill="%23faf8f5"/><circle cx="1" cy="2.1" r="0.85" fill="%23faf8f5"/></svg>';

const members = [
  { name: '山田 太郎', src: photo },
  { name: '佐藤 花子' },
  { name: 'yupix', src: photo },
  { name: '鈴木 一郎' },
  { name: '高橋 次郎' },
];

const meta = {
  title: 'Components/AvatarGroup',
  component: AvatarGroup,
  args: { label: 'タスクの担当者', items: members },
} satisfies Meta<typeof AvatarGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithMax: Story = { args: { max: 3 } };
export const MaxAboveCount: Story = { args: { max: 10 } };
export const Single: Story = { args: { items: members.slice(0, 1) } };
export const Large: Story = { args: { max: 3, size: 48 } };
