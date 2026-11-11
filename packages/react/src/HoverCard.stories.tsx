import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar, HoverCard } from './index';

/* カードの中身は利用側の責務。ここでは Avatar とトークンで組んだ見本を使う。 */
const css = `
.demo-mention { padding: 0 4px; border-radius: 4px; background: var(--koyori-color-selection); color: var(--koyori-color-text); text-decoration: none; font-weight: 500; }
.demo-mention:focus-visible, .demo-card-foot a:focus-visible { outline: var(--koyori-focus-width) solid var(--koyori-focus-color); outline-offset: var(--koyori-focus-offset); }
.demo-card-head { display: flex; gap: 10px; align-items: center; padding: 12px 14px 10px; }
.demo-card-name { font-weight: 600; font-size: 15px; line-height: 20px; }
.demo-card-meta { color: var(--koyori-color-text-secondary); }
.demo-card-body { padding: 0 14px 12px; }
.demo-card-bio { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.demo-card-foot { display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; border-top: 1px solid var(--koyori-color-border); }
.demo-card-foot a { color: var(--koyori-color-text); font-weight: 500; font-size: 12.5px; text-decoration: none; }
.demo-card-foot a:hover { text-decoration: underline; }
.demo-card-hint { font-size: 11px; color: var(--koyori-color-text-muted); }
`;
if (typeof document !== 'undefined' && !document.getElementById('hover-card-story-css')) {
  const style = document.createElement('style');
  style.id = 'hover-card-story-css';
  style.textContent = css;
  document.head.append(style);
}

const ProfileCard = ({ name }: { name: string }) => <div>
  <div className="demo-card-head">
    <Avatar name={name} size={40} />
    <div><div className="demo-card-name">{name}</div><div className="demo-card-meta">デザイナー · プロダクト部 · UI チーム</div></div>
  </div>
  <div className="demo-card-body"><div className="demo-card-bio">画面と部品のデザインを担当しています。Figma のファイルはプロジェクトの資料にあります。</div></div>
  <div className="demo-card-foot"><a href={`#profile-${name}`}>プロフィールを見る →</a><span className="demo-card-hint">Esc で閉じる</span></div>
</div>;

// onOpenChange の呼ばれ方を story の中に出す。検査はこの出力を読む。
const useLog = () => {
  const [log, setLog] = useState<string[]>([]);
  return { log, record: (open: boolean, trigger: HTMLElement) => setLog(entries => [...entries, `${open ? 'open' : 'close'}:${trigger.dataset.user}`]) };
};
const Log = ({ log }: { log: string[] }) => <output data-testid="log" style={{ display: 'block' }}>{log.join(' ')}</output>;
const hanako = <a className="demo-mention" href="#profile-hanako" data-user="hanako">@hanako</a>;

const meta = {
  title: 'Components/HoverCard',
  component: HoverCard,
  parameters: { layout: 'padded' },
  args: { label: 'hanako のプロフィール' },
  // この Storybook には明暗の切り替えが無いため、story の parameters.theme で html[data-theme] を付ける（Vue 側の globals.theme と同じ結果）。
  decorators: [(Story, context) => {
    document.documentElement.dataset.theme = context.parameters.theme ?? 'dark';
    return <Story />;
  }],
  render: function Render(args) {
    const { log, record } = useLog();
    const [mounted, setMounted] = useState(true);
    return <div style={{ padding: 64, maxWidth: 520, lineHeight: 1.8 }}>
      <button>前へ</button>
      <p>来週のレビューは {mounted && <HoverCard {...args} onOpenChange={record} content={<ProfileCard name="hanako" />}>{hanako}</HoverCard>} が担当します。</p>
      <button>次へ</button> <button onClick={() => setMounted(false)}>HoverCard を破棄</button>
      <Log log={log} />
    </div>;
  },
} satisfies Meta<typeof HoverCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Open: Story = { args: { defaultOpen: true } };
export const OpenLight: Story = { args: { defaultOpen: true }, parameters: { theme: 'light' } };
export const BottomEdge: Story = {
  args: { defaultOpen: true },
  render: function Render(args) {
    const { record } = useLog();
    return <div style={{ position: 'fixed', left: 64, bottom: 32 }}>
      <HoverCard {...args} onOpenChange={record} content={<ProfileCard name="hanako" />}>{hanako}</HoverCard>
    </div>;
  },
};
export const ExternalTriggers: Story = {
  render: function Render(args) {
    // 本文は dangerouslySetInnerHTML で描くため、札は React の部品ではない。container とセレクターで起点を渡す。
    // ref.current は初回の描画では null なので、container は state で渡す。
    const [body, setBody] = useState<HTMLElement | null>(null);
    const [user, setUser] = useState<string | null>(null);
    const { log, record } = useLog();
    const html = '<p style="margin: 0">レビューは <a class="demo-mention" href="#profile-hanako" data-user="hanako">@hanako</a> と <a class="demo-mention" href="#profile-yupix" data-user="yupix">@yupix</a> が見ます。退会した <a class="demo-mention" href="#left">@taro</a> の分は引き継ぎ済みです。</p>';
    return <div style={{ padding: 64, maxWidth: 520, lineHeight: 1.8 }}>
      <button>前へ</button>
      <div ref={setBody} data-testid="body" dangerouslySetInnerHTML={{ __html: html }} />
      <HoverCard {...args} label="メンションのプロフィール" container={body} selector="a.demo-mention[data-user]"
        onOpenChange={(open, trigger) => { setUser(open ? trigger.dataset.user ?? null : null); record(open, trigger); }}
        content={user ? <ProfileCard name={user} /> : null} />
      <button>次へ</button>
      <Log log={log} />
    </div>;
  },
};
export const Growing: Story = {
  render: function Render(args) {
    const { log, record } = useLog();
    const [rows, setRows] = useState(0);
    return <div style={{ padding: '340px 64px 0' }}>
      <HoverCard {...args} onOpenChange={record} content={<div className="demo-card-body" style={{ padding: '12px 14px' }}>
        <p style={{ margin: 0 }}>読み込み中…</p>
        {Array.from({ length: rows }, (_, i) => <p key={i} style={{ margin: 0 }}>項目 {i + 1}</p>)}
      </div>}>{hanako}</HoverCard>
      <button onClick={() => setRows(12)}>中身を増やす</button>
      <Log log={log} />
    </div>;
  },
};
export const InDialog: Story = {
  render: function Render(args) {
    const { record } = useLog();
    return <dialog id="hover-card-dialog" style={{ padding: 48 }}>
      <HoverCard {...args} onOpenChange={record} content={<ProfileCard name="hanako" />}>{hanako}</HoverCard>
      <button style={{ marginLeft: 24 }}>次へ</button>
    </dialog>;
  },
};
