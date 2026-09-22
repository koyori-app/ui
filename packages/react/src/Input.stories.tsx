import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, EyeIcon, EyeOffIcon, Field, Input, type InputProps } from './index';

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

/* ここから先頭・末尾の要素。枠は外側の group が 1 つだけ描く。 */
function AffixExample(args: InputProps & { label: string; error?: string }) {
  const [draft, setDraft] = useState(args.value ?? '');
  return (
    <div style={{ maxWidth: 360, display: 'grid', gap: 16 }}>
      <Field id="affix-input" label={args.label} error={args.error}>
        <Input {...args} value={draft} onValueChange={setDraft} />
      </Field>
      <button type="button">次の操作</button>
    </div>
  );
}

export const WithPrefix: Story = {
  render: () => <AffixExample label="金額" type="number" min={0} value="1200" prefix="¥" />,
};

export const WithSuffix: Story = {
  render: () => <AffixExample label="在庫" type="number" min={0} value="12" suffix="件" />,
};

export const AffixInvalid: Story = {
  render: () => <AffixExample label="金額" type="number" min={0} value="-1" prefix="¥" error="0 以上の金額を入力してください。" />,
};

export const AffixDisabled: Story = {
  render: () => <AffixExample label="金額" type="number" value="1200" prefix="¥" suffix="円" disabled />,
};

/* 表示の切り替えで値とカーソル位置を保つ。ボタンの状態は aria-pressed で伝える。 */
function PasswordToggleExample() {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState('p@ssw0rd');
  const toggle = () => {
    const input = document.getElementById('password-input') as HTMLInputElement | null;
    const start = input?.selectionStart ?? null;
    const end = input?.selectionEnd ?? null;
    setVisible(!visible);
    // type を変えると選択が失われるため、描画後に戻す。
    requestAnimationFrame(() => {
      if (!input || start === null || end === null) return;
      input.focus();
      input.setSelectionRange(start, end);
    });
  };
  return (
    <div style={{ maxWidth: 360, display: 'grid', gap: 16 }}>
      <Field id="password-input" label="パスワード">
        <Input type={visible ? 'text' : 'password'} value={value} autocomplete="current-password"
          onValueChange={setValue}
          suffix={<Button variant="ghost" ariaLabel="パスワードを表示" ariaPressed={visible ? 'true' : 'false'}
            icon={visible ? <EyeOffIcon /> : <EyeIcon />} onClick={toggle} />} />
      </Field>
      <button type="button">次の操作</button>
      <p>値: <output data-testid="password">{value}</output></p>
    </div>
  );
}

export const PasswordToggle: Story = { render: () => <PasswordToggleExample /> };
