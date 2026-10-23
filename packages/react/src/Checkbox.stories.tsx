import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Checkbox, type CheckboxProps } from './index';

function Example(args: CheckboxProps) {
  const [changes, setChanges] = useState(0);
  return <div><Checkbox {...args} onCheckedChange={() => setChanges(count => count + 1)} /><output aria-label="変更回数">{changes}</output></div>;
}
function ControlledExample(args: CheckboxProps) {
  const [checked, setChecked] = useState(args.checked ?? false);
  return <div><Checkbox {...args} checked={checked} onCheckedChange={setChecked} />
    <button type="button" onClick={() => setChecked(value => !value)}>外側から切り替え</button>
    <output>{checked ? '完了' : '未完了'}</output></div>;
}
const meta = {
  title: 'Components/Checkbox', component: Checkbox,
  args: { label: 'タスクを完了' }, render: args => <Example {...args} />,
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Checked: Story = { args: { checked: true }, render: args => <ControlledExample {...args} /> };
export const Controlled: Story = { render: args => <ControlledExample {...args} /> };
export const Rejected: Story = { args: { checked: false } };
export const IndeterminateRejected: Story = { args: { checked: false, indeterminate: true } };
export const Disabled: Story = { args: { disabled: true } };
export const DisabledChecked: Story = { args: { checked: true, disabled: true } };
export const WithoutLabel: Story = { render: () => <Checkbox label="TASK-140 を選択" hideLabel /> };
export const LongLabel: Story = { args: { label: 'このタスクに関連するすべての確認事項と受け入れ条件を確認しました' }, render: args => <div style={{ width: 220 }}><Checkbox {...args} /></div> };
// 全選択のチェックは、子の状態から checked と indeterminate を導く。
function IndeterminateExample() {
  const [items, setItems] = useState([{ label: '設計', checked: true }, { label: '実装', checked: false }, { label: 'テスト', checked: false }]);
  const all = items.every(item => item.checked);
  return <div><Checkbox label="すべて選択" checked={all} indeterminate={!all && items.some(item => item.checked)}
    onCheckedChange={checked => setItems(items.map(item => ({ ...item, checked })))} />
    <div style={{ display: 'grid', paddingInlineStart: 28 }}>{items.map(item => <Checkbox key={item.label} label={item.label} checked={item.checked}
      onCheckedChange={checked => setItems(items.map(other => other === item ? { ...other, checked } : other))} />)}</div></div>;
}
export const Indeterminate: Story = { render: () => <IndeterminateExample /> };
function FormExample() {
  const [result, setResult] = useState('未送信');
  return <form onSubmit={event => { event.preventDefault(); setResult(JSON.stringify([...new FormData(event.currentTarget)])); }}>
    <Checkbox label="通知を受け取る" name="notifications" value="enabled" required />
    <Checkbox label="変更できない設定" name="disabled" checked disabled />
    <button type="submit">送信</button><button type="reset">リセット</button><output>{result}</output>
  </form>;
}
export const Form: Story = { render: () => <FormExample /> };
