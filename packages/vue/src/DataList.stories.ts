import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import { Button, Checkbox, DataList, DataListRow, Picker, Dropdown, AvatarGroup, type DataListProps } from './index';

const columns = [{ id: 'selection', label: '選択', width: '3.5rem' }, { id: 'title', label: 'タイトル' }, { id: 'owner', label: '担当者', width: '9rem' }, { id: 'action', label: '操作', width: '10rem' }];
const example = (args: DataListProps) => ({
  components: { Button, Checkbox, DataList, DataListRow, Picker, Dropdown, AvatarGroup },
  setup: () => ({ args, selected: ref<string[]>([]), result: ref('未実行'), assignees: ref<string[][]>([['yupix'], ['yupix']]), titles: ['設計を確認', '画面を実装'], people: [{ value: 'yupix', label: 'yupix' }, { value: 'sousuke', label: 'sousuke' }, { value: 'guest', label: 'ゲスト', disabled: true }] }),
  template: `<div><DataList v-bind="args">
    <DataListRow v-for="(title, index) in titles" :key="title" :selected="selected.includes(title)">
      <td><Checkbox :label="'「' + title + '」を選択'" hide-label :checked="selected.includes(title)"
        :on-checked-change="checked => selected = checked ? [...selected, title] : selected.filter(value => value !== title)" /></td>
      <th scope="row">{{ title }}</th>
      <td><Picker :label="title + 'の担当者'" :searchable="false" :items="people" avatars selection-mode="multiple"
        :selected-values="assignees[index]" :on-selection-change="values => assignees[index] = values">
        <template #trigger>
          <AvatarGroup v-if="assignees[index].length" label="選択中の担当者" :size="24" :max="3"
            :items="people.filter(person => assignees[index].includes(person.value)).map(person => ({ name: person.label }))" />
          <template v-else>未割り当て</template>
        </template>
      </Picker></td>
      <td><Dropdown :label="(index + 1) + '件目の操作'" :items="[{ value: 'copy', label: 'コピー' }, { value: 'archive', label: 'アーカイブ' }]" :on-select="value => result = value" /></td>
    </DataListRow>
  </DataList><p role="status">選択: {{ selected.join('、') || 'なし' }} ／ 操作: {{ result }}</p></div>`,
});
const meta = {
  title: 'Components/DataList', component: DataList,
  parameters: { layout: 'padded' },
  args: { id: 'list-default', label: '進行中', columns, count: 2, collapsible: true },
  render: example,
} satisfies Meta<typeof DataList>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Collapsed: Story = { args: { defaultOpen: false } };
export const Plain: Story = { args: { collapsible: false } };
export const Empty: Story = { args: { status: 'empty', count: 0 } };
export const Loading: Story = { args: { status: 'loading', count: 0 }, render: args => ({ components: { DataList }, setup: () => ({args}), template: '<DataList v-bind="args" />' }) };
export const LoadingMore: Story = { args: { status: 'loading', count: 20 } };
export const Error: Story = { args: { status: 'error', message: '一覧を取得できませんでした', count: 0 }, render: args => ({ components: { DataList }, setup: () => ({args}), template: '<DataList v-bind="args" />' }) };
export const Retry: Story = { render: args => ({ components: { DataList }, setup: () => ({args, status: ref<DataListProps['status']>('error')}), template: `<DataList v-bind="args" :status="status" :on-retry="() => status = 'loading'" />` }) };
export const Controlled: Story = { render: args => ({
  components: { Button, Checkbox, DataList, DataListRow }, setup: () => ({args, open: ref(true), selected: ref(false)}),
  template: `<div><Button label="外側から閉じる" :on-click="() => open = false" />
    <DataList v-bind="args" :open="open" :on-open-change="value => open = value">
      <DataListRow :selected="selected"><td><Checkbox label="下書きを選択" hide-label :checked="selected" :on-checked-change="value => selected = value" /></td><th scope="row">下書き</th><td><input aria-label="下書き" value="保持する内容" /></td><td>編集中</td></DataListRow>
    </DataList><output>{{ open ? '開いています' : '閉じています' }}</output></div>`,
}) };
export const Groups: Story = { render: args => ({ components: { Example: example(args), DataList }, setup: () => ({args}), template: '<div style="display: grid; gap: 16px"><Example /><DataList v-bind="args" id="list-done" label="完了" :count="0" status="empty" /></div>' }) };
export const Narrow: Story = { render: args => ({ components: { Example: example(args) }, template: '<div style="width: 280px"><Example /></div>' }) };
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

const sortRows = `<DataListRow v-for="task in rows(titles)" :key="task.title">
  <th scope="row">{{ task.title }}</th><td>{{ task.owner }}</td><td>{{ task.updated }}</td>
</DataListRow>`;

export const Sortable: Story = {
  render: args => ({
    components: { DataList, DataListRow },
    setup() {
      const sort = ref<DataListProps['sort']>({ columnId: 'title', direction: 'ascending' });
      return { args, sortColumns, sort, sorted, change: (next: DataListProps['sort']) => { sort.value = next; } };
    },
    template: `<div>
      <DataList v-bind="args" :columns="sortColumns" :sort="sort" :on-sort-change="change">
        <DataListRow v-for="task in sorted(sort)" :key="task.title">
          <th scope="row">{{ task.title }}</th><td>{{ task.owner }}</td><td>{{ task.updated }}</td>
        </DataListRow>
      </DataList>
      <p role="status">並び順: {{ sort ? sort.columnId + ' / ' + sort.direction : 'なし' }}</p>
    </div>`,
  }),
};

/* ここから追加読み込み。取得と件数はアプリ側が持つ。 */
const moreColumns = [{ id: 'title', label: 'タイトル' }, { id: 'owner', label: '担当者', width: '9rem' }];
const allRows = ['1件目', '2件目', '3件目', '4件目', '5件目', '6件目'];
const moreRows = `<DataListRow v-for="title in allRows.slice(0, count)" :key="title">
  <th scope="row">{{ title }}</th><td>yupix</td>
</DataListRow>`;

export const LoadMore: Story = {
  render: args => ({
    components: { DataList, DataListRow },
    setup() {
      const count = ref(2);
      const loading = ref(false);
      const calls = ref(0);
      const load = () => {
        calls.value += 1;
        loading.value = true;
        setTimeout(() => { count.value = Math.min(count.value + 2, allRows.length); loading.value = false; }, 800);
      };
      return { args, moreColumns, allRows, count, loading, calls, load };
    },
    template: `<div>
      <DataList v-bind="args" :columns="moreColumns" :count="allRows.length"
        :has-more="count < allRows.length" :loading-more="loading" :on-load-more="load">
        ${moreRows}
      </DataList>
      <p>読み込み要求: <output>{{ calls }}</output></p>
    </div>`,
  }),
};

/* 同じ columns と sort を渡すと、複数のグループで表示がそろう。 */
export const TwoGroups: Story = {
  render: args => ({
    components: { DataList, DataListRow },
    setup() {
      const sort = ref<DataListProps['sort']>(null);
      const rows = (titles: string[]) => sorted(sort.value).filter(task => titles.includes(task.title));
      return { args, sortColumns, sort, rows, change: (next: DataListProps['sort']) => { sort.value = next; } };
    },
    template: `<div style="display: grid; gap: 16px">
      <DataList v-bind="args" id="sort-group-doing" label="進行中" :columns="sortColumns" :sort="sort" :on-sort-change="change">
        ${sortRows.replace('titles', "['設計を確認', '画面を実装']")}
      </DataList>
      <DataList v-bind="args" id="sort-group-done" label="完了" :columns="sortColumns" :sort="sort" :on-sort-change="change">
        ${sortRows.replace('titles', "['レビューを受ける']")}
      </DataList>
    </div>`,
  }),
};
/* 2 ページ目で失敗し、再試行で成功する。行はそのまま残る。 */
export const LoadMoreError: Story = {
  render: args => ({
    components: { DataList, DataListRow },
    setup() {
      const count = ref(2);
      const loading = ref(false);
      const failed = ref(false);
      const tried = ref(false);
      const load = () => {
        loading.value = true;
        setTimeout(() => {
          loading.value = false;
          if (!tried.value) { tried.value = true; failed.value = true; return; }
          failed.value = false;
          count.value = Math.min(count.value + 2, allRows.length);
        }, 800);
      };
      return { args, moreColumns, allRows, count, loading, failed, load };
    },
    template: `<DataList v-bind="args" :columns="moreColumns" :count="allRows.length"
      :status="failed ? 'error' : 'ready'" message="次のページを取得できませんでした" :on-retry="load"
      :has-more="true" :loading-more="loading" :on-load-more="load">
      ${moreRows}
    </DataList>`,
  }),
};

/* 候補が 0 件なら、追加読み込みのボタンは出さず空の表示だけにする。 */
export const LoadMoreEmpty: Story = {
  args: { columns: moreColumns, status: 'empty', count: 0, hasMore: true },
  render: args => ({ components: { DataList }, setup: () => ({ args }), template: '<DataList v-bind="args" :on-load-more="() => {}" />' }),
};
