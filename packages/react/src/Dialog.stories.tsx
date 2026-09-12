import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, Dialog, Field, Input, Picker, type DialogProps } from './index';

/* showModal() は開いた瞬間にページ全体を inert にするため、Docs では iframe で描画する。 */
const meta = {
  title: 'Components/Dialog',
  component: Dialog,
  parameters: { layout: 'padded', docs: { story: { inline: false, iframeHeight: 400 } } },
  args: { open: true, title: 'タスクを編集', description: '担当者と期限を変更できます。' },
  render: (args) => (
    <Dialog {...args} actions={<>
      <Button label="キャンセル" variant="tertiary" />
      <Button label="保存" />
    </>}>
      <p style={{ margin: 0 }}>本文をここに置きます。</p>
    </Dialog>
  ),
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function TriggerExample(args: DialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button label="ダイアログを開く" onClick={() => setOpen(true)} />
      <Dialog {...args} open={open} onClose={() => setOpen(false)} actions={
        <Button label="閉じる" onClick={() => setOpen(false)} />
      }>
        <p style={{ margin: 0 }}>Escape、背景クリック、ボタンのどれでも閉じます。</p>
      </Dialog>
      <output style={{ display: 'block', marginTop: 12 }} aria-live="polite">{open ? '開いています' : '閉じています'}</output>
    </div>
  );
}

export const Default: Story = { args: { open: false }, render: (args) => <TriggerExample {...args} /> };
export const Open: Story = {};
export const WithForm: Story = {
  render: (args) => (
    <Dialog {...args} actions={<>
      <Button label="キャンセル" variant="tertiary" />
      <Button label="保存" />
    </>}>
      <Field id="dialog-title" label="タイトル"><Input placeholder="例: 請求書を送る" /></Field>
      <Field id="dialog-team" label="担当チーム">
        <Picker label="選んでください" searchable={false} items={[
          { value: 'design', label: 'デザイン' },
          { value: 'frontend', label: 'Frontend' },
        ]} />
      </Field>
    </Dialog>
  ),
};
export const LongContent: Story = {
  render: (args) => (
    <Dialog {...args} title="利用条件" description="最後まで読んでから同意してください。"
      actions={<Button label="同意する" />}>
      {Array.from({ length: 12 }, (_, index) => (
        <p key={index} style={{ margin: 0 }}>
          {index + 1}. この文章はダイアログ内のスクロールを確認するための長い本文です。
        </p>
      ))}
    </Dialog>
  ),
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
  render: (args) => (
    <div className="story-form">
      <style>{twoColumnCss}</style>
      <Dialog {...args}>
        <div className="story-form__columns">
          <div className="story-form__main">
            <Field id="story-title" label="タイトル"><Input placeholder="タイトルを入力" /></Field>
            <Button label="作成" />
          </div>
          <aside className="story-form__side">
            {/* Dialog は閉じるボタンを持たないため、アプリ側で置く。 */}
            <div className="story-form__side-head"><Button label="閉じる" variant="ghost" /></div>
            <Field id="story-priority" label="優先度">
              <Picker label="中" searchable={false} items={[
                { value: 'high', label: '高' },
                { value: 'normal', label: '中' },
              ]} />
            </Field>
            <Field id="story-due" label="期限"><Input placeholder="2026-09-30" /></Field>
          </aside>
        </div>
      </Dialog>
    </div>
  ),
};
export const NoActions: Story = {
  render: (args) => <Dialog {...args} title="保存しました" description="変更はすべて反映されています。" />,
};
