import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, Checkbox, DataList, DataListRow, Picker, Dropdown, AvatarGroup, type DataListProps } from './index';

const columns = [{ id: 'selection', label: '選択', width: '3.5rem' }, { id: 'title', label: 'タイトル' }, { id: 'owner', label: '担当者', width: '9rem' }, { id: 'action', label: '操作', width: '10rem' }];
const people = [{ value: 'yupix', label: 'yupix' }, { value: 'sousuke', label: 'sousuke' }, { value: 'guest', label: 'ゲスト', disabled: true }];
function Example(args: DataListProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState('未実行');
  const [assignees, setAssignees] = useState<string[][]>([['yupix'], ['yupix']]);
  return <div>
    <DataList {...args}>
      {['設計を確認', '画面を実装'].map((title, index) => <DataListRow key={title} selected={selected.includes(title)}>
        <td><Checkbox label={`「${title}」を選択`} hideLabel checked={selected.includes(title)}
          onCheckedChange={checked => setSelected(current => checked ? [...current, title] : current.filter(value => value !== title))} /></td>
        <th scope="row">{title}</th>
        <td><Picker label={`${title}の担当者`} searchable={false} items={people} avatars selectionMode="multiple"
          selectedValues={assignees[index]} onSelectionChange={values => setAssignees(current => current.map((value, row) => row === index ? values : value))}
          trigger={assignees[index].length
            ? <AvatarGroup label="選択中の担当者" size={24} max={3} items={people.filter(person => assignees[index].includes(person.value)).map(person => ({ name: person.label }))} />
            : '未割り当て'} /></td>
        <td><Dropdown label={`${index + 1}件目の操作`} items={[{value:'copy',label:'コピー'}, {value:'archive',label:'アーカイブ'}]} onSelect={setResult} /></td>
      </DataListRow>)}
    </DataList>
    <p role="status">選択: {selected.join('、') || 'なし'} ／ 操作: {result}</p>
  </div>;
}
const meta = {
  title: 'Components/DataList', component: DataList,
  parameters: { layout: 'padded' },
  args: { id: 'list-default', label: '進行中', columns, count: 2, collapsible: true },
  render: args => <Example {...args} />,
} satisfies Meta<typeof DataList>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Collapsed: Story = { args: { defaultOpen: false } };
export const Plain: Story = { args: { collapsible: false } };
export const Empty: Story = { args: { status: 'empty', count: 0 } };
export const Loading: Story = { args: { status: 'loading', count: 0 }, render: args => <DataList {...args} /> };
export const LoadingMore: Story = { args: { status: 'loading', count: 20 } };
export const Error: Story = { args: { status: 'error', message: '一覧を取得できませんでした', count: 0 }, render: args => <DataList {...args} /> };
function RetryExample(args: DataListProps) {
  const [status, setStatus] = useState<DataListProps['status']>('error');
  return <DataList {...args} status={status} onRetry={() => setStatus('loading')} />;
}
export const Retry: Story = { render: args => <RetryExample {...args} /> };
function ControlledExample(args: DataListProps) {
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState(false);
  return <div><Button label="外側から閉じる" onClick={() => setOpen(false)} />
    <DataList {...args} open={open} onOpenChange={setOpen}>
      <DataListRow selected={selected}><td><Checkbox label="下書きを選択" hideLabel checked={selected} onCheckedChange={setSelected} /></td><th scope="row">下書き</th><td><input aria-label="下書き" defaultValue="保持する内容" /></td><td>編集中</td></DataListRow>
    </DataList><output>{open ? '開いています' : '閉じています'}</output></div>;
}
export const Controlled: Story = { render: args => <ControlledExample {...args} /> };
export const Groups: Story = { render: args => <div style={{ display: 'grid', gap: 16 }}><Example {...args} /><DataList {...args} id="list-done" label="完了" count={0} status="empty" /></div> };
export const Narrow: Story = { render: args => <div style={{ width: 280 }}><Example {...args} /></div> };
export const LongTitle: Story = { args: { label: '長い名前のプロジェクトで進めている作業の一覧' } };
export const NoColumns: Story = { args: { columns: [], status: 'empty', count: 0 } };

/* ここからソート。並び替え自体は利用側が行う。 */
const sortColumns = [{ id: 'title', label: 'タイトル', sortable: true }, { id: 'owner', label: '担当者', width: '9rem', sortable: true }, { id: 'updated', label: '更新日', width: '8rem' }];
const tasks = [
  { title: '設計を確認', owner: 'sousuke', updated: '2026-04-03' },
  { title: '画面を実装', owner: 'yupix', updated: '2026-04-01' },
  { title: 'レビューを受ける', owner: 'guest', updated: '2026-04-02' },
];

function sorted(sort: DataListProps['sort']) {
  if (!sort) return tasks;
  const key = sort.columnId as 'title' | 'owner';
  const order = sort.direction === 'ascending' ? 1 : -1;
  return [...tasks].sort((a, b) => a[key].localeCompare(b[key], 'ja') * order);
}

function SortableExample(args: DataListProps) {
  const [sort, setSort] = useState<DataListProps['sort']>({ columnId: 'title', direction: 'ascending' });
  return <div>
    <DataList {...args} columns={sortColumns} sort={sort} onSortChange={setSort}>
      {sorted(sort).map(task => <DataListRow key={task.title}>
        <th scope="row">{task.title}</th>
        <td>{task.owner}</td>
        <td>{task.updated}</td>
      </DataListRow>)}
    </DataList>
    <p role="status">並び順: {sort ? `${sort.columnId} / ${sort.direction}` : 'なし'}</p>
  </div>;
}

export const Sortable: Story = { render: args => <SortableExample {...args} /> };

/* 同じ columns と sort を渡すと、複数のグループで表示がそろう。 */
function TwoGroupsExample(args: DataListProps) {
  const [sort, setSort] = useState<DataListProps['sort']>(null);
  const rows = (ids: string[]) => sorted(sort).filter(task => ids.includes(task.title)).map(task => (
    <DataListRow key={task.title}>
      <th scope="row">{task.title}</th>
      <td>{task.owner}</td>
      <td>{task.updated}</td>
    </DataListRow>
  ));
  return <div style={{ display: 'grid', gap: 16 }}>
    <DataList {...args} id="sort-group-doing" label="進行中" columns={sortColumns} sort={sort} onSortChange={setSort}>
      {rows(['設計を確認', '画面を実装'])}
    </DataList>
    <DataList {...args} id="sort-group-done" label="完了" columns={sortColumns} sort={sort} onSortChange={setSort}>
      {rows(['レビューを受ける'])}
    </DataList>
  </div>;
}

export const TwoGroups: Story = { render: args => <TwoGroupsExample {...args} /> };
