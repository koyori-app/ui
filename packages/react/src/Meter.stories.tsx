import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Field, Meter, PasswordInput } from './index';

const meta = {
  title: 'Components/Meter',
  component: Meter,
  parameters: { layout: 'padded' },
  args: { label: 'パスワードの強度', value: 1, valueText: '弱い' },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 3, step: 1 } },
    tone: { control: 'radio', options: ['auto', 'neutral', 'danger', 'warning', 'success'] },
  },
  render: args => <div style={{ width: 320 }}><Meter {...args} /></div>,
} satisfies Meta<typeof Meter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/* auto は満たした割合で色が変わる。0 段は neutral。 */
export const Tones: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16, width: 320 }}>
      <Meter label="0 段（auto）" value={0} valueText="未入力" />
      <Meter label="1 段（auto）" value={1} valueText="弱い" />
      <Meter label="2 段（auto）" value={2} valueText="普通" />
      <Meter label="3 段（auto）" value={3} valueText="強い" />
      <Meter label="2 段（neutral）" value={2} tone="neutral" valueText="2 / 3" />
    </div>
  ),
};

/* 残量は「多いほど良い」と限らないため、色の意味を明示する。 */
export const FiveSegments: Story = {
  args: { label: '今月の残り枠', value: 4, max: 5, valueText: '残り 4 / 5', tone: 'success' },
  argTypes: { value: { control: { type: 'range', min: 0, max: 5, step: 1 } } },
};

const hidden = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' } as const;

/* 長さだけの簡易判定。段が変わった時だけ status の文が変わるので、打鍵ごとには読み上げない。 */
function PasswordStrengthExample() {
  const [password, setPassword] = useState('');
  const level = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const text = ['未入力', '弱い', '普通', '強い'][level];
  return (
    <div style={{ display: 'grid', gap: 8, width: 320 }}>
      <Field id="meter-password" label="新しいパスワード" description="12 文字以上で「強い」になります。">
        <PasswordInput autocomplete="new-password" value={password} onValueChange={setPassword} />
      </Field>
      <Meter label="パスワードの強度" value={level} valueText={text} />
      <p role="status" style={hidden}>{level ? `パスワードの強度: ${text}` : ''}</p>
    </div>
  );
}

export const PasswordStrength: Story = { render: () => <PasswordStrengthExample /> };
