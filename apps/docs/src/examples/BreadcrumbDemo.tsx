import { useState } from 'react';
import { Breadcrumb } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

const pages = [
  { label: 'プロジェクト', href: '/projects' },
  { label: 'Koyori UI', href: '/projects/ui' },
  { label: 'コンポーネント', href: '/projects/ui/components' },
  { label: 'Breadcrumb', href: '/projects/ui/components/breadcrumb' },
];

export default function BreadcrumbDemo() {
  const [depth, setDepth] = useState(pages.length);
  // Breadcrumb は遷移を持たない。クリックを親で受けてアプリのルーターに渡す。
  const navigate = (event: React.MouseEvent) => {
    const link = (event.target as HTMLElement).closest('a');
    if (!link) return;
    event.preventDefault();
    setDepth(pages.findIndex((page) => page.href === link.getAttribute('href')) + 1);
  };
  return <div style={{ display: 'grid', gap: 12 }} onClick={navigate}>
    <Breadcrumb items={pages.slice(0, depth).map((page, index) =>
      index === depth - 1 ? { label: page.label } : page)} />
    <p style={{ margin: 0 }}>表示中のページ: {pages[depth - 1].label}</p>
  </div>;
}
