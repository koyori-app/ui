import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ContextMenu, IconRail, IconRailItem, IconRailSeparator, type ContextMenuItem } from './index';

/* 外部の画像に頼らないよう、色の四角を data URI で描く。壊れた画像は読み込みに失敗させて絵文字へ落とす。 */
const image = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#3b82f6"/><circle cx="40" cy="40" r="20" fill="#fbbf24"/></svg>')}`;
const broken = 'data:image/png;base64,AAAA';
const plus = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>;
const tenants = [
  { id: 'acme', label: 'Acme', src: image },
  { id: 'yoshino', label: '𠮷野商店' },
  { id: 'tea', label: 'お茶会', emoji: '🍵' },
  { id: 'both', label: '画像と絵文字', src: image, emoji: '🌸' },
  { id: 'broken', label: '読めない画像', src: broken, emoji: '🌿' },
];

const meta = {
  title: 'Components/IconRail',
  component: IconRail,
  parameters: { layout: 'fullscreen' },
  args: { label: 'テナント' },
} satisfies Meta<typeof IconRail>;
export default meta;
type Story = StoryObj<typeof meta>;

// 押した項目を story の中に出す。検査はこの出力を読む。
const Log = ({ log }: { log: string[] }) => <output data-testid="log" style={{ display: 'block', padding: 16 }}>{log.join(' ')}</output>;
const Frame = ({ children, height = 480 }: { children: any; height?: number }) => <div style={{ display: 'flex', height, background: 'var(--koyori-color-surface)' }}>
  <div style={{ display: 'flex', borderRight: '1px solid var(--koyori-color-border)' }}>{children}</div>
</div>;

export const Default: Story = {
  render: function Render(args) {
    const [selected, setSelected] = useState('acme');
    const [log, setLog] = useState<string[]>([]);
    return <div style={{ display: 'flex' }}>
      <Frame>
        <IconRail {...args}>
          {tenants.map(tenant => <IconRailItem key={tenant.id} {...tenant} id={`rail-${tenant.id}`} selected={selected === tenant.id}
            onClick={() => { setSelected(tenant.id); setLog(entries => [...entries, `click:${tenant.id}`]); }} />)}
          <IconRailSeparator />
          <IconRailItem id="rail-add" label="テナントを追加" variant="action" icon={plus} onClick={() => setLog(entries => [...entries, 'click:add'])} />
          <IconRailItem id="rail-invite" label="招待（無効）" variant="action" icon={plus} disabled onClick={() => setLog(entries => [...entries, 'click:invite'])} />
        </IconRail>
      </Frame>
      <Log log={log} />
    </div>;
  },
};

export const Many: Story = {
  render: (args) => <Frame height={360}>
    <IconRail {...args}>
      {Array.from({ length: 30 }, (_, i) => <IconRailItem key={i} id={`rail-many-${i}`} label={`テナント ${i + 1}`} selected={i === 0} />)}
    </IconRail>
  </Frame>,
};

export const ActionAndSeparator: Story = {
  render: (args) => <Frame>
    <IconRail {...args}>
      <IconRailItem id="rail-home" label="ホーム" emoji="🏠" selected />
      <IconRailSeparator />
      <IconRailItem id="rail-acme" label="Acme" src={image} />
      <IconRailItem id="rail-tea" label="お茶会" emoji="🍵" />
      <IconRailSeparator />
      <IconRailItem id="rail-add" label="テナントを追加" variant="action" icon={plus} />
    </IconRail>
  </Frame>,
};

const menuItems: ContextMenuItem[] = [
  { value: 'settings', label: 'テナントの設定' },
  { value: 'leave', label: 'テナントから抜ける', destructive: true },
];

export const WithMenu: Story = {
  render: function Render(args) {
    const [menu, setMenu] = useState({ open: false, x: 0, y: 0, tenant: '' });
    const [log, setLog] = useState<string[]>([]);
    const record = (entry: string) => setLog(entries => [...entries, entry]);
    return <div style={{ display: 'flex' }}>
      <Frame>
        <IconRail {...args}>
          {tenants.slice(0, 3).map(tenant => <IconRailItem key={tenant.id} {...tenant} id={`rail-menu-${tenant.id}`} selected={tenant.id === 'acme'}
            menuOpen={menu.open && menu.tenant === tenant.id} onClick={() => record(`click:${tenant.id}`)}
            onMenu={position => { record(`menu:${tenant.id}`); setMenu({ open: true, ...position, tenant: tenant.id }); }} />)}
          {/* onMenu の無い項目。右クリックでブラウザーのメニューを止めない。 */}
          <IconRailItem id="rail-menu-plain" label="メニューなし" emoji="📦" onClick={() => record('click:plain')} />
          {/* disabled の項目は onMenu があってもメニューを開かない。 */}
          <IconRailItem id="rail-menu-locked" label="無効なテナント" emoji="🔒" disabled onMenu={() => record('menu:locked')} />
        </IconRail>
      </Frame>
      <ContextMenu label="テナントの操作" id="rail-context-menu" open={menu.open} x={menu.x} y={menu.y} items={menuItems}
        onSelect={value => record(`select:${menu.tenant}:${value}`)} onClose={() => setMenu(current => ({ ...current, open: false }))} />
      <Log log={log} />
    </div>;
  },
};
