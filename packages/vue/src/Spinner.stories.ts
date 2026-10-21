import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { Button, Spinner } from './index';

const meta = {
  title: 'Components/Spinner',
  component: Spinner,
  parameters: { layout: 'padded' },
  render: args => ({ components: { Spinner }, setup: () => ({ args }), template: '<Spinner v-bind="args" />' }),
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
/* 文字は見た目だけ隠れ、読み上げ名は「読み込み中」のまま。 */
export const HiddenLabel: Story = { args: { hideLabel: true } };

export const Sizes: Story = {
  render: () => ({
    components: { Spinner },
    template: `<div style="display: flex; gap: 24px; align-items: center">
      <Spinner :size="16" />
      <Spinner :size="24" />
      <Spinner :size="32" />
    </div>`,
  }),
};

/* icon スロットは aria-hidden なので Spinner の status は読まれない。状態はボタンのラベルで伝える。 */
export const InButton: Story = {
  render: () => ({
    components: { Button, Spinner },
    template: `<Button label="保存中" disabled><template #icon><Spinner hide-label /></template></Button>`,
  }),
};

/* 領域全体の読み込み中は親に aria-busy を付け、中央に Spinner を置く。 */
export const Centered: Story = {
  render: () => ({
    components: { Spinner },
    template: `<div class="koyori-card" aria-busy="true" style="display: grid; place-items: center; width: 360px; min-height: 160px">
      <Spinner label="コメントを読み込み中" />
    </div>`,
  }),
};
