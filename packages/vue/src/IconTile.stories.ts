import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { IconTile } from './index';

/* 外部の画像に頼らないよう、色の四角を data URI で描く。 */
const sampleImage = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#3b82f6"/><circle cx="40" cy="40" r="20" fill="#fbbf24"/></svg>')}`;

const meta = {
  title: 'Components/IconTile',
  component: IconTile,
  args: { name: 'Acme' },
} satisfies Meta<typeof IconTile>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Image: Story = { args: { src: sampleImage } };
export const Emoji: Story = { args: { name: 'お茶会', emoji: '🍵' } };
export const Initial: Story = { args: { name: '𠮷野商店' } };
export const Small: Story = {
  render: () => ({
    components: { IconTile },
    setup: () => ({ sampleImage }),
    template: `<div style="display: flex; gap: 8px">
      <IconTile name="Acme" :src="sampleImage" :size="24" />
      <IconTile name="お茶会" emoji="🍵" :size="24" />
      <IconTile name="𠮷野商店" :size="24" />
    </div>`,
  }),
};
