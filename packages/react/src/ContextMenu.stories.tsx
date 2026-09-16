import type { Meta, StoryObj } from '@storybook/react-vite';
import { useId, useState } from 'react';
import { Button, ContextMenu, EllipsisIcon, contextMenuPosition, menuButtonPosition, type ContextMenuItem } from './index';

const meta = {
  title: 'Components/ContextMenu',
  component: ContextMenu,
  parameters: { layout: 'padded' },
  args: {
    open: false,
    x: 0,
    y: 0,
    label: 'タスクの操作',
    items: [
      { value: 'edit', label: '編集' },
      { value: 'duplicate', label: '複製' },
      { value: 'delete', label: '削除する', destructive: true },
    ] as ContextMenuItem[],
  },
  render: (args) => <Example {...args} />,
} satisfies Meta<typeof ContextMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/* 右クリック、行にフォーカスして Shift+F10、三点ボタンのどれからでも同じメニューが開く。 */
function Example(args: { label: string; items: ContextMenuItem[] }) {
  const [menu, setMenu] = useState({ open: false, x: 0, y: 0 });
  const [action, setAction] = useState('未実行');
  /* Docs ページでは同じストーリーが並ぶので、id を重複させない。 */
  const menuId = useId();
  return (
    <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
      <div tabIndex={0} style={{ display: 'flex', alignItems: 'center', gap: 12, width: 320, padding: 12, border: '1px solid var(--koyori-color-border)', borderRadius: 8 }}
        onContextMenu={(event) => { event.preventDefault(); setMenu({ open: true, ...contextMenuPosition(event) }); }}
      >
        <span style={{ flex: 1 }}>請求書を送る</span>
        {/* 右クリックできない場合（スマホなど）の入口。同じメニューをボタンの左下に開く。 */}
        <Button ariaLabel="タスクの操作" variant="ghost" icon={<EllipsisIcon />}
          ariaHasPopup="menu" ariaExpanded={menu.open} ariaControls={menuId}
          onClick={(event) => setMenu(menu.open ? { ...menu, open: false } : { open: true, ...menuButtonPosition(event) })} />
      </div>
      <ContextMenu {...args} id={menuId} open={menu.open} x={menu.x} y={menu.y}
        onSelect={(value) => setAction(value)} onClose={() => setMenu((current) => ({ ...current, open: false }))} />
      <output aria-live="polite">{action}</output>
    </div>
  );
}

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
export const AllDisabled: Story = {
  args: {
    items: [
      { value: 'move', label: '移動', disabled: true },
      { value: 'delete', label: '削除する', disabled: true, destructive: true },
    ],
  },
};
export const Empty: Story = { args: { items: [] } };
/* 右端や下端の近くで開くと、サブメニューは左へ反転し、上へずれる。 */
export const Nested: Story = {
  args: {
    items: [
      { value: 'edit', label: '編集' },
      { value: 'move', label: '移動', items: [
        { value: 'move-todo', label: '未着手' },
        { value: 'move-doing', label: '進行中' },
        { value: 'move-done', label: '完了' },
      ] },
      { value: 'priority', label: '優先度', items: [
        { value: 'priority-high', label: '高' },
        { value: 'priority-low', label: '低' },
      ] },
      { value: 'share', label: '共有', disabled: true, items: [{ value: 'share-link', label: 'リンクをコピー' }] },
      { value: 'delete', label: '削除する', destructive: true },
    ],
  },
};
