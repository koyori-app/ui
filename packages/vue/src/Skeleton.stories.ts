import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { Skeleton } from './index';

const meta = {
  title: 'Components/Skeleton',
  component: Skeleton,
  parameters: { layout: 'padded' },
  render: args => ({
    components: { Skeleton },
    setup: () => ({ args }),
    template: '<div style="width: 320px"><Skeleton v-bind="args" /></div>',
  }),
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Text: Story = { args: { lines: 3 } };
export const Avatar: Story = { args: { width: '40px', height: '40px', radius: '50%' } };

/* 読み上げは領域ごとに aria-busy で伝え、Skeleton 自体は飾りのままにする。 */
export const Card: Story = {
  render: () => ({
    components: { Skeleton },
    template: `<div aria-busy="true" style="display: grid; gap: 12px; width: 320px; padding: 16px; border: 1px solid var(--koyori-color-border); border-radius: 12px; background: var(--koyori-color-surface)">
      <div style="display: flex; gap: 12px; align-items: center">
        <Skeleton width="40px" height="40px" radius="50%" />
        <Skeleton width="120px" height="16px" />
      </div>
      <Skeleton :lines="2" />
      <Skeleton width="96px" height="36px" />
    </div>`,
  }),
};

/* 暗い背景でも縁が消えないことを確認する。 */
export const DarkBackground: Story = {
  render: () => ({
    components: { Skeleton },
    template: `<div style="display: grid; gap: 12px; width: 320px; padding: 16px; border-radius: 12px; background: #2b2733">
      <Skeleton />
      <Skeleton :lines="3" />
    </div>`,
  }),
};
