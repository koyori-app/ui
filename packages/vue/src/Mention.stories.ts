import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { Mention } from './index';

const photo = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2 2'><rect width='2' height='2' fill='%23c4b5df'/><circle cx='1' cy='0.75' r='0.45' fill='%23faf8f5'/><circle cx='1' cy='2.1' r='0.85' fill='%23faf8f5'/></svg>";

const meta = {
  title: 'Components/Mention',
  component: Mention,
  parameters: { layout: 'padded' },
  args: { label: '@taro', avatar: { name: 'taro' } },
  argTypes: {
    status: { control: 'radio', options: ['member', 'outside', 'gone', 'unknown'] },
    self: { control: 'boolean' },
    href: { control: 'text' },
  },
  render: args => ({
    components: { Mention },
    setup: () => ({ args }),
    template: '<Mention v-bind="args" />',
  }),
} satisfies Meta<typeof Mention>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

type Case = { id: string; label: string; status?: 'outside' | 'gone' | 'unknown'; self?: boolean; avatar?: { name: string; src?: string }; html: string };

/* 部品の札と同じ並びの、固定 class を付けた素の HTML。 */
const cases: Case[] = [
  { id: 'member', label: '@aki', avatar: { name: 'aki' },
    html: '<span class="koyori-mention koyori-mention-member"><span class="koyori-mention-avatar" data-initials="a" aria-hidden="true"></span><span class="koyori-mention-label">@aki</span></span>' },
  { id: 'member-image', label: '@taro', avatar: { name: 'taro', src: photo },
    html: `<span class="koyori-mention koyori-mention-member"><span class="koyori-mention-avatar" data-initials="t" aria-hidden="true"><img src="${photo}" alt=""></span><span class="koyori-mention-label">@taro</span></span>` },
  { id: 'self', label: '@aki', self: true, avatar: { name: 'aki' },
    html: '<span class="koyori-mention koyori-mention-member koyori-mention-self"><span class="koyori-mention-avatar" data-initials="a" aria-hidden="true"></span><span class="koyori-mention-label">@aki</span></span>' },
  { id: 'outside', label: '@hanako', status: 'outside', avatar: { name: 'hanako' },
    html: '<span class="koyori-mention koyori-mention-outside"><span class="koyori-mention-avatar" data-initials="h" aria-hidden="true"></span><span class="koyori-mention-label">@hanako</span></span>' },
  { id: 'gone', label: '@jiro', status: 'gone', avatar: { name: 'jiro', src: photo },
    html: `<span class="koyori-mention koyori-mention-gone"><span class="koyori-mention-avatar" data-initials="j" aria-hidden="true"><img src="${photo}" alt=""></span><span class="koyori-mention-label">@jiro</span></span>` },
  { id: 'unknown', label: '@（不明な利用者）', status: 'unknown',
    html: '<span class="koyori-mention koyori-mention-unknown"><span class="koyori-mention-label">@（不明な利用者）</span></span>' },
];

const lightStyle = 'background: var(--koyori-color-surface); color: var(--koyori-color-text); padding: 16px';

/* 状態ごとの札。 */
export const States: Story = {
  render: () => ({
    components: { Mention },
    setup: () => ({ cases }),
    template: `<div style="display: grid; gap: 12px">
      <p v-for="item in cases" :key="item.id" :data-case="item.id" style="margin: 0">
        <Mention :label="item.label" :status="item.status" :self="item.self" :avatar="item.avatar" />
      </p>
    </div>`,
  }),
};

/* React の Storybook にはテーマ切り替えが無いため、明るい面はストーリーで撮る。 */
export const StatesLight: Story = {
  render: () => ({
    components: { Mention },
    setup: () => ({ cases, lightStyle }),
    template: `<div data-theme="light" :style="lightStyle">
      <div style="display: grid; gap: 12px">
        <p v-for="item in cases" :key="item.id" :data-case="item.id" style="margin: 0">
          <Mention :label="item.label" :status="item.status" :self="item.self" :avatar="item.avatar" />
        </p>
      </div>
    </div>`,
  }),
};

/* 利用側が HTML に書く形。States と同じ見た目になる。 */
export const FixedClassHtml: Story = {
  render: () => ({
    setup: () => ({ cases }),
    template: `<div style="display: grid; gap: 12px">
      <p v-for="item in cases" :key="item.id" :data-case="item.id" style="margin: 0" v-html="item.html"></p>
    </div>`,
  }),
};

export const FixedClassHtmlLight: Story = {
  render: () => ({
    setup: () => ({ cases, lightStyle }),
    template: `<div data-theme="light" :style="lightStyle">
      <div style="display: grid; gap: 12px">
        <p v-for="item in cases" :key="item.id" :data-case="item.id" style="margin: 0" v-html="item.html"></p>
      </div>
    </div>`,
  }),
};

/* リンクの札。Tab でフォーカスを受け、ホバーで下線が出る。 */
export const Link: Story = {
  render: () => ({
    components: { Mention },
    template: `<p style="margin: 0">
      <Mention label="@taro" href="#mention-taro" :avatar="{ name: 'taro' }" />
      <Mention label="@aki" self href="#mention-aki" :avatar="{ name: 'aki' }" />
    </p>`,
  }),
};

/* 札で行の高さを広げない。札のある行と無い行で段落の高さが同じ。 */
export const InText: Story = {
  render: () => ({
    components: { Mention },
    template: `<div style="display: grid; gap: 8px; width: 480px">
      <p data-testid="with" style="margin: 0">担当は <Mention label="@aki" :avatar="{ name: 'aki' }" /> さんです。</p>
      <p data-testid="without" style="margin: 0">担当は @aki さんです。</p>
    </div>`,
  }),
};
