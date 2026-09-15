import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import { Checkbox, type CheckboxProps } from './index';

const controlled = (args: CheckboxProps) => ({
  components: { Checkbox }, setup: () => ({ args, checked: ref(args.checked ?? false) }),
  template: `<div><Checkbox v-bind="args" :checked="checked" :on-checked-change="value => checked = value" />
    <button type="button" @click="checked = !checked">外側から切り替え</button><output>{{ checked ? '完了' : '未完了' }}</output></div>`,
});
const meta = {
  title: 'Components/Checkbox', component: Checkbox,
  args: { label: 'タスクを完了' },
  render: args => ({ components: { Checkbox }, setup: () => ({ args, changes: ref(0) }), template: '<div><Checkbox v-bind="args" :on-checked-change="() => changes++" /><output aria-label="変更回数">{{ changes }}</output></div>' }),
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Checked: Story = { args: { checked: true }, render: controlled };
export const Controlled: Story = { render: controlled };
export const Rejected: Story = { args: { checked: false } };
export const Disabled: Story = { args: { disabled: true } };
export const DisabledChecked: Story = { args: { checked: true, disabled: true } };
export const WithoutLabel: Story = { render: () => ({ components: { Checkbox }, template: '<Checkbox label="TASK-140 を選択" hide-label />' }) };
export const LongLabel: Story = { args: { label: 'このタスクに関連するすべての確認事項と受け入れ条件を確認しました' }, render: args => ({ components: { Checkbox }, setup: () => ({ args }), template: '<div style="width: 220px"><Checkbox v-bind="args" /></div>' }) };
export const Form: Story = { render: () => ({
  components: { Checkbox }, setup() {
    const result = ref('未送信');
    return { result, submit(event: Event) { result.value = JSON.stringify([...new FormData(event.currentTarget as HTMLFormElement)]); } };
  },
  template: `<form @submit.prevent="submit"><Checkbox label="通知を受け取る" name="notifications" value="enabled" required />
    <Checkbox label="変更できない設定" name="disabled" checked disabled />
    <button type="submit">送信</button><button type="reset">リセット</button><output>{{ result }}</output></form>`,
}) };
