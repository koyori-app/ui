import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { Button, ButtonGroup } from './index';

const meta = {
  title: 'Components/ButtonGroup',
  component: ButtonGroup,
  args: { label: 'メールの整理' },
  render: (args) => ({
    components: { Button, ButtonGroup },
    setup: () => ({ args }),
    template: `<ButtonGroup v-bind="args">
      <Button label="アーカイブ" variant="tertiary" />
      <Button label="報告" variant="tertiary" />
      <Button label="スヌーズ" variant="tertiary" />
    </ButtonGroup>`,
  }),
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
