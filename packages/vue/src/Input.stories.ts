import { ref } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { Button, EyeIcon, EyeOffIcon, Field, Input, type InputProps } from './index';

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

/* ここから先頭・末尾の要素。枠は外側の group が 1 つだけ描く。 */
const affixExample = (label: string, args: InputProps, slots = '', error = '') => ({
  components: { Field, Input },
  setup() {
    const draft = ref(args.value ?? '');
    return { args, label, error, draft, change: (value: string) => { draft.value = value; } };
  },
  template: `
    <div style="max-width: 360px; display: grid; gap: 16px">
      <Field id="affix-input" :label="label" :error="error">
        <Input v-bind="args" :value="draft" :on-value-change="change">${slots}</Input>
      </Field>
      <button type="button">次の操作</button>
    </div>`,
});

export const WithPrefix: Story = {
  render: () => affixExample('金額', { type: 'number', min: 0, value: '1200' }, '<template #prefix>¥</template>'),
};

export const WithSuffix: Story = {
  render: () => affixExample('在庫', { type: 'number', min: 0, value: '12' }, '<template #suffix>件</template>'),
};

export const AffixInvalid: Story = {
  render: () => affixExample('金額', { type: 'number', min: 0, value: '-1' }, '<template #prefix>¥</template>', '0 以上の金額を入力してください。'),
};

export const AffixDisabled: Story = {
  render: () => affixExample('金額', { type: 'number', value: '1200', disabled: true }, '<template #prefix>¥</template><template #suffix>円</template>'),
};

/* 表示の切り替えで値とカーソル位置を保つ。ボタンの状態は aria-pressed で伝える。 */
export const PasswordToggle: Story = {
  render: () => ({
    components: { Button, EyeIcon, EyeOffIcon, Field, Input },
    setup() {
      const visible = ref(false);
      const value = ref('p@ssw0rd');
      const toggle = () => {
        const input = document.getElementById('password-input') as HTMLInputElement | null;
        const start = input?.selectionStart ?? null;
        const end = input?.selectionEnd ?? null;
        visible.value = !visible.value;
        // type を変えると選択が失われるため、描画後に戻す。
        requestAnimationFrame(() => {
          if (!input || start === null || end === null) return;
          input.focus();
          input.setSelectionRange(start, end);
        });
      };
      return { visible, value, toggle, change: (next: string) => { value.value = next; } };
    },
    template: `
      <div style="max-width: 360px; display: grid; gap: 16px">
        <Field id="password-input" label="パスワード">
          <Input :type="visible ? 'text' : 'password'" :value="value" autocomplete="current-password" :on-value-change="change">
            <template #suffix>
              <Button variant="ghost" ariaLabel="パスワードを表示" :ariaPressed="visible ? 'true' : 'false'" :on-click="toggle">
                <template #icon><EyeOffIcon v-if="visible" /><EyeIcon v-else /></template>
              </Button>
            </template>
          </Input>
        </Field>
        <button type="button">次の操作</button>
        <p>値: <output data-testid="password">{{ value }}</output></p>
      </div>`,
  }),
};
