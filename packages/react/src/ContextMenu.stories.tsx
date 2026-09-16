import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ContextMenu, Dropdown, EllipsisIcon, contextMenuPosition, type ContextMenuItem } from './index';

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

/* 右クリックのほか、行にフォーカスして Shift+F10 でも開く。 */
function Example(args: { label: string; items: ContextMenuItem[] }) {
  const [menu, setMenu] = useState({ open: false, x: 0, y: 0 });
  const [action, setAction] = useState('未実行');
  return (
    <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
      <div tabIndex={0} style={{ display: 'flex', alignItems: 'center', gap: 12, width: 320, padding: 12, border: '1px solid var(--koyori-color-border)', borderRadius: 8 }}
        onContextMenu={(event) => { event.preventDefault(); setMenu({ open: true, ...contextMenuPosition(event) }); }}
      >
        <span style={{ flex: 1 }}>請求書を送る</span>
        {/* 右クリックできない場合の代替。同じ項目を渡す。 */}
        <Dropdown label="操作" icon={<EllipsisIcon />} items={args.items} onSelect={setAction} />
      </div>
      <ContextMenu {...args} open={menu.open} x={menu.x} y={menu.y}
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
