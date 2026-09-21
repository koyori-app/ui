import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import { Tag, type TagProps } from './index';

const removable = (args: TagProps) => ({
  components: { Tag },
  setup: () => ({ args, requests: ref(0), submits: ref(0) }),
  template: `<form @submit.prevent="submits++">
    <Tag v-bind="args" :on-remove="() => requests++" />
    <p>削除通知: <output aria-label="削除通知">{{ requests }}</output> / 送信: <output aria-label="送信回数">{{ submits }}</output></p>
  </form>`,
});

const meta = {
  title: 'Components/Tag', component: Tag,
  args: { label: 'デザイン' },
  argTypes: { size: { control: 'radio', options: ['sm', 'md'] }, dotColor: { control: 'color' } },
  render: args => ({ components: { Tag }, setup: () => ({ args }), template: '<Tag v-bind="args" />' }),
} satisfies Meta<typeof Tag>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const EmptyDot: Story = { args: { dotColor: '' } };
export const WithDot: Story = { args: { dotColor: 'var(--koyori-color-accent)' } };
export const Medium: Story = { args: { size: 'md', dotColor: '#23704b' } };
export const Removable: Story = { render: removable };
export const CustomRemoveLabel: Story = { args: { removeLabel: 'Remove Design label' }, render: removable };
export const LongLabel: Story = {
  args: { label: 'リリース前に確認するアクセシビリティとキーボード操作', dotColor: 'var(--koyori-color-accent)' },
  render: args => ({ components: { Example: removable(args) }, template: '<div style="width: 220px; max-width: 100%"><Example /></div>' }),
};
