import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, ref } from 'vue';
import { Field, Input, Meter } from './index';

const meta = {
  title: 'Components/Meter',
  component: Meter,
  parameters: { layout: 'padded' },
  args: { label: 'パスワードの強度', value: 1, valueText: '弱い' },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 3, step: 1 } },
    tone: { control: 'radio', options: ['auto', 'neutral', 'danger', 'warning', 'success'] },
  },
  render: args => ({
    components: { Meter },
    setup: () => ({ args }),
    template: '<div style="width: 320px"><Meter v-bind="args" /></div>',
  }),
} satisfies Meta<typeof Meter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/* auto は満たした割合で色が変わる。0 段は neutral。 */
export const Tones: Story = {
  render: () => ({
    components: { Meter },
    template: `<div style="display: grid; gap: 16px; width: 320px">
      <Meter label="0 段（auto）" :value="0" value-text="未入力" />
      <Meter label="1 段（auto）" :value="1" value-text="弱い" />
      <Meter label="2 段（auto）" :value="2" value-text="普通" />
      <Meter label="3 段（auto）" :value="3" value-text="強い" />
      <Meter label="2 段（neutral）" :value="2" tone="neutral" value-text="2 / 3" />
    </div>`,
  }),
};

/* 残量は「多いほど良い」と限らないため、色の意味を明示する。 */
export const FiveSegments: Story = {
  args: { label: '今月の残り枠', value: 4, max: 5, valueText: '残り 4 / 5', tone: 'success' },
  argTypes: { value: { control: { type: 'range', min: 0, max: 5, step: 1 } } },
};

/* 長さだけの簡易判定。段が変わった時だけ status の文が変わるので、打鍵ごとには読み上げない。 */
export const PasswordStrength: Story = {
  render: () => ({
    components: { Field, Input, Meter },
    setup() {
      const password = ref('');
      const level = computed(() => (password.value.length === 0 ? 0 : password.value.length < 8 ? 1 : password.value.length < 12 ? 2 : 3));
      const text = computed(() => ['未入力', '弱い', '普通', '強い'][level.value]);
      return { password, level, text };
    },
    template: `<div style="display: grid; gap: 8px; width: 320px">
      <Field id="meter-password" label="新しいパスワード" description="12 文字以上で「強い」になります。">
        <Input type="password" autocomplete="new-password" :value="password" :on-value-change="(next) => (password = next)" />
      </Field>
      <Meter label="パスワードの強度" :value="level" :value-text="text" />
      <p role="status" style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap">{{ level ? \`パスワードの強度: \${text}\` : '' }}</p>
    </div>`,
  }),
};
