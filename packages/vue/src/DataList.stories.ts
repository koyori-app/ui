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
