import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Field, Switch } from './index';

const meta = {
  title: 'Components/Switch',
  component: Switch,
  parameters: { layout: 'padded' },
  args: { label: 'メール通知' },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

/* 既定は非制御。押した瞬間に見た目が変わる。 */
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true, defaultChecked: true } };

function ControlledExample() {
  const [checked, setChecked] = useState(false);
  return (
    <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
      <Switch label="メール通知" checked={checked} onCheckedChange={setChecked} />
      <output>{checked ? '有効' : '無効'}</output>
      <button type="button" onClick={() => setChecked(!checked)}>外側から切り替え</button>
    </div>
  );
}

export const Controlled: Story = { render: () => <ControlledExample /> };

/* Field のラベルを見える名前にするため hideLabel を付け、label には同じ文言を渡す。 */
export const InField: Story = {
  render: () => (
    <Field id="switch-notifications" label="メール通知" description="変更するとすぐに反映されます。">
      <Switch label="メール通知" hideLabel defaultChecked />
    </Field>
  ),
};

/* 連打しても通知の数と最終状態がずれないことを確かめる。 */
function RapidToggleExample() {
  const [checked, setChecked] = useState(false);
  const [count, setCount] = useState(0);
  return (
    <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
      <Switch label="メール通知" checked={checked}
        onCheckedChange={next => { setChecked(next); setCount(value => value + 1); }} />
      <output>{count}</output>
      <button type="button" onClick={() => {
        for (let i = 0; i < 10; i++) setChecked(value => !value);
        setCount(value => value + 10);
      }}>10 回切り替える</button>
    </div>
  );
}

export const RapidToggle: Story = { render: () => <RapidToggleExample /> };
