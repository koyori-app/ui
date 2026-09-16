import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import { ContextMenu, Dropdown, EllipsisIcon, contextMenuPosition, type ContextMenuItem } from './index';

const items: ContextMenuItem[] = [
  { value: 'edit', label: '編集' },
  { value: 'duplicate', label: '複製' },
  { value: 'delete', label: '削除する', destructive: true },
];

const meta = {
  title: 'Components/ContextMenu',
  component: ContextMenu,
  parameters: { layout: 'padded' },
  args: { open: false, x: 0, y: 0, label: 'タスクの操作', items },
  /* 右クリックのほか、行にフォーカスして Shift+F10 でも開く。 */
  render: (args) => ({
    components: { ContextMenu, Dropdown, EllipsisIcon },
    setup() {
      const menu = ref({ open: false, x: 0, y: 0 });
      const action = ref('未実行');
      const openMenu = (event: MouseEvent) => {
        event.preventDefault();
        menu.value = { open: true, ...contextMenuPosition(event) };
      };
      const select = (value: string) => { action.value = value; };
      return { args, menu, action, openMenu, select };
    },
    template: `<div style="display: grid; gap: 12px; justify-items: start">
      <div tabindex="0" style="display: flex; align-items: center; gap: 12px; width: 320px; padding: 12px; border: 1px solid var(--koyori-color-border); border-radius: 8px"
        @contextmenu="openMenu"
      >
        <span style="flex: 1">請求書を送る</span>
        <!-- 右クリックできない場合の代替。同じ項目を渡す。 -->
        <Dropdown label="操作" :items="args.items" :on-select="select"><template #icon><EllipsisIcon /></template></Dropdown>
      </div>
      <ContextMenu v-bind="args" :open="menu.open" :x="menu.x" :y="menu.y"
        :on-select="select" :on-close="() => menu.open = false" />
      <output aria-live="polite">{{ action }}</output>
    </div>`,
  }),
} satisfies Meta<typeof ContextMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithDisabled: Story = {
  args: {
    items: [
      { value: 'edit', label: '編集' },
      { value: 'move', label: '移動', disabled: true },
      { value: 'delete', label: '削除する', destructive: true },
    ],
  },
};
