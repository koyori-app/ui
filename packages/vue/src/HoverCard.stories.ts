import { ref } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
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

const ProfileCard = {
  components: { Avatar },
  props: { name: { type: String, required: true } },
  template: `<div>
    <div class="demo-card-head">
      <Avatar :name="name" :size="40" />
      <div><div class="demo-card-name">{{ name }}</div><div class="demo-card-meta">デザイナー · プロダクト部 · UI チーム</div></div>
    </div>
    <div class="demo-card-body"><div class="demo-card-bio">画面と部品のデザインを担当しています。Figma のファイルはプロジェクトの資料にあります。</div></div>
    <div class="demo-card-foot"><a :href="'#profile-' + name">プロフィールを見る →</a><span class="demo-card-hint">Esc で閉じる</span></div>
  </div>`,
};

// onOpenChange の呼ばれ方を story の中に出す。検査はこの出力を読む。
const useLog = () => {
  const log = ref<string[]>([]);
  return { log, record: (open: boolean, trigger: HTMLElement) => log.value.push(`${open ? 'open' : 'close'}:${trigger.dataset.user}`) };
};

const meta = {
  title: 'Components/HoverCard',
  component: HoverCard,
  parameters: { layout: 'padded' },
  args: { label: 'hanako のプロフィール' },
  render: (args) => ({
    components: { HoverCard, ProfileCard },
    setup: () => ({ args, mounted: ref(true), ...useLog() }),
    template: `<div style="padding: 64px; max-width: 520px; line-height: 1.8">
      <button>前へ</button>
      <div style="margin: 1em 0">来週のレビューは <HoverCard v-if="mounted" v-bind="args" :on-open-change="record"><a class="demo-mention" href="#profile-hanako" data-user="hanako">@hanako</a><template #content><ProfileCard name="hanako" /></template></HoverCard> が担当します。</div>
      <button>次へ</button> <button @click="mounted = false">HoverCard を破棄</button>
      <output data-testid="log" style="display: block">{{ log.join(' ') }}</output>
    </div>`,
  }),
} satisfies Meta<typeof HoverCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Open: Story = { args: { defaultOpen: true } };
export const OpenLight: Story = { args: { defaultOpen: true }, globals: { theme: 'light' } };
export const BottomEdge: Story = {
  args: { defaultOpen: true },
  render: (args) => ({
    components: { HoverCard, ProfileCard },
    setup: () => ({ args, ...useLog() }),
    template: `<div style="position: fixed; left: 64px; bottom: 32px">
      <HoverCard v-bind="args" :on-open-change="record"><a class="demo-mention" href="#profile-hanako" data-user="hanako">@hanako</a><template #content><ProfileCard name="hanako" /></template></HoverCard>
    </div>`,
  }),
};
export const ExternalTriggers: Story = {
  render: (args) => ({
    components: { HoverCard, ProfileCard },
    setup() {
      // 本文は v-html で描くため、札は Vue の部品ではない。container とセレクターで起点を渡す。
      const html = '<p style="margin: 0">レビューは <a class="demo-mention" href="#profile-hanako" data-user="hanako">@hanako</a> と <a class="demo-mention" href="#profile-yupix" data-user="yupix">@yupix</a> が見ます。退会した <a class="demo-mention" href="#left">@taro</a> の分は引き継ぎ済みです。</p>';
      const user = ref<string | null>(null);
      const { log, record } = useLog();
      return { args, html, body: ref<HTMLElement | null>(null), mounted: ref(true), user, log, change(open: boolean, trigger: HTMLElement) {
        user.value = open ? trigger.dataset.user ?? null : null;
        record(open, trigger);
      } };
    },
    template: `<div style="padding: 64px; max-width: 520px; line-height: 1.8">
      <button>前へ</button>
      <div ref="body" data-testid="body" v-html="html"></div>
      <HoverCard v-if="mounted" v-bind="args" label="メンションのプロフィール" :container="body" selector="a.demo-mention[data-user]" :on-open-change="change">
        <template #content><ProfileCard v-if="user" :name="user" /></template>
      </HoverCard>
      <button>次へ</button> <button @click="mounted = false">HoverCard を破棄</button>
      <output data-testid="log" style="display: block">{{ log.join(' ') }}</output>
    </div>`,
  }),
};
export const Growing: Story = {
  render: (args) => ({
    components: { HoverCard },
    setup: () => ({ args, rows: ref(0), ...useLog() }),
    template: `<div style="padding: 340px 64px 0">
      <HoverCard v-bind="args" :on-open-change="record"><a class="demo-mention" href="#profile-hanako" data-user="hanako">@hanako</a>
        <template #content><div class="demo-card-body" style="padding: 12px 14px"><p style="margin: 0">読み込み中…</p><p v-for="n in rows" :key="n" style="margin: 0">項目 {{ n }}</p></div></template>
      </HoverCard>
      <button @click="rows = 12">中身を増やす</button>
      <output data-testid="log" style="display: block">{{ log.join(' ') }}</output>
    </div>`,
  }),
};
export const InDialog: Story = {
  render: (args) => ({
    components: { HoverCard, ProfileCard },
    setup: () => ({ args, ...useLog() }),
    template: `<dialog id="hover-card-dialog" style="padding: 48px">
      <HoverCard v-bind="args" :on-open-change="record"><a class="demo-mention" href="#profile-hanako" data-user="hanako">@hanako</a><template #content><ProfileCard name="hanako" /></template></HoverCard>
      <button style="margin-left: 24px">次へ</button>
    </dialog>`,
  }),
};
