import { useState } from 'react';
import { Button, UserPanel, type UserPanelSection } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

const items: UserPanelSection[] = [
  { items: [{ value: 'profile', label: 'プロフィール', href: '#使い方' }, { value: 'settings', label: 'アカウントの設定' }] },
  { items: [{ value: 'logout', label: 'ログアウト', destructive: true }] },
];

export default function UserPanelDemo() {
  const [message, setMessage] = useState('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: 240, height: 320 }}>
      <UserPanel name="hanako" description="hanako@example.com" cardLabel="hanako のプロフィール" items={items}
        onSelect={value => setMessage(`${value} を選びました`)}
        action={<Button ariaLabel="設定" variant="ghost" onClick={() => setMessage('設定を押しました')}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="9" /></svg>} />} />
      <p style={{ margin: '8px 0 0' }} aria-live="polite">{message}</p>
    </div>
  );
}
