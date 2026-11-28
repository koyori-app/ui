import { useState } from 'react';
import { ContextMenu, IconRail, IconRailItem, IconRailSeparator } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

const tenants = [
  { id: 'acme', label: 'Acme', emoji: '🏢' },
  { id: 'tea', label: 'お茶会', emoji: '🍵' },
  { id: 'yoshino', label: '𠮷野商店' },
];

export default function IconRailDemo() {
  const [selected, setSelected] = useState('acme');
  const [menu, setMenu] = useState({ open: false, x: 0, y: 0, tenant: '' });
  const [message, setMessage] = useState('');
  return (
    <div style={{ display: 'flex', gap: 16, height: 260 }}>
      <div style={{ display: 'flex', borderRight: '1px solid var(--koyori-color-border)' }}>
        <IconRail label="テナント">
          {tenants.map(tenant => (
            <IconRailItem key={tenant.id} id={`demo-rail-${tenant.id}`} label={tenant.label} emoji={tenant.emoji}
              selected={selected === tenant.id} onClick={() => setSelected(tenant.id)}
              onMenu={position => setMenu({ open: true, ...position, tenant: tenant.label })} />
          ))}
          <IconRailSeparator />
          <IconRailItem id="demo-rail-add" label="テナントを追加" variant="action" onClick={() => setMessage('追加を押しました')}
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>} />
        </IconRail>
      </div>
      <p style={{ margin: 0 }}>右クリック・長押しで項目のメニュー。{message}</p>
      <ContextMenu label="テナントの操作" open={menu.open} x={menu.x} y={menu.y}
        items={[{ value: 'settings', label: '設定' }, { value: 'leave', label: '抜ける', destructive: true }]}
        onSelect={value => setMessage(`${menu.tenant}: ${value}`)} onClose={() => setMenu(current => ({ ...current, open: false }))} />
    </div>
  );
}
