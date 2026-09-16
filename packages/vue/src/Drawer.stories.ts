import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import { Button, CheckIcon, Drawer, EllipsisIcon, MenuIcon, Sidebar, SidebarLink, XIcon } from './index';

/* showModal() は開いた瞬間にページ全体を inert にするため、Docs では iframe で描画する。 */
const meta = {
  title: 'Components/Drawer',
  component: Drawer,
  parameters: { layout: 'padded', docs: { story: { inline: false, iframeHeight: 480 } } },
  args: { open: false, label: 'メニュー', placement: 'left' },
  argTypes: { placement: { control: 'select', options: ['left', 'right', 'top', 'bottom'] } },
  render: (args) => ({
    components: { Button, CheckIcon, Drawer, EllipsisIcon, MenuIcon, Sidebar, SidebarLink, XIcon },
    setup() {
      const open = ref(false);
      const rail = ref(false);
      return { args, open, rail };
    },
    template: `<div>
      <Button ariaLabel="メニューを開く" variant="ghost" :on-click="() => open = true"><template #icon><MenuIcon /></template></Button>
      <Drawer v-bind="args" :open="open" :on-close="() => open = false">
        <Sidebar label="メインナビゲーション" :rail="rail">
          <template #header>
            <div style="display: flex; align-items: center; justify-content: space-between">
              <strong v-if="!rail">Koyori workspace</strong>
              <!-- Drawer は閉じるボタンを持たないため、アプリ側で置く。 -->
              <Button ariaLabel="メニューを閉じる" variant="ghost" :on-click="() => open = false"><template #icon><XIcon /></template></Button>
            </div>
          </template>
          <SidebarLink label="概要" href="#overview" current><template #icon><CheckIcon /></template></SidebarLink>
          <SidebarLink label="受信トレイ" href="#inbox" badge="4"><template #icon><EllipsisIcon /></template></SidebarLink>
          <SidebarLink label="自分のタスク" href="#tasks"><template #icon><CheckIcon /></template></SidebarLink>
          <template #footer>
            <Button :ariaLabel="rail ? 'ラベルを表示する' : 'アイコンだけにする'" variant="ghost" :on-click="() => rail = !rail"><template #icon><MenuIcon /></template></Button>
          </template>
        </Sidebar>
      </Drawer>
    </div>`,
  }),
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

/* modal を false にすると dialog を使わず、その場に描く。広い画面の常時表示に使う。 */
export const Inline: Story = { args: { modal: false } };
export const Left: Story = {};
export const Right: Story = { args: { placement: 'right' } };
export const Top: Story = { args: { placement: 'top' } };
export const Bottom: Story = { args: { placement: 'bottom' } };
