import { useState } from 'react';
import { Avatar, HoverCard } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

const people: Record<string, { role: string; bio: string }> = {
  hanako: { role: 'デザイナー · プロダクト部', bio: '画面と部品のデザインを担当しています。' },
  yupix: { role: 'エンジニア · 基盤チーム', bio: 'API とビルドの仕組みを見ています。' },
};
const mention = { padding: '0 4px', borderRadius: 4, background: 'var(--koyori-color-selection)', color: 'var(--koyori-color-text)', fontWeight: 500, textDecoration: 'none' } as const;
const muted = { color: 'var(--koyori-color-text-muted)', fontSize: 12 } as const;

function Profile({ user }: { user: string }) {
  return <>
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 14px 8px' }}>
      <Avatar name={user} size={40} />
      <div><strong>{user}</strong><div style={muted}>{people[user].role}</div></div>
    </div>
    <div style={{ padding: '0 14px 12px' }}>{people[user].bio}</div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderTop: '1px solid var(--koyori-color-border)' }}>
      <a href="#使い方" style={{ color: 'var(--koyori-color-text)', fontWeight: 500, textDecoration: 'none' }}>プロフィールを見る →</a>
      <span style={muted}>Esc で閉じる</span>
    </div>
  </>;
}

// 外の要素を起点にする例。本文は dangerouslySetInnerHTML で描くため、メンションは React の部品ではない。
const html = '<a class="mention" href="#使い方" data-user="hanako">@hanako</a> と <a class="mention" href="#使い方" data-user="yupix">@yupix</a> がレビューします。';

export default function HoverCardDemo() {
  // ref.current は初回の描画では null なので、container は state で渡す。
  const [body, setBody] = useState<HTMLElement | null>(null);
  const [user, setUser] = useState<string | null>(null);
  return <div style={{ padding: 24, lineHeight: 1.8 }}>
    <div style={{ margin: '0 0 8px' }}>
      デザインは{' '}
      <HoverCard label="hanako のプロフィール" content={<Profile user="hanako" />}>
        <a href="#使い方" style={mention}>@hanako</a>
      </HoverCard>
      {' '}が担当します。
    </div>
    <style>{'.demo-body .mention { padding: 0 4px; border-radius: 4px; background: var(--koyori-color-selection); color: var(--koyori-color-text); font-weight: 500; text-decoration: none; }'}</style>
    <div>
      <span className="demo-body" ref={setBody} dangerouslySetInnerHTML={{ __html: html }} />
      <HoverCard label="メンションのプロフィール" container={body} selector="a.mention[data-user]"
        onOpenChange={(open, trigger) => setUser(open ? trigger.dataset.user ?? null : null)}
        content={user ? <Profile user={user} /> : null} />
    </div>
  </div>;
}
