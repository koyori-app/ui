import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import { Button, DatePicker, Dialog, Field } from './index';

const meta = {
  title: 'Components/DatePicker',
  component: DatePicker,
  parameters: { layout: 'padded' },
  args: { label: '期限', locale: 'ja-JP', today: '2026-12-31' },
} satisfies Meta<typeof DatePicker>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Selected: Story = { args: { defaultValue: '2026-09-18' } };
export const Presets: Story = {
  args: { presets: [
    { label: '今日', value: '2026-12-31' },
    { label: '明日', value: '2027-01-01' },
    { label: '来月末', value: '2027-01-31' },
  ] },
};
export const Open: Story = { ...Presets, play: async ({ canvasElement }) => { canvasElement.querySelector('button')?.click(); } };
export const Range: Story = {
  args: { today: '2026-09-16', min: '2026-09-10', max: '2026-09-20',
    isDateDisabled: (date: string) => date === '2026-09-18',
    presets: [
      { label: '最小日', value: '2026-09-10' }, { label: '最大日', value: '2026-09-20' },
      { label: '範囲外', value: '2026-09-21' }, { label: '選択不可', value: '2026-09-18' },
      { label: '無効な候補', value: '2026-09-16', disabled: true }, { label: '不正な日付', value: '2026-02-30' },
    ] },
};
export const Disabled: Story = { args: { disabled: true, defaultValue: '2026-09-18' } };
export const InvalidValue: Story = { args: { value: '2026-02-30', today: 'not-a-date' } };
export const English: Story = {
  args: { label: 'Due date', locale: 'en-US', placeholder: 'No date', clearLabel: 'Clear', cancelLabel: 'Cancel',
    previousMonthLabel: 'Previous month', nextMonthLabel: 'Next month', formatValue: (value: string) => value },
};
export const BottomEdge: Story = {
  ...Presets,
  render: args => ({ components: { DatePicker }, setup: () => ({ args }),
    template: '<div style="position: fixed; right: 16px; bottom: 16px; overflow: hidden"><DatePicker v-bind="args" /></div>' }),
};
export const Controlled: Story = {
  render: args => ({
    components: { Button, DatePicker },
    setup() {
      const date = ref('2026-09-18');
      const changes = ref(0);
      const change = (value: string) => { date.value = value; changes.value++; };
      return { args, date, changes, change };
    },
    template: `<div>
      <Button label="前の操作" variant="ghost" />
      <DatePicker v-bind="args" :value="date" :on-value-change="change" />
      <Button label="外側の操作" variant="ghost" @click="date = '2027-01-01'" />
      <output>選択: {{ date || 'なし' }} / 通知: {{ changes }}</output>
    </div>`,
  }),
};
export const InField: Story = {
  render: args => ({ components: { DatePicker, Field }, setup: () => ({ args }),
    template: `<Field id="due" label="期限" description="完了予定の日付" required error="日付を確認してください">
      <DatePicker v-bind="args" default-value="2026-09-18" />
    </Field>` }),
};
export const InDialog: Story = {
  render: args => ({ components: { DatePicker, Dialog }, setup: () => ({ args }),
    template: '<Dialog open title="タスクの編集"><DatePicker v-bind="args" /></Dialog>' }),
};
