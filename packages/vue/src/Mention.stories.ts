import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { Mention } from './index';

const meta = {
  title: 'Components/Mention',
  component: Mention,
  parameters: { layout: 'padded' },
  args: { label: '@taro' },
  argTypes: {
    status: { control: 'radio', options: ['member', 'outside', 'gone', 'unknown'] },
    self: { control: 'boolean' },
    href: { control: 'text' },
  },
  render: args => ({
    components: { Mention },
    setup: () => ({ args, surface }),
    template: '<div data-backdrop="surface" :style="surface.style"><Mention v-bind="args" /></div>',
  }),
} satisfies Meta<typeof Mention>;

export default meta;
type Story = StoryObj<typeof meta>;

/* Storybook は body に地を塗らない（React）ので、札は task の説明・コメントと同じ字の大きさ・行の高さと、地を塗った枠の中に置く。
   地なしの状態（外れた者など）は、枠の地の上でだけ対比が決まる。 */
const text = 'color: var(--koyori-color-text); font-size: 14px; line-height: 20px; padding: 12px 16px';
/* 説明の地。 */
const surface = { backdrop: 'surface', style: `${text}; background: var(--koyori-color-surface)` };
/* コメント（カード）の地。 */
const raised = { backdrop: 'surface-raised', style: `${text}; background: var(--koyori-color-surface-raised); border: 1px solid var(--koyori-color-border); border-radius: 8px` };
const frames = [surface, raised];

export const Playground: Story = { args: { label: '@taro' } };

type Case = { id: string; label: string; status?: 'outside' | 'gone' | 'unknown'; self?: boolean; html: string };

/* 部品の札と同じ並びの、固定 class を付けた素の HTML。 */
const cases: Case[] = [
  { id: 'member', label: '@taro',
    html: '<span class="koyori-mention koyori-mention-member"><span class="koyori-mention-label">@taro</span></span>' },
  { id: 'self', label: '@aki', self: true,
    html: '<span class="koyori-mention koyori-mention-member koyori-mention-self"><span class="koyori-mention-label">@aki</span></span>' },
  { id: 'outside', label: '@hanako', status: 'outside',
    html: '<span class="koyori-mention koyori-mention-outside"><span class="koyori-mention-label">@hanako</span></span>' },
  { id: 'gone', label: '@（退会した利用者）', status: 'gone',
    html: '<span class="koyori-mention koyori-mention-gone"><span class="koyori-mention-label">@（退会した利用者）</span></span>' },
  { id: 'unknown', label: '@（不明な利用者）', status: 'unknown',
    html: '<span class="koyori-mention koyori-mention-unknown"><span class="koyori-mention-label">@（不明な利用者）</span></span>' },
];

const columns = 'display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px';
const lightStyle = 'background: var(--koyori-color-surface); padding: 16px';

/* 状態ごとの札。左が説明の地、右がコメントの地。 */
export const States: Story = {
  render: () => ({
    components: { Mention },
    setup: () => ({ cases, frames, columns }),
    template: `<div :style="columns">
      <div v-for="frame in frames" :key="frame.backdrop" :data-backdrop="frame.backdrop" :style="frame.style">
        <p v-for="item in cases" :key="item.id" :data-case="item.id" style="margin: 0 0 8px">宛先 <Mention :label="item.label" :status="item.status" :self="item.self" /> を確認</p>
      </div>
    </div>`,
  }),
};

/* React の Storybook にはテーマ切り替えが無いため、明るい面はストーリーで撮る。 */
export const StatesLight: Story = {
  render: () => ({
    components: { Mention },
    setup: () => ({ cases, frames, columns, lightStyle }),
    template: `<div data-theme="light" :style="lightStyle">
      <div :style="columns">
        <div v-for="frame in frames" :key="frame.backdrop" :data-backdrop="frame.backdrop" :style="frame.style">
          <p v-for="item in cases" :key="item.id" :data-case="item.id" style="margin: 0 0 8px">宛先 <Mention :label="item.label" :status="item.status" :self="item.self" /> を確認</p>
        </div>
      </div>
    </div>`,
  }),
};

/* 利用側が HTML に書く形。States と同じ見た目になる。 */
export const FixedClassHtml: Story = {
  render: () => ({
    setup: () => ({ cases, frames, columns }),
    template: `<div :style="columns">
      <div v-for="frame in frames" :key="frame.backdrop" :data-backdrop="frame.backdrop" :style="frame.style">
        <p v-for="item in cases" :key="item.id" :data-case="item.id" style="margin: 0 0 8px">宛先 <span v-html="item.html"></span> を確認</p>
      </div>
    </div>`,
  }),
};

export const FixedClassHtmlLight: Story = {
  render: () => ({
    setup: () => ({ cases, frames, columns, lightStyle }),
    template: `<div data-theme="light" :style="lightStyle">
      <div :style="columns">
        <div v-for="frame in frames" :key="frame.backdrop" :data-backdrop="frame.backdrop" :style="frame.style">
          <p v-for="item in cases" :key="item.id" :data-case="item.id" style="margin: 0 0 8px">宛先 <span v-html="item.html"></span> を確認</p>
        </div>
      </div>
    </div>`,
  }),
};

/* リンクの札。Tab でフォーカスを受け、ホバーで下線が出る（外れた者のリンクは破線のまま）。 */
export const Link: Story = {
  render: () => ({
    components: { Mention },
    setup: () => ({ surface }),
    template: `<div data-backdrop="surface" :style="surface.style">
      <p style="margin: 0"><Mention label="@taro" href="#mention-taro" /> <Mention label="@aki" self href="#mention-aki" /> <Mention label="@hanako" status="outside" href="#mention-hanako" /></p>
    </div>`,
  }),
};

/* 札で行の高さを広げない。札のある行と無い行で段落の高さが同じ。 */
export const InText: Story = {
  render: () => ({
    components: { Mention },
    setup: () => ({ surface }),
    template: `<div data-backdrop="surface" :style="surface.style" style="display: grid; gap: 8px; width: 480px">
      <p data-testid="with" style="margin: 0">担当は <Mention label="@aki" /> さんです。</p>
      <p data-testid="without" style="margin: 0">担当は @aki さんです。</p>
    </div>`,
  }),
};
