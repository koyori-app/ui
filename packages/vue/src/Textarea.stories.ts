import { ref } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { Field, Textarea } from './index';

const meta = {
  title: 'Components/Textarea',
  component: Textarea,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Textarea>;
export default meta;
type Story = StoryObj<typeof meta>;

/* フォーカスが外れるたびに 1 回通知する。 */
export const Blur: Story = {
  render: () => ({
    components: { Field, Textarea },
    setup: () => ({ blurs: ref(0) }),
    template: `
      <div style="max-width: 360px; display: grid; gap: 16px">
        <Field id="note" label="メモ"><Textarea @blur="blurs++" /></Field>
        <button type="button">次の操作</button>
        <p>blur 通知: <output data-testid="blurs">{{ blurs }}</output></p>
      </div>`,
  }),
};
