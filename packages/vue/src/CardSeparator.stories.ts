import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { Button, Dialog, Field, Input, Sidebar, SidebarLink } from './index';

/* 部品ではなくユーティリティクラス。マークアップに付けて使う。 */
const meta = {
  title: 'Styles/Card・Separator',
  /* 「・」がそのまま id に入ると URL が読みにくいため、明示する。 */
  id: 'styles-card-separator',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => ({
    components: { Button, Field, Input },
    template: `<div class="koyori-card" style="max-width: 360px">
      <h2 class="koyori-card-heading">ログイン</h2>
      <Field id="card-email" label="メールアドレス"><Input type="email" autocomplete="email" /></Field>
      <hr class="koyori-separator" />
      <div class="koyori-card-actions">
        <Button variant="tertiary" label="キャンセル" />
        <Button label="ログイン" />
      </div>
    </div>`,
  }),
};

/* 外側の角丸は「内側の角丸 + 外側の padding」。入れ子でも角がずれない。 */
export const Nested: Story = {
  render: () => ({
    template: `<div class="koyori-card" style="max-width: 420px">
      <h2 class="koyori-card-heading">通知</h2>
      <div class="koyori-card" style="box-shadow: none">
        <h3 class="koyori-card-heading">メール</h3>
        <p style="margin: 0">重要な更新だけを受け取ります。</p>
      </div>
      <div class="koyori-card" style="box-shadow: none">
        <h3 class="koyori-card-heading">アプリ内</h3>
        <p style="margin: 0">すべての更新を受け取ります。</p>
      </div>
    </div>`,
  }),
};

export const InDialog: Story = {
  render: () => ({
    components: { Button, Dialog, Field, Input },
    template: `<Dialog :open="true" title="メンバーを招待" plain>
      <div class="koyori-card" style="border: 0; box-shadow: none">
        <h2 class="koyori-card-heading">メンバーを招待</h2>
        <Field id="card-invite" label="メールアドレス"><Input type="email" /></Field>
        <hr class="koyori-separator" />
        <div class="koyori-card-actions">
          <Button variant="tertiary" label="閉じる" />
          <Button label="招待する" />
        </div>
      </div>
    </Dialog>`,
  }),
};

export const InSidebar: Story = {
  render: () => ({
    components: { Button, Sidebar, SidebarLink },
    template: `<div style="height: 300px">
      <Sidebar label="設定">
        <template #footer>
          <div class="koyori-card" style="box-shadow: none">
            <p style="margin: 0">無料プランを使用中です。</p>
            <div class="koyori-card-actions"><Button variant="secondary" label="変更" /></div>
          </div>
        </template>
        <SidebarLink label="一般" href="#general" current />
        <hr class="koyori-separator" />
        <SidebarLink label="メンバー" href="#members" />
      </Sidebar>
    </div>`,
  }),
};

export const Separators: Story = {
  render: () => ({
    template: `<div style="display: grid; gap: 16px; max-width: 360px">
      <p style="margin: 0">上の内容</p>
      <hr class="koyori-separator" />
      <p style="margin: 0">下の内容</p>
      <div style="display: flex; align-items: center">
        <span>作成者</span>
        <hr class="koyori-separator" aria-orientation="vertical" />
        <span>2026-04-01</span>
        <hr class="koyori-separator" aria-orientation="vertical" />
        <span>公開</span>
      </div>
    </div>`,
  }),
};

export const DarkBackground: Story = {
  render: () => ({
    components: { Button },
    template: `<div style="padding: 24px; border-radius: 16px; background: #2b2733">
      <div class="koyori-card" style="max-width: 320px">
        <h2 class="koyori-card-heading">請求先</h2>
        <p style="margin: 0">暗い背景の上でも枠と影で浮きます。</p>
        <hr class="koyori-separator" />
        <div class="koyori-card-actions"><Button variant="secondary" label="変更" /></div>
      </div>
    </div>`,
  }),
};
