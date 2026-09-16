import { useEffect, useState, useSyncExternalStore } from 'react';
import { Button, CheckIcon, Drawer, EllipsisIcon, MenuIcon, Sidebar, SidebarLink } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

const query = '(max-width: 768px)';

function useNarrow() {
  return useSyncExternalStore(
    (notify) => {
      const media = matchMedia(query);
      media.addEventListener('change', notify);
      return () => media.removeEventListener('change', notify);
    },
    () => matchMedia(query).matches,
    () => false, // サーバー描画では広い画面として扱う
  );
}

export default function ResponsiveNavigationDemo() {
  const narrow = useNarrow();
  const [open, setOpen] = useState(true);
  // 狭くなったら閉じ、広くなったら常時表示に戻す。
  useEffect(() => setOpen(!narrow), [narrow]);

  return <div style={{ display: 'flex', gap: 12, height: 320 }}>
    <Drawer modal={narrow} open={open} label="メニュー" onClose={() => setOpen(false)}>
      <Sidebar id="responsive-nav" label="メインナビゲーション" open={open}>
        <SidebarLink label="概要" href="#responsive-overview" icon={<CheckIcon />} current />
        <SidebarLink label="受信トレイ" href="#responsive-inbox" icon={<EllipsisIcon />} badge="4" />
      </Sidebar>
    </Drawer>
    <div style={{ flex: 1, minWidth: 0 }}>
      <Button ariaLabel="メニュー" variant="ghost" icon={<MenuIcon />}
        ariaExpanded={open} ariaControls="responsive-nav" onClick={() => setOpen(!open)} />
      <p>{narrow ? '狭い画面: ハンバーガーで開くモーダル' : '広い画面: 常時表示'}</p>
    </div>
  </div>;
}
