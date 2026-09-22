import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import { Field, Switch } from './index';

const meta = {
  title: 'Components/Switch',
  component: Switch,
  parameters: { layout: 'padded' },
  args: { label: 'メール通知' },
  render: args => ({ components: { Switch }, setup: () => ({ args }), template: '<Switch v-bind="args" />' }),
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

/* 既定は非制御。押した瞬間に見た目が変わる。 */
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true, defaultChecked: true } };

export const Controlled: Story = {
  render: () => ({
    components: { Switch },
    setup: () => ({ checked: ref(false) }),
    template: `<div style="display: grid; gap: 12px; justify-items: start">
      <Switch label="メール通知" :checked="checked" :on-checked-change="(next) => (checked = next)" />
      <output>{{ checked ? '有効' : '無効' }}</output>
      <button type="button" @click="checked = !checked">外側から切り替え</button>
    </div>`,
  }),
};

/* Field のラベルを見える名前にするため hideLabel を付け、label には同じ文言を渡す。 */
export const InField: Story = {
  render: () => ({
    components: { Field, Switch },
    template: `<Field id="switch-notifications" label="メール通知" description="変更するとすぐに反映されます。">
      <Switch label="メール通知" hide-label default-checked />
    </Field>`,
  }),
};

/* 連打しても通知の数と最終状態がずれないことを確かめる。 */
export const RapidToggle: Story = {
  render: () => ({
    components: { Switch },
    setup() {
      const checked = ref(false);
      const count = ref(0);
      const change = (next: boolean) => { checked.value = next; count.value += 1; };
      const burst = () => {
        for (let i = 0; i < 10; i++) checked.value = !checked.value;
        count.value += 10;
      };
      return { checked, count, change, burst };
    },
    template: `<div style="display: grid; gap: 12px; justify-items: start">
      <Switch label="メール通知" :checked="checked" :on-checked-change="change" />
      <output>{{ count }}</output>
      <button type="button" @click="burst">10 回切り替える</button>
    </div>`,
  }),
};
