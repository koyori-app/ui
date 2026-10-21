import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Pagination, type PaginationRange } from './index';

const meta = {
  title: 'Components/Pagination',
  component: Pagination,
  parameters: { layout: 'padded' },
  args: { page: 1, pageSize: 20, total: 120 },
  render: args => <div style={{ width: 480 }}><Pagination {...args} /></div>,
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ページは親が持つ。押してもフォーカスはボタンに残り、範囲の文が読まれる。 */
function DefaultExample() {
  const [page, setPage] = useState(1);
  return (
    <div style={{ width: 480 }}>
      <Pagination page={page} pageSize={20} total={120} onPageChange={setPage} />
    </div>
  );
}

export const Default: Story = { render: () => <DefaultExample /> };

export const FirstPage: Story = {};
export const LastPage: Story = { args: { page: 6 } };
export const Empty: Story = { args: { total: 0 } };

/* カーソル式で総件数が分からないときは範囲を出さず、次へは hasNext に従う。 */
function UnknownTotalExample() {
  const [page, setPage] = useState(1);
  return (
    <div style={{ display: 'grid', gap: 8, width: 480 }}>
      <output>{page} ページ目</output>
      <Pagination page={page} pageSize={20} hasNext={page < 4} onPageChange={setPage} />
    </div>
  );
}

export const UnknownTotal: Story = { render: () => <UnknownTotalExample /> };

/* 取得中もボタンは残して aria-disabled にし、範囲に aria-busy を付ける。 */
export const Loading: Story = { args: { page: 2, loading: true } };

export const CustomFormat: Story = {
  args: {
    page: 2,
    formatRange: (range: PaginationRange) => `全 ${range.total} 件中 ${range.from} 件目から ${range.to} 件目`,
  },
};
