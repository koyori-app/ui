import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Spinner } from './index';

const meta = {
  title: 'Components/Spinner',
  component: Spinner,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
/* 文字は見た目だけ隠れ、読み上げ名は「読み込み中」のまま。 */
export const HiddenLabel: Story = { args: { hideLabel: true } };

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <Spinner size={16} />
      <Spinner size={24} />
      <Spinner size={32} />
    </div>
  ),
};

/* icon は aria-hidden なので Spinner の status は読まれない。状態はボタンのラベルで伝える。 */
export const InButton: Story = {
  render: () => <Button label="保存中" disabled icon={<Spinner hideLabel />} />,
};

/* 領域全体の読み込み中は親に aria-busy を付け、中央に Spinner を置く。 */
export const Centered: Story = {
  render: () => (
    <div className="koyori-card" aria-busy="true" style={{ display: 'grid', placeItems: 'center', width: 360, minHeight: 160 }}>
      <Spinner label="コメントを読み込み中" />
    </div>
  ),
};
