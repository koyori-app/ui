import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { Avatar } from './index';

/* 外部通信に頼らないよう、画像は SVG のデータ URI を使う。 */
const photo = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><rect width="2" height="2" fill="%23c4b5df"/><circle cx="1" cy="0.75" r="0.45" fill="%23faf8f5"/><circle cx="1" cy="2.1" r="0.85" fill="%23faf8f5"/></svg>';

const meta = {
  title: 'Components/Avatar',
  component: Avatar,
  args: { name: '山田 太郎' },
  render: (args) => ({
    components: { Avatar },
    setup: () => ({ args }),
    template: '<Avatar v-bind="args" />',
  }),
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithImage: Story = { args: { src: photo } };
export const Initials: Story = {};
export const SingleWordName: Story = { args: { name: 'yupix' } };
export const BrokenImage: Story = { args: { src: 'data:image/svg+xml;utf8,broken' } };
export const Large: Story = { args: { src: photo, size: 64 } };
