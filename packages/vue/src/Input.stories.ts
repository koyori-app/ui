import { ref } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { Field, Input, type InputProps } from './index';

const example = (args: InputProps, required = false) => ({
  components: { Field, Input },
  setup() {
    const draft = ref(args.value ?? '');
    const changes = ref<string[]>([]);
    const commits = ref<(number | null)[]>([]);
    const error = ref('');
    return {
      args, required, draft, changes, commits, error,
      change(value: string) { draft.value = value; changes.value.push(value); error.value = ''; },
      commit(value: number | null) { commits.value.push(value); error.value = ''; args.onNumberCommit?.(value); },
      invalid(message: string) { error.value = message; },
    };
  },
  template: `
    <div style="max-width: 360px; display: grid; gap: 16px">
      <Field id="number-input" label="数値" description="Enter またはフォーカスを外すと確定します。" :required="required" :error="error">
        <Input v-bind="args" :value="draft" :on-value-change="change" :on-number-commit="commit" :on-number-invalid="invalid" />
      </Field>
      <button @click="draft = '0'">0に戻す</button>
      <input id="next-input" aria-label="次の入力" />
      <p>入力通知: <output data-testid="changes">{{ JSON.stringify(changes) }}</output></p>
      <p>確定通知: <output data-testid="commits">{{ JSON.stringify(commits) }}</output></p>
    </div>`,
});

const meta = {
  title: 'Components/Input',
  component: Input,
  parameters: { layout: 'padded' },
  args: { type: 'number', min: 0, max: 100, step: 1 },
  render: (args) => example(args),
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Progress: Story = {};
export const CommitAndBlur: Story = { args: { value: '5', onNumberCommit: () => document.getElementById('number-input')?.blur() } };
export const CommitAndFocusNext: Story = { args: { value: '5', onNumberCommit: () => document.getElementById('next-input')?.focus() } };
export const Decimal: Story = { args: { min: -2, max: 2, step: 0.25 } };
export const AnyStep: Story = { args: { min: undefined, max: undefined, step: 'any' } };
export const DefaultStep: Story = { args: { min: undefined, max: undefined, step: undefined } };
export const Required: Story = { render: (args) => example(args, true) };
export const Disabled: Story = { args: { value: '0', disabled: true } };
export const ReadOnly: Story = { args: { value: '25', readOnly: true } };
export const OutOfRange: Story = { args: { value: '101' } };
export const Text: Story = { args: { type: 'text' } };
