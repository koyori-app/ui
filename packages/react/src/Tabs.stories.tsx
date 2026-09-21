import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tabs, TabPanel, type TabsProps } from './index';

const items = [
  { value: 'list', label: 'リスト' },
  { value: 'locked', label: '準備中', disabled: true },
  { value: 'board', label: 'ボード' },
  { value: 'calendar', label: 'カレンダー' },
];
function Example({ args, reject = false, focusableFirst = false }: { args: TabsProps; reject?: boolean; focusableFirst?: boolean }) {
  const [value, setValue] = useState(args.value);
  const [requests, setRequests] = useState<string[]>([]);
  return <div style={{ maxWidth: 600 }}>
    <Tabs {...args} value={value} onValueChange={(next) => { setRequests(current => [...current, next]); if (!reject) setValue(next); }}>
      <TabPanel value="list" tabIndex={focusableFirst ? -1 : 0}>
        {!focusableFirst && <p>リストの内容</p>}
        <input aria-label="リストのメモ" defaultValue="保持する下書き" />
      </TabPanel>
      <TabPanel value="locked"><p>準備中の内容</p></TabPanel>
      <TabPanel value="board"><p>ボードの内容</p><input aria-label="ボードのメモ" /></TabPanel>
      <TabPanel value="calendar"><p>カレンダーの内容</p></TabPanel>
    </Tabs>
    <button onClick={() => setValue('board')}>外からボードを選択</button>
    <button onClick={() => setValue('list')}>外からリストを選択</button>
    <p>選択要求: <output>{JSON.stringify(requests)}</output></p>
  </div>;
}
const meta = {
  title: 'Components/Tabs', component: Tabs, parameters: { layout: 'padded' },
  args: { id: 'task-views', label: '表示形式', items, value: 'list' },
  render: args => <Example args={args} />,
} satisfies Meta<typeof Tabs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ExternalSelection: Story = { args: { value: 'board' } };
export const Rejected: Story = { render: args => <Example args={args} reject /> };
export const UnknownValue: Story = { args: { value: 'missing' } };
export const DisabledValue: Story = { args: { value: 'locked' } };
export const Empty: Story = { args: { items: [] } };
export const AllDisabled: Story = { args: { items: items.map(item => ({ ...item, disabled: true })) } };
export const Single: Story = { args: { items: items.slice(0, 1) } };
export const FocusableFirst: Story = { render: args => <Example args={args} focusableFirst /> };
export const Narrow: Story = {
  args: { items: items.map((item, index) => ({ ...item, label: ['List view', 'Unavailable', 'Board view', 'Calendar view'][index] })) },
  render: args => <div style={{ width: 220 }}><Example args={args} /></div>,
};
export const RightToLeft: Story = { render: args => <div dir="rtl"><Example args={args} /></div> };
export const Multiple: Story = { render: args => <><Example args={args} /><Example args={{ ...args, id: 'other-views' }} /></> };
