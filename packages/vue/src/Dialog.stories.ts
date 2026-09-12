import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import { Button, Dialog, Field, Input, Picker, XIcon } from './index';

/* showModal() は開いた瞬間にページ全体を inert にするため、Docs では iframe で描画する。 */
const meta = {
  title: 'Components/Dialog',
  component: Dialog,
  parameters: { layout: 'padded', docs: { story: { inline: false, iframeHeight: 400 } } },
  args: { open: true, title: 'タスクを編集', description: '担当者と期限を変更できます。' },
  render: (args) => ({
    components: { Dialog, Button },
    setup: () => ({ args }),
    template: `<Dialog v-bind="args">
      <p style="margin: 0">本文をここに置きます。</p>
      <template #actions>
        <Button label="キャンセル" variant="tertiary" />
        <Button label="保存" />
      </template>
    </Dialog>`,
  }),
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { open: false },
  render: (args) => ({
    components: { Dialog, Button },
    setup() {
      const open = ref(false);
      return { args, open };
    },
    template: `<div>
      <Button label="ダイアログを開く" :on-click="() => open = true" />
      <Dialog v-bind="args" :open="open" :on-close="() => open = false">
        <p style="margin: 0">Escape、背景クリック、ボタンのどれでも閉じます。</p>
        <template #actions><Button label="閉じる" :on-click="() => open = false" /></template>
      </Dialog>
      <output style="display: block; margin-top: 12px" aria-live="polite">{{ open ? '開いています' : '閉じています' }}</output>
    </div>`,
  }),
};
export const Open: Story = {};
export const WithForm: Story = {
  render: (args) => ({
    components: { Dialog, Button, Field, Input, Picker },
    setup: () => ({ args, teams: [{ value: 'design', label: 'デザイン' }, { value: 'frontend', label: 'Frontend' }] }),
    template: `<Dialog v-bind="args">
      <Field id="dialog-title" label="タイトル"><Input placeholder="例: 請求書を送る" /></Field>
      <Field id="dialog-team" label="担当チーム">
        <Picker label="選んでください" :items="teams" :searchable="false" />
      </Field>
      <template #actions>
        <Button label="キャンセル" variant="tertiary" />
        <Button label="保存" />
      </template>
    </Dialog>`,
  }),
};
export const LongContent: Story = {
  args: { title: '利用条件', description: '最後まで読んでから同意してください。' },
  render: (args) => ({
    components: { Dialog, Button },
    setup: () => ({ args, lines: Array.from({ length: 12 }, (_, index) => index + 1) }),
    template: `<Dialog v-bind="args">
      <p v-for="line in lines" :key="line" style="margin: 0">
        {{ line }}. この文章はダイアログ内のスクロールを確認するための長い本文です。
      </p>
      <template #actions><Button label="同意する" /></template>
    </Dialog>`,
  }),
};
/* plain と 2 列レイアウト。CSS はアプリ側で組む前提なので story 内に置く。 */
const twoColumnCss = `
.story-form { --koyori-dialog-width: 880px; --koyori-dialog-height: min(560px, 90vh); }
.story-form__columns { display: flex; flex: 1; min-height: 0; }
.story-form__main { display: flex; flex: 1; flex-direction: column; min-width: 0; padding: 16px; gap: 12px; }
.story-form__side { display: flex; flex-direction: column; gap: 12px; width: 260px; flex-shrink: 0; padding: 16px; border-left: 1px solid var(--koyori-color-border); background: var(--koyori-color-accent-subtle); }
.story-form__side-head { display: flex; justify-content: flex-end; }
`;

export const TwoColumn: Story = {
  args: { plain: true, title: '新規タスク', description: 'KOY にタスクを追加します' },
  render: (args) => ({
    components: { Dialog, Button, Field, Input, Picker },
    setup: () => ({ args, twoColumnCss, priorities: [{ value: 'high', label: '高' }, { value: 'normal', label: '中' }] }),
    template: `<div class="story-form">
      <component is="style">{{ twoColumnCss }}</component>
      <Dialog v-bind="args">
        <div class="story-form__columns">
          <div class="story-form__main">
            <Field id="story-title" label="タイトル"><Input placeholder="タイトルを入力" /></Field>
            <Button label="作成" />
          </div>
          <aside class="story-form__side">
            <!-- Dialog は閉じるボタンを持たないため、アプリ側で置く。 -->
            <div class="story-form__side-head">
              <Button ariaLabel="閉じる" variant="ghost"><template #icon><XIcon /></template></Button>
            </div>
            <Field id="story-priority" label="優先度">
              <Picker label="中" :items="priorities" :searchable="false" />
            </Field>
            <Field id="story-due" label="期限"><Input placeholder="2026-09-30" /></Field>
          </aside>
        </div>
      </Dialog>
    </div>`,
  }),
};
export const NoActions: Story = {
  args: { title: '保存しました', description: '変更はすべて反映されています。' },
  render: (args) => ({
    components: { Dialog },
    setup: () => ({ args }),
    template: '<Dialog v-bind="args" />',
  }),
};
