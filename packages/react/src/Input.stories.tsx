import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Field, Input, type InputProps } from './index';

function Example(args: InputProps & { required?: boolean }) {
  const [draft, setDraft] = useState(args.value ?? '');
  const [changes, setChanges] = useState<string[]>([]);
  const [commits, setCommits] = useState<(number | null)[]>([]);
  const [error, setError] = useState('');
  return (
    <div style={{ maxWidth: 360, display: 'grid', gap: 16 }}>
      <Field id="number-input" label="数値" description="Enter またはフォーカスを外すと確定します。" required={args.required} error={error}>
        <Input {...args} value={draft}
          onValueChange={(value) => { setDraft(value); setChanges((values) => [...values, value]); setError(''); }}
          onNumberCommit={(value) => { setCommits((values) => [...values, value]); setError(''); args.onNumberCommit?.(value); }}
          onNumberInvalid={setError} />
      </Field>
      <button onClick={() => setDraft('0')}>0に戻す</button>
      <input id="next-input" aria-label="次の入力" />
      <p>入力通知: <output data-testid="changes">{JSON.stringify(changes)}</output></p>
      <p>確定通知: <output data-testid="commits">{JSON.stringify(commits)}</output></p>
    </div>
  );
}

const meta = {
  title: 'Components/Input',
  component: Input,
  parameters: { layout: 'padded' },
  args: { type: 'number', min: 0, max: 100, step: 1 },
  render: (args) => <Example {...args} />,
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Progress: Story = {};
export const CommitAndBlur: Story = { args: { value: '5', onNumberCommit: () => document.getElementById('number-input')?.blur() } };
export const CommitAndFocusNext: Story = { args: { value: '5', onNumberCommit: () => document.getElementById('next-input')?.focus() } };
export const Decimal: Story = { args: { min: -2, max: 2, step: 0.25 } };
export const AnyStep: Story = { args: { min: undefined, max: undefined, step: 'any' } };
export const DefaultStep: Story = { args: { min: undefined, max: undefined, step: undefined } };
export const Required: Story = { render: (args) => <Example {...args} required /> };
export const Disabled: Story = { args: { value: '0', disabled: true } };
export const ReadOnly: Story = { args: { value: '25', readOnly: true } };
export const OutOfRange: Story = { args: { value: '101' } };
export const Text: Story = { args: { type: 'text' } };
