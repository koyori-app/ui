import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Field, PasswordInput } from './index';

const meta = {
  title: 'Components/PasswordInput',
  component: PasswordInput,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof PasswordInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/* Field の id・ラベル・説明を入力欄が受け取る。Tab は 入力欄 → 表示切り替えの順。 */
function InFieldExample() {
  const [value, setValue] = useState('');
  return (
    <div style={{ width: 360 }}>
      <Field id="password-in-field" label="パスワード" description="8 文字以上で入力してください。">
        <PasswordInput autocomplete="current-password" value={value} onValueChange={setValue} />
      </Field>
    </div>
  );
}

export const InField: Story = { render: () => <InFieldExample /> };

function WithErrorExample() {
  const [value, setValue] = useState('abc');
  return (
    <div style={{ width: 360 }}>
      <Field id="password-with-error" label="パスワード" error="8 文字以上で入力してください。" required>
        <PasswordInput autocomplete="current-password" value={value} onValueChange={setValue} />
      </Field>
    </div>
  );
}

export const WithError: Story = { render: () => <WithErrorExample /> };

/* 親が表示状態を持つ。外側のボタンからも切り替えられる。 */
function ControlledExample() {
  const [value, setValue] = useState('correct horse');
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ display: 'grid', gap: 12, justifyItems: 'start', width: 360 }}>
      <div style={{ width: '100%' }}>
        <Field id="password-controlled" label="パスワード">
          <PasswordInput autocomplete="current-password" value={value} onValueChange={setValue}
            visible={visible} onVisibleChange={setVisible} />
        </Field>
      </div>
      <output>{visible ? '表示中' : '非表示'}</output>
      <button type="button" onClick={() => setVisible(!visible)}>外側から切り替え</button>
    </div>
  );
}

export const Controlled: Story = { render: () => <ControlledExample /> };

export const Disabled: Story = {
  render: () => (
    <div style={{ width: 360 }}>
      <Field id="password-disabled" label="パスワード">
        <PasswordInput value="secret-value" disabled />
      </Field>
    </div>
  ),
};

/* Field の外では ariaLabel で名前を付ける。 */
function StandaloneExample() {
  const [value, setValue] = useState('');
  return (
    <div style={{ width: 360 }}>
      <PasswordInput ariaLabel="共有リンクのパスワード" value={value} onValueChange={setValue} />
    </div>
  );
}

export const Standalone: Story = { render: () => <StandaloneExample /> };

/* 登録・変更では new-password を渡し、パスワード管理ツールに新しい値を提案させる。 */
function NewPasswordExample() {
  const [value, setValue] = useState('');
  return (
    <div style={{ width: 360 }}>
      <Field id="password-new" label="新しいパスワード" description="12 文字以上を推奨します。">
        <PasswordInput autocomplete="new-password" value={value} onValueChange={setValue} />
      </Field>
    </div>
  );
}

export const NewPassword: Story = { render: () => <NewPasswordExample /> };
