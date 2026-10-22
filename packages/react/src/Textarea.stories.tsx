import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Field, Textarea } from './index';

const meta = {
  title: 'Components/Textarea',
  component: Textarea,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Textarea>;
export default meta;
type Story = StoryObj<typeof meta>;

/* フォーカスが外れるたびに 1 回通知する。 */
function BlurExample() {
  const [blurs, setBlurs] = useState(0);
  return (
    <div style={{ maxWidth: 360, display: 'grid', gap: 16 }}>
      <Field id="note" label="メモ"><Textarea onBlur={() => setBlurs((count) => count + 1)} /></Field>
      <button type="button">次の操作</button>
      <p>blur 通知: <output data-testid="blurs">{blurs}</output></p>
    </div>
  );
}

export const Blur: Story = { render: () => <BlurExample /> };
