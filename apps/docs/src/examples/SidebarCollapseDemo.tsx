import { useState } from 'react';
import { Button, CheckIcon, EllipsisIcon, MenuIcon, Sidebar, SidebarLink } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

export default function SidebarCollapseDemo() {
  const [open, setOpen] = useState(true);
  const [rail, setRail] = useState(false);
  return <div style={{ display: 'flex', gap: 12, height: 320 }}>
    <Sidebar id="react-collapsible-sidebar" label="開閉できるサイドバーのデモ" open={open} rail={rail} onRailChange={setRail}>
      <SidebarLink label="概要" href="#collapse-overview" icon={<CheckIcon />} current />
      <SidebarLink label="受信トレイ" href="#collapse-inbox" icon={<EllipsisIcon />} badge="4" />
      <SidebarLink label="自分のタスク" href="#collapse-tasks" icon={<CheckIcon />} />
    </Sidebar>
    <div style={{ flex: 1, minWidth: 0 }}>
      <Button ariaLabel="メニュー" variant="ghost" icon={<MenuIcon />}
        ariaExpanded={open} ariaControls="react-collapsible-sidebar" onClick={() => setOpen(!open)} />
      <p>端のつまみでアイコンだけの表示に、ハンバーガーで開閉できます。</p>
    </div>
  </div>;
}
