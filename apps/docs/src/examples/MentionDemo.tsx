import { Fragment } from 'react';
import { Mention } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

const photo = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2 2'><rect width='2' height='2' fill='%23c4b5df'/><circle cx='1' cy='0.75' r='0.45' fill='%23faf8f5'/><circle cx='1' cy='2.1' r='0.85' fill='%23faf8f5'/></svg>";

type Case = { name: string; label: string; status?: 'outside' | 'gone' | 'unknown'; self?: boolean; href?: string; avatar?: { name: string; src?: string }; html: string };

// 右の列は、利用側が HTML に書く形。
const cases: Case[] = [
  { name: 'member', label: '@aki', avatar: { name: 'aki' },
    html: '<span class="koyori-mention koyori-mention-member"><span class="koyori-mention-avatar" data-initials="a" aria-hidden="true"></span><span class="koyori-mention-label">@aki</span></span>' },
  { name: 'member（画像・リンク）', label: '@taro', href: '#', avatar: { name: 'taro', src: photo },
    html: `<a class="koyori-mention koyori-mention-member" href="#"><span class="koyori-mention-avatar" data-initials="t" aria-hidden="true"><img src="${photo}" alt=""></span><span class="koyori-mention-label">@taro</span></a>` },
  { name: 'self', label: '@aki', self: true, avatar: { name: 'aki' },
    html: '<span class="koyori-mention koyori-mention-member koyori-mention-self"><span class="koyori-mention-avatar" data-initials="a" aria-hidden="true"></span><span class="koyori-mention-label">@aki</span></span>' },
  { name: 'outside', label: '@hanako', status: 'outside', avatar: { name: 'hanako' },
    html: '<span class="koyori-mention koyori-mention-outside"><span class="koyori-mention-avatar" data-initials="h" aria-hidden="true"></span><span class="koyori-mention-label">@hanako</span></span>' },
  { name: 'gone', label: '@（退会した利用者）', status: 'gone',
    html: '<span class="koyori-mention koyori-mention-gone"><span class="koyori-mention-label">@（退会した利用者）</span></span>' },
  { name: 'unknown', label: '@（不明な利用者）', status: 'unknown',
    html: '<span class="koyori-mention koyori-mention-unknown"><span class="koyori-mention-label">@（不明な利用者）</span></span>' },
];

export default function MentionDemo() {
  return <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', gap: '12px 24px', alignItems: 'center', justifyContent: 'start' }}>
    <strong>状態</strong><strong>部品</strong><strong>固定 class の HTML</strong>
    {cases.map(item => <Fragment key={item.name}>
      <span>{item.name}</span>
      <span><Mention label={item.label} status={item.status} self={item.self} avatar={item.avatar} href={item.href} /></span>
      <span dangerouslySetInnerHTML={{ __html: item.html }} />
    </Fragment>)}
  </div>;
}
