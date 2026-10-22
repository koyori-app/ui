import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import { Pagination, type PaginationRange } from './index';

const meta = {
  title: 'Components/Pagination',
  component: Pagination,
  parameters: { layout: 'padded' },
  args: { page: 1, pageSize: 20, total: 120 },
  render: args => ({
    components: { Pagination },
    setup: () => ({ args }),
    template: '<div style="width: 640px"><Pagination v-bind="args" /></div>',
  }),
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ページは親が持つ。押してもフォーカスはボタンに残り、範囲の文が読まれる。 */
export const Default: Story = {
  render: () => ({
    components: { Pagination },
    setup: () => ({ page: ref(1) }),
    template: `<div style="width: 640px">
      <Pagination :page="page" :page-size="20" :total="120" :on-page-change="(next) => (page = next)" />
    </div>`,
  }),
};

/* ページが多いときは先頭・末尾と現在ページの前後を出し、間を省略記号にまとめる。 */
export const ManyPages: Story = {
  render: () => ({
    components: { Pagination },
    setup: () => ({ page: ref(5) }),
    template: `<div style="width: 640px">
      <Pagination :page="page" :page-size="20" :total="640" :on-page-change="(next) => (page = next)" hide-range />
    </div>`,
  }),
};

/* 狭い場所では前後に出すページ数を減らす。 */
export const FewerSiblings: Story = { args: { page: 16, total: 640, siblingCount: 1 } };

export const FirstPage: Story = {};
export const LastPage: Story = { args: { page: 6 } };
export const Empty: Story = { args: { total: 0 } };

/* カーソル式で総件数が分からないときは範囲を出さず、次へは hasNext に従う。 */
export const UnknownTotal: Story = {
  render: () => ({
    components: { Pagination },
    setup: () => ({ page: ref(1) }),
    template: `<div style="display: grid; gap: 8px; width: 640px">
      <output>{{ page }} ページ目</output>
      <Pagination :page="page" :page-size="20" :has-next="page < 4" :on-page-change="(next) => (page = next)" />
    </div>`,
  }),
};

/* 取得中もボタンは残して aria-disabled にし、範囲に aria-busy を付ける。 */
export const Loading: Story = { args: { page: 2, loading: true } };

export const CustomFormat: Story = {
  args: {
    page: 2,
    formatRange: (range: PaginationRange) => `全 ${range.total} 件中 ${range.from} 件目から ${range.to} 件目`,
  },
};
