import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { Breadcrumb } from './index';

const items = [
  { label: 'プロジェクト', href: '/projects' },
  { label: 'Koyori UI', href: '/projects/ui' },
  { label: 'コンポーネント', href: '/projects/ui/components' },
  { label: 'Breadcrumb' },
];

const meta = {
  title: 'Components/Breadcrumb',
  component: Breadcrumb,
  parameters: { layout: 'padded' },
  args: { items },
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Single: Story = { args: { items: [{ label: 'ダッシュボード' }] } };
export const CurrentAsLink: Story = {
  args: { items: [...items.slice(0, 3), { label: 'Breadcrumb', href: '/projects/ui/components/breadcrumb' }] },
};
/* 折り返しの確認。狭い親に入れる。 */
export const LongLabels: Story = {
  args: {
    items: [
      { label: 'すべてのプロジェクト', href: '/projects' },
      { label: 'デザインシステムの刷新とコンポーネントの整理', href: '/projects/ui' },
      { label: 'パンくずリストの追加' },
    ],
  },
  render: (args) => ({
    components: { Breadcrumb },
    setup: () => ({ args }),
    template: '<div style="width: 240px"><Breadcrumb v-bind="args" /></div>',
  }),
};
export const Empty: Story = { args: { items: [] } };
