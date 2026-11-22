import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './index';

const meta = {
  title: 'Components/Badge', component: Badge,
  args: { label: '進行中' },
  argTypes: {
    size: { control: 'radio', options: ['sm', 'md'] }, dotColor: { control: 'color' },
    tone: { control: 'radio', options: ['neutral', 'danger', 'warning', 'success', 'info'] }, appearance: { control: 'radio', options: ['soft', 'outline'] },
  },
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
  render: args => <div style={{ width: 220, maxWidth: '100%' }}><Badge {...args} /></div>,
};

// 色の種類。上の段が soft（淡い塗り）、下の段が outline（枠と文字）。
const tones = ['neutral', 'danger', 'warning', 'success', 'info'] as const;
export const Tones: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 8 }}>
      {(['soft', 'outline'] as const).map(appearance => (
        <div key={appearance} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {tones.map(tone => <Badge key={tone} label={tone} tone={tone} appearance={appearance} />)}
        </div>
      ))}
    </div>
  ),
};
// ファイルの木の件数のように、数だけを色付きで出す。
export const ToneCount: Story = { args: { label: '2 / 3', tone: 'danger' } };
