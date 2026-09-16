import { useState } from 'react';
import { Button, Drawer, MenuIcon, Sidebar, SidebarLink, XIcon, type DrawerProps } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

const placements: { value: NonNullable<DrawerProps['placement']>; label: string }[] = [
  { value: 'left', label: '左' },
  { value: 'right', label: '右' },
  { value: 'top', label: '上' },
  { value: 'bottom', label: '下' },
];

export default function DrawerDemo() {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<DrawerProps['placement']>('left');

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {placements.map(item => (
        <Button key={item.value} label={`${item.label}から開く`} variant="secondary" icon={<MenuIcon />}
          onClick={() => { setPlacement(item.value); setOpen(true); }} />
      ))}
      <Drawer open={open} label="メニュー" placement={placement} onClose={() => setOpen(false)}>
        <Sidebar label="メインナビゲーション" header={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <strong>Koyori workspace</strong>
            <Button ariaLabel="メニューを閉じる" variant="ghost" icon={<XIcon />} onClick={() => setOpen(false)} />
          </div>
        }>
          <SidebarLink label="概要" href="#drawer-overview" current />
          <SidebarLink label="受信トレイ" href="#drawer-inbox" badge="4" />
          <SidebarLink label="自分のタスク" href="#drawer-tasks" />
        </Sidebar>
      </Drawer>
    </div>
  );
}
