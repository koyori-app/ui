import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Checkbox, ProgressBar } from './index';

const meta = {
  title: 'Components/ProgressBar',
  component: ProgressBar,
  parameters: { layout: 'padded' },
  args: { label: 'チェックリストの達成率', value: 60 },
  render: (args) => <div style={{ width: 320 }}><ProgressBar {...args} /></div>,
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Zero: Story = { args: { value: 0 } };
export const Complete: Story = { args: { value: 100 } };
export const WithValueText: Story = { args: { value: 3, max: 5, valueText: '3 / 5 件' } };
export const HiddenLabel: Story = { args: { hideLabel: true } };
export const NoValue: Story = { args: { hideValue: true } };

/* 最初の用途。チェックした数がそのまま達成率になる。 */
const items = ['要件を書く', 'デザインを決める', '実装する', 'レビューを受ける', '公開する'];

function ChecklistExample() {
  const [done, setDone] = useState<string[]>([items[0]]);
  return (
    <div style={{ display: 'grid', gap: 12, width: 320 }}>
      <ProgressBar label="チェックリストの達成率" value={done.length} max={items.length}
        valueText={`${done.length} / ${items.length} 件`} />
      {items.map((item) => (
        <Checkbox key={item} label={item} checked={done.includes(item)}
          onCheckedChange={(checked) => setDone(checked ? [...done, item] : done.filter((name) => name !== item))} />
      ))}
    </div>
  );
}

export const Checklist: Story = { render: () => <ChecklistExample /> };
