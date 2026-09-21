import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './index';

const meta = {
  title: 'Components/Badge', component: Badge,
  args: { label: '進行中' },
  argTypes: { size: { control: 'radio', options: ['sm', 'md'] }, dotColor: { control: 'color' } },
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
