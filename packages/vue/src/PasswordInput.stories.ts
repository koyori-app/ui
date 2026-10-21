import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import { Field, PasswordInput } from './index';

const meta = {
  title: 'Components/PasswordInput',
  component: PasswordInput,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof PasswordInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/* Field の id・ラベル・説明を入力欄が受け取る。Tab は 入力欄 → 表示切り替えの順。 */
export const InField: Story = {
  render: () => ({
    components: { Field, PasswordInput },
    setup: () => ({ value: ref('') }),
    template: `<div style="width: 360px">
      <Field id="password-in-field" label="パスワード" description="8 文字以上で入力してください。">
        <PasswordInput autocomplete="current-password" :value="value" :on-value-change="(next) => (value = next)" />
      </Field>
    </div>`,
  }),
};

export const WithError: Story = {
  render: () => ({
    components: { Field, PasswordInput },
    setup: () => ({ value: ref('abc') }),
    template: `<div style="width: 360px">
      <Field id="password-with-error" label="パスワード" error="8 文字以上で入力してください。" required>
        <PasswordInput autocomplete="current-password" :value="value" :on-value-change="(next) => (value = next)" />
      </Field>
    </div>`,
  }),
};

/* 親が表示状態を持つ。外側のボタンからも切り替えられる。 */
export const Controlled: Story = {
  render: () => ({
    components: { Field, PasswordInput },
    setup: () => ({ value: ref('correct horse'), visible: ref(false) }),
    template: `<div style="display: grid; gap: 12px; justify-items: start; width: 360px">
      <div style="width: 100%">
        <Field id="password-controlled" label="パスワード">
          <PasswordInput autocomplete="current-password" :value="value" :on-value-change="(next) => (value = next)"
            :visible="visible" :on-visible-change="(next) => (visible = next)" />
        </Field>
      </div>
      <output>{{ visible ? '表示中' : '非表示' }}</output>
      <button type="button" @click="visible = !visible">外側から切り替え</button>
    </div>`,
  }),
};

export const Disabled: Story = {
  render: () => ({
    components: { Field, PasswordInput },
    template: `<div style="width: 360px">
      <Field id="password-disabled" label="パスワード">
        <PasswordInput value="secret-value" disabled />
      </Field>
    </div>`,
  }),
};

/* Field の外では ariaLabel で名前を付ける。 */
export const Standalone: Story = {
  render: () => ({
    components: { PasswordInput },
    setup: () => ({ value: ref('') }),
    template: `<div style="width: 360px">
      <PasswordInput aria-label="共有リンクのパスワード" :value="value" :on-value-change="(next) => (value = next)" />
    </div>`,
  }),
};

/* 登録・変更では new-password を渡し、パスワード管理ツールに新しい値を提案させる。 */
export const NewPassword: Story = {
  render: () => ({
    components: { Field, PasswordInput },
    setup: () => ({ value: ref('') }),
    template: `<div style="width: 360px">
      <Field id="password-new" label="新しいパスワード" description="12 文字以上を推奨します。">
        <PasswordInput autocomplete="new-password" :value="value" :on-value-change="(next) => (value = next)" />
      </Field>
    </div>`,
  }),
};
