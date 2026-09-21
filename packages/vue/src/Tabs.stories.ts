import { ref } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { Tabs, TabPanel, type TabsProps } from './index';

const items = [
  { value: 'list', label: 'リスト' },
  { value: 'locked', label: '準備中', disabled: true },
  { value: 'board', label: 'ボード' },
  { value: 'calendar', label: 'カレンダー' },
];
const example = (args: TabsProps, reject = false, focusableFirst = false) => ({
  components: { Tabs, TabPanel },
  setup() {
    const value = ref(args.value);
    const requests = ref<string[]>([]);
    return { args, value, requests, focusableFirst,
      select(next: string) { requests.value.push(next); if (!reject) value.value = next; } };
  },
  template: `<div style="max-width: 600px">
    <Tabs v-bind="args" :value="value" :on-value-change="select">
      <TabPanel value="list" :tab-index="focusableFirst ? -1 : 0"><p v-if="!focusableFirst">リストの内容</p><input aria-label="リストのメモ" value="保持する下書き" /></TabPanel>
      <TabPanel value="locked"><p>準備中の内容</p></TabPanel>
      <TabPanel value="board"><p>ボードの内容</p><input aria-label="ボードのメモ" /></TabPanel>
      <TabPanel value="calendar"><p>カレンダーの内容</p></TabPanel>
    </Tabs>
    <button @click="value = 'board'">外からボードを選択</button>
    <button @click="value = 'list'">外からリストを選択</button>
    <p>選択要求: <output>{{ JSON.stringify(requests) }}</output></p>
  </div>`,
});
const meta = {
  title: 'Components/Tabs', component: Tabs, parameters: { layout: 'padded' },
  args: { id: 'task-views', label: '表示形式', items, value: 'list' },
  render: args => example(args),
} satisfies Meta<typeof Tabs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ExternalSelection: Story = { args: { value: 'board' } };
export const Rejected: Story = { render: args => example(args, true) };
export const UnknownValue: Story = { args: { value: 'missing' } };
export const DisabledValue: Story = { args: { value: 'locked' } };
export const Empty: Story = { args: { items: [] } };
export const AllDisabled: Story = { args: { items: items.map(item => ({ ...item, disabled: true })) } };
export const Single: Story = { args: { items: items.slice(0, 1) } };
export const FocusableFirst: Story = { render: args => example(args, false, true) };
export const Narrow: Story = {
  args: { items: items.map((item, index) => ({ ...item, label: ['List view', 'Unavailable', 'Board view', 'Calendar view'][index] })) },
  render: args => ({ components: { Example: example(args) }, template: '<div style="width: 220px"><Example /></div>' }),
};
export const RightToLeft: Story = { render: args => ({ components: { Example: example(args) }, template: '<div dir="rtl"><Example /></div>' }) };
export const Multiple: Story = { render: args => ({ components: { First: example(args), Second: example({ ...args, id: 'other-views' }) }, template: '<First /><Second />' }) };
