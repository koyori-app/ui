import { ref } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { InlineEdit, Input, Textarea, type InlineEditProps, type InlineEditCommitReason } from './index';

const example = (args: InlineEditProps, asynchronous = false, initial = '請求書を送る') => ({
  components: { InlineEdit, Input, Textarea },
  setup() {
    const value = ref(initial);
    const draft = ref(initial);
    const editing = ref(args.editing);
    const saving = ref(false);
    const error = ref('');
    const commits = ref(0);
    const cancels = ref(0);
    const reason = ref('未保存');
    const commit = (nextReason: InlineEditCommitReason) => {
      commits.value++;
      reason.value = nextReason;
      if (!draft.value.trim()) { error.value = 'タイトルを入力してください。'; return; }
      error.value = '';
      if (asynchronous) saving.value = true;
      else { value.value = draft.value; editing.value = false; }
    };
    return {
      args, asynchronous, value, draft, editing, saving, error, commits, cancels, reason, commit,
      edit() { draft.value = value.value; error.value = ''; editing.value = true; },
      cancel() { cancels.value++; draft.value = value.value; error.value = ''; editing.value = false; },
      success() { value.value = draft.value; saving.value = false; editing.value = false; },
      fail() { saving.value = false; error.value = '保存に失敗しました。再試行してください。'; },
    };
  },
  template: `<div style="display: grid; gap: 16px; max-width: 360px">
    <InlineEdit v-bind="args" :editing="editing" :saving="saving" :error="error"
      :on-edit="edit" :on-cancel="cancel" :on-commit="commit">
      <template #display><strong>{{ value || '未入力' }}</strong></template>
      <Textarea v-if="args.multiline" :value="draft" :on-value-change="v => draft = v" />
      <Input v-else :value="draft" :on-value-change="v => draft = v" />
    </InlineEdit>
    <button type="button">次の項目</button>
    <template v-if="asynchronous">
      <button type="button" :disabled="!saving" @click="success">保存を成功させる</button>
      <button type="button" :disabled="!saving" @click="fail">保存を失敗させる</button>
    </template>
    <output>確定: {{ commits }} / 取消: {{ cancels }} / 理由: {{ reason }} / 値: {{ value }}</output>
  </div>`,
});

const meta = {
  title: 'Components/InlineEdit',
  component: InlineEdit,
  parameters: { layout: 'padded' },
  args: { id: 'inline-title', label: 'タイトル', editing: false },
  render: args => example(args),
} satisfies Meta<typeof InlineEdit>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const CommitOnBlur: Story = { args: { commitOnBlur: true } };
export const Multiline: Story = { args: { multiline: true, description: 'Enterで改行、Ctrl / Command + Enterで保存します。' } };
export const AsyncSave: Story = { args: { commitOnBlur: true }, render: args => example(args, true) };
export const Empty: Story = { render: args => example(args, false, '') };
export const Disabled: Story = { args: { disabled: true } };
export const InitiallyEditing: Story = { args: { editing: true } };
