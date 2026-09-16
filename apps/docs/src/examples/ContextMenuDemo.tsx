import { useState } from 'react';
import { ContextMenu, Dropdown, EllipsisIcon, contextMenuPosition, type ContextMenuItem } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

const items: ContextMenuItem[] = [
  { value: 'edit', label: '編集' },
  { value: 'duplicate', label: '複製' },
  { value: 'delete', label: '削除する', destructive: true },
];

const rows = ['請求書を送る', 'デザインを確認する'];

export default function ContextMenuDemo() {
  const [menu, setMenu] = useState({ open: false, x: 0, y: 0, row: rows[0] });
  const [action, setAction] = useState('未実行');
  const run = (value: string, row: string) => setAction(`${row}: ${items.find(item => item.value === value)?.label}`);

  return <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
    {rows.map(row => (
      <div key={row} tabIndex={0}
        style={{ display: 'flex', alignItems: 'center', gap: 12, width: 320, padding: 12, border: '1px solid var(--koyori-color-border)', borderRadius: 8 }}
        onContextMenu={event => { event.preventDefault(); setMenu({ open: true, ...contextMenuPosition(event), row }); }}
      >
        <span style={{ flex: 1 }}>{row}</span>
        <Dropdown label="操作" icon={<EllipsisIcon />} items={items} onSelect={value => run(value, row)} />
      </div>
    ))}
    <ContextMenu open={menu.open} x={menu.x} y={menu.y} label="タスクの操作" items={items}
      onSelect={value => run(value, menu.row)} onClose={() => setMenu(current => ({ ...current, open: false }))} />
    <p role="status">{action}</p>
  </div>;
}
