import { useEffect, useState } from 'react';
import { Accordion, Avatar, Sidebar, SidebarLink } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

const pages = [
  { href: '#sidebar-overview', label: '概要' },
  { href: '#sidebar-inbox', label: '受信トレイ', badge: '4' },
  { href: '#sidebar-tasks', label: '自分のタスク' },
  { href: '#sidebar-ui', label: 'Koyori UI' },
  { href: '#sidebar-website', label: 'Web サイト' },
];

export default function SidebarDemo() {
  const [current, setCurrent] = useState('#sidebar-ui');
  useEffect(() => {
    const sync = () => { if (pages.some(page => page.href === location.hash)) setCurrent(location.hash); };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  return <div style={{ height: 420 }}>
    <Sidebar label="サイドバーのデモ"
      header={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name="Koyori" /><strong>Koyori workspace</strong></div>}
      footer={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name="Yupix" size={28} /><span>Yupix</span></div>}>
      {pages.slice(0, 3).map(page => <SidebarLink key={page.href} {...page} current={current === page.href} />)}
      <Accordion id="react-sidebar-projects" label="プロジェクト" defaultOpen>
        {pages.slice(3).map(page => <SidebarLink key={page.href} {...page} current={current === page.href} />)}
      </Accordion>
    </Sidebar>
  </div>;
}
