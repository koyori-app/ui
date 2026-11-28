import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Drawer, UserPanel, type UserPanelSection } from './index';

const gear = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>;
const dot = (color: string) => <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5" fill={color} /></svg>;
const items: UserPanelSection[] = [
  { items: [{ value: 'profile', label: 'プロフィール', href: '#profile' }, { value: 'settings', label: 'アカウントの設定', href: '#settings' }] },
  { items: [{ value: 'logout', label: 'ログアウト', destructive: true }] },
];
const iconItems: UserPanelSection[] = [
  { items: [
    { value: 'profile', label: 'プロフィール', href: '#profile', icon: dot('#3b82f6') },
    { value: 'theme', label: '表示の設定', icon: dot('#a855f7') },
    { value: 'help', label: 'ヘルプ（準備中）', disabled: true },
  ] },
  { items: [{ value: 'logout', label: 'ログアウト', destructive: true, icon: dot('#ef4444') }] },
];

const meta = {
  title: 'Components/UserPanel',
  component: UserPanel,
  parameters: { layout: 'fullscreen' },
  args: { name: 'hanako', description: 'hanako@example.com', cardLabel: 'hanako のプロフィール', items },
} satisfies Meta<typeof UserPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

// onSelect・onOpenChange の呼ばれ方を story の中に出す。検査はこの出力を読む。
const useLog = () => {
  const [log, setLog] = useState<string[]>([]);
  return { log, record: (entry: string) => setLog(entries => [...entries, entry]) };
};
const Log = ({ log }: { log: string[] }) => <output data-testid="log" style={{ display: 'block', padding: 16 }}>{log.join(' ')}</output>;
// サイドバーの下端に置く。overflow: hidden の中でもカードが切られないことを見る。
const Sidebar = ({ children, align = 'end' }: { children: any; align?: 'start' | 'end' }) => <div style={{
  display: 'flex', flexDirection: 'column', justifyContent: align === 'end' ? 'flex-end' : 'flex-start', boxSizing: 'border-box',
  width: 240, height: '100vh', padding: 8, overflow: 'hidden', background: 'var(--koyori-color-surface-raised)', borderRight: '1px solid var(--koyori-color-border)',
}}>{children}</div>;

const Example = ({ args, align }: { args: any; align?: 'start' | 'end' }) => {
  const { log, record } = useLog();
  return <div style={{ display: 'flex' }}>
    <Sidebar align={align}>
      <UserPanel {...args} onSelect={value => record(`select:${value}`)} onOpenChange={open => record(open ? 'open' : 'close')}
        action={<Button ariaLabel="設定" variant="ghost" icon={gear} onClick={() => record('action')} />} />
    </Sidebar>
    <div style={{ padding: 16 }}><button type="button">外のボタン</button><Log log={log} /></div>
  </div>;
};

export const Default: Story = { render: (args) => <Example args={args} /> };
export const Open: Story = { args: { defaultOpen: true }, render: (args) => <Example args={args} /> };
export const Compact: Story = {
  render: function Render(args) {
    const { log, record } = useLog();
    return <div style={{ display: 'flex' }}>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100vh', padding: 8, boxSizing: 'border-box' }}>
        <UserPanel {...args} compact onSelect={value => record(`select:${value}`)} action={<Button ariaLabel="設定" variant="ghost" icon={gear} />} />
      </div>
      <Log log={log} />
    </div>;
  },
};
export const LongText: Story = {
  args: { name: 'とても長い表示名のユーザー・プロダクト開発部・デザインチーム', description: 'a-very-long-email-address-for-testing@subdomain.example.com', defaultOpen: true },
  render: (args) => <Example args={args} />,
};
export const WithIcons: Story = { args: { items: iconItems, defaultOpen: true }, render: (args) => <Example args={args} /> };
// 上端に置くと、上に入らないので下に出る。
export const TopEdge: Story = { args: { defaultOpen: true }, render: (args) => <Example args={args} align="start" /> };
export const InDrawer: Story = {
  render: function Render(args) {
    const [open, setOpen] = useState(true);
    const { log, record } = useLog();
    return <div>
      <Button label="ドロワーを開く" onClick={() => setOpen(true)} />
      <Drawer open={open} label="メニュー" placement="left" onClose={() => setOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', boxSizing: 'border-box', padding: 8, overflow: 'hidden' }}>
          <UserPanel {...args} onSelect={value => record(`select:${value}`)} />
        </div>
      </Drawer>
      <Log log={log} />
    </div>;
  },
};

