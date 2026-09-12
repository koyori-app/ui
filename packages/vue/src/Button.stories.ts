import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { Button, EllipsisIcon } from './index';

const meta = {
  title: 'Components/Button',
  component: Button,
  args: { label: 'Continue', variant: 'primary', disabled: false, type: 'button' },
  argTypes: {
    variant: {
      control: 'radio',
      options: ['primary', 'secondary', 'tertiary', 'ghost'],
    },
  },
  render: (args) => ({
    components: { Button },
    setup: () => ({ args }),
    template: '<Button v-bind="args" />',
  }),
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Tertiary: Story = { args: { variant: 'tertiary' } };
export const Ghost: Story = { args: { variant: 'ghost' } };

export const PrimaryDisabled: Story = { args: { disabled: true } };
export const SecondaryDisabled: Story = { args: { variant: 'secondary', disabled: true } };
export const TertiaryDisabled: Story = { args: { variant: 'tertiary', disabled: true } };
export const GhostDisabled: Story = { args: { variant: 'ghost', disabled: true } };

const iconTemplate = '<Button v-bind="args"><template #icon><EllipsisIcon :size="16" /></template></Button>';

export const WithIcon: Story = {
  args: { variant: 'tertiary' },
  render: (args) => ({
    components: { Button, EllipsisIcon },
    setup: () => ({ args }),
    template: iconTemplate,
  }),
};
export const IconOnly: Story = {
  args: { variant: 'tertiary', ariaLabel: 'その他の操作' },
  render: ({ label, ...args }) => ({
    components: { Button, EllipsisIcon },
    setup: () => ({ args }),
    template: iconTemplate,
  }),
};
