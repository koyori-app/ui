import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { nextTick, ref } from 'vue';
import { Alert } from './index';

const meta = {
  title: 'Components/Alert',
  component: Alert,
  parameters: { layout: 'padded' },
  args: { message: '保存できませんでした。時間をおいて試してください。' },
  argTypes: { variant: { control: 'radio', options: ['danger', 'warning', 'info', 'success'] } },
  render: args => ({
    components: { Alert },
    setup: () => ({ args }),
    template: '<div style="width: 460px"><Alert v-bind="args" /></div>',
  }),
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Danger: Story = { args: { onRetry: () => {} } };
export const Warning: Story = { args: { variant: 'warning', message: '公開予定日が過ぎています。' } };
export const Info: Story = { args: { variant: 'info', message: '3 月 1 日からメールの形式が変わります。' } };
export const Success: Story = { args: { variant: 'success', message: '下書きを保存しました。' } };
export const CustomPrefix: Story = { args: { variant: 'warning', prefix: '確認', message: '未保存の変更があります。' } };

/* 閉じたあとのフォーカス先は利用側が決める。ここでは再表示のボタンへ戻す。Tab の順は 再試行 → 閉じる。 */
export const Dismissible: Story = {
  render: () => ({
    components: { Alert },
    setup() {
      const open = ref(true);
      const restore = ref<HTMLButtonElement | null>(null);
      const dismiss = async () => {
        open.value = false;
        await nextTick();
        restore.value?.focus();
      };
      return { open, restore, dismiss, noop: () => {} };
    },
    template: `<div style="display: grid; gap: 12px; justify-items: start; width: 460px">
      <div v-if="open" style="width: 100%"><Alert message="共有リンクの作成に失敗しました。" :on-retry="noop" :on-dismiss="dismiss" /></div>
      <button ref="restore" type="button" @click="open = true">もう一度表示</button>
    </div>`,
  }),
};

/* 同じ要素のまま本文だけを差し替え、読み上げが 1 回で済むかを確かめる。 */
export const LiveUpdate: Story = {
  render: () => ({
    components: { Alert },
    setup: () => ({ count: ref(1) }),
    template: `<div style="display: grid; gap: 12px; justify-items: start; width: 460px">
      <div style="width: 100%"><Alert :message="\`\${count} 件のタスクを保存できませんでした。\`" /></div>
      <button type="button" @click="count += 1">件数を増やす</button>
    </div>`,
  }),
};

/* 複数を同時に出すと上から順に読み上げられる。数を絞ること。 */
export const Multiple: Story = {
  render: () => ({
    components: { Alert },
    setup: () => ({ noop: () => {} }),
    template: `<div style="display: grid; gap: 12px; width: 460px">
      <Alert message="添付ファイルをアップロードできませんでした。" :on-retry="noop" />
      <Alert variant="warning" message="下書きの保存から 30 分が経過しています。" />
      <Alert variant="info" message="編集内容は自動では共有されません。" />
    </div>`,
  }),
};
