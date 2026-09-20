import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import { Calendar } from './index';

const meta = {
  title: 'Components/Calendar',
  component: Calendar,
  parameters: { layout: 'padded' },
  args: { label: '予定日', locale: 'ja-JP', today: '2026-09-16', defaultValue: '2026-09-18' },
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const MondayFirst: Story = { args: { firstDayOfWeek: 1 } };
export const English: Story = { args: { locale: 'en-US', previousMonthLabel: 'Previous month', nextMonthLabel: 'Next month' } };
export const Range: Story = { args: { min: '2026-09-10', max: '2026-10-20' } };
export const DisabledWeekends: Story = {
  args: { isDateDisabled: (date: string) => [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay()) },
};

export const Controlled: Story = {
  render: () => ({
    components: { Calendar },
    setup() {
      const date = ref('2026-09-18');
      return { date };
    },
    template: `<div style="display: grid; gap: 12px; justify-items: start">
      <Calendar label="予定日" locale="ja-JP" today="2026-09-16" :value="date" :on-value-change="(value) => (date = value)" />
      <p style="margin: 0">選択: {{ date }}</p>
    </div>`,
  }),
};
