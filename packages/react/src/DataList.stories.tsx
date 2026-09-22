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

/* ここから追加読み込み。取得と件数はアプリ側が持つ。 */
const moreColumns = [{ id: 'title', label: 'タイトル' }, { id: 'owner', label: '担当者', width: '9rem' }];
const allRows = ['1件目', '2件目', '3件目', '4件目', '5件目', '6件目'];

function MoreRows({ count }: { count: number }) {
  return <>{allRows.slice(0, count).map(title => (
    <DataListRow key={title}><th scope="row">{title}</th><td>yupix</td></DataListRow>
  ))}</>;
}

function LoadMoreExample(args: DataListProps) {
  const [count, setCount] = useState(2);
  const [loading, setLoading] = useState(false);
  const [calls, setCalls] = useState(0);
  const load = () => {
    setCalls(value => value + 1);
    setLoading(true);
    setTimeout(() => { setCount(value => Math.min(value + 2, allRows.length)); setLoading(false); }, 800);
  };
  return <div>
    <DataList {...args} columns={moreColumns} count={allRows.length}
      hasMore={count < allRows.length} loadingMore={loading} onLoadMore={load}>
      <MoreRows count={count} />
    </DataList>
    <p>読み込み要求: <output>{calls}</output></p>
  </div>;
}

export const LoadMore: Story = { render: args => <LoadMoreExample {...args} /> };

/* 2 ページ目で失敗し、再試行で成功する。行はそのまま残る。 */
function LoadMoreErrorExample(args: DataListProps) {
  const [count, setCount] = useState(2);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tried, setTried] = useState(false);
  const load = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (!tried) { setTried(true); setFailed(true); return; }
      setFailed(false);
      setCount(value => Math.min(value + 2, allRows.length));
    }, 800);
  };
  return <DataList {...args} columns={moreColumns} count={allRows.length}
    status={failed ? 'error' : 'ready'} message="次のページを取得できませんでした" onRetry={load}
    hasMore loadingMore={loading} onLoadMore={load}>
    <MoreRows count={count} />
  </DataList>;
}

export const LoadMoreError: Story = { render: args => <LoadMoreErrorExample {...args} /> };

/* 候補が 0 件なら、追加読み込みのボタンは出さず空の表示だけにする。 */
export const LoadMoreEmpty: Story = {
  args: { columns: moreColumns, status: 'empty', count: 0, hasMore: true },
  render: args => <DataList {...args} onLoadMore={() => {}} />,
};
