import type { Meta, StoryObj } from '@storybook/react-vite';
import { Skeleton } from './index';

const meta = {
  title: 'Components/Skeleton',
  component: Skeleton,
  parameters: { layout: 'padded' },
  render: args => <div style={{ width: 320 }}><Skeleton {...args} /></div>,
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Text: Story = { args: { lines: 3 } };
export const Avatar: Story = { args: { width: '40px', height: '40px', radius: '50%' } };

/* 読み上げは領域ごとに aria-busy で伝え、Skeleton 自体は飾りのままにする。 */
export const Card: Story = {
  render: () => (
    <div aria-busy="true" style={{ display: 'grid', gap: 12, width: 320, padding: 16, border: '1px solid var(--koyori-color-border)', borderRadius: 12, background: 'var(--koyori-color-surface)' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Skeleton width="40px" height="40px" radius="50%" />
        <Skeleton width="120px" height="16px" />
      </div>
      <Skeleton lines={2} />
      <Skeleton width="96px" height="36px" />
    </div>
  ),
};

/* 暗い背景でも縁が消えないことを確認する。 */
export const DarkBackground: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, width: 320, padding: 16, borderRadius: 12, background: '#2b2733' }}>
      <Skeleton />
      <Skeleton lines={3} />
    </div>
  ),
};
