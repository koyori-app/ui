import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { Badge } from './index';

const meta = {
  title: 'Components/Badge', component: Badge,
  args: { label: '進行中' },
  argTypes: {
    size: { control: 'radio', options: ['sm', 'md'] }, dotColor: { control: 'color' },
    tone: { control: 'radio', options: ['neutral', 'danger', 'warning', 'success', 'info'] }, appearance: { control: 'radio', options: ['soft', 'outline'] },
  },
  render: args => ({ components: { Badge }, setup: () => ({ args }), template: '<Badge v-bind="args" />' }),
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const EmptyDot: Story = { args: { dotColor: '' } };
export const WithDot: Story = { args: { dotColor: 'var(--koyori-color-accent)' } };
export const Medium: Story = { args: { size: 'md', dotColor: '#23704b' } };
export const Zero: Story = { args: { label: 0 } };
export const Count: Story = { args: { label: 123456789 } };
export const LongLabel: Story = {
  args: { label: 'AwaitingAccessibilityAndKeyboardVerificationBeforeRelease', dotColor: 'var(--koyori-color-accent)' },
  render: args => ({ components: { Badge }, setup: () => ({ args }), template: '<div style="width: 220px; max-width: 100%"><Badge v-bind="args" /></div>' }),
};

// 色の種類。上の段が soft（淡い塗り）、下の段が outline（枠と文字）。
const tones = ['neutral', 'danger', 'warning', 'success', 'info'] as const;
export const Tones: Story = {
  render: () => ({
    components: { Badge },
    setup: () => ({ tones, appearances: ['soft', 'outline'] }),
    template: `<div style="display: grid; gap: 8px">
      <div v-for="appearance in appearances" :key="appearance" style="display: flex; flex-wrap: wrap; gap: 8px">
        <Badge v-for="tone in tones" :key="tone" :label="tone" :tone="tone" :appearance="appearance" />
      </div>
    </div>`,
  }),
};
// ファイルの木の件数のように、数だけを色付きで出す。
export const ToneCount: Story = { args: { label: '2 / 3', tone: 'danger' } };
