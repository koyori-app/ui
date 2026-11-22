import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import { Tree, type TreeNode } from './index';

// ファイルの木。行の右に指摘の件数（解決 / 全体）を出す。
const files: TreeNode[] = [
  { id: 'lib', label: 'apps/frontend/src/lib', children: [
    { id: 'state', label: 'task-list-url-state.ts', badge: { label: '2 / 3', tone: 'danger' } },
    { id: 'url', label: 'task-list-url.ts', badge: { label: '2 / 4', tone: 'danger' } },
    { id: 'url-test', label: 'task-list-url.test.ts', badge: { label: '2 / 2', tone: 'success' } },
  ] },
  { id: 'composables', label: 'apps/frontend/src/composables', children: [
    { id: 'use-url', label: 'useTaskListUrl.ts', badge: { label: '0 / 1', tone: 'danger' } },
  ] },
  { id: 'pages', label: '…/projects/@projectKey/tasks', title: 'apps/frontend/src/pages/projects/@projectKey/tasks', children: [
    { id: 'page', label: '+Page.vue', badge: { label: '0 / 1', tone: 'danger' } },
  ] },
];

const meta = {
  title: 'Components/Tree', component: Tree,
  parameters: { layout: 'padded' },
  args: { label: 'ファイル', heading: 'ファイル · 5', nodes: files, leafIcon: 'file' },
  argTypes: { leafIcon: { control: 'radio', options: ['file', 'none'] } },
  render: args => ({
    components: { Tree },
    setup: () => ({ args, selected: ref<string | null>('state') }),
    template: `<div style="width: 240px">
      <Tree v-bind="args" :selected-id="selected" :on-select="id => selected = id" />
      <output aria-label="選択中">{{ selected }}</output>
    </div>`,
  }),
} satisfies Meta<typeof Tree>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
// 最初は 1 つ目の節だけを開く。
export const PartlyCollapsed: Story = { args: { defaultExpandedIds: ['lib'] } };
export const WithoutIcon: Story = { args: { leafIcon: 'none', heading: undefined } };
export const Disabled: Story = {
  args: {
    heading: undefined,
    nodes: [
      { id: 'open', label: '開ける節', children: [{ id: 'leaf', label: '選べる葉' }, { id: 'off', label: '選べない葉', disabled: true }] },
      { id: 'locked', label: '開けない節', disabled: true, children: [{ id: 'hidden', label: '隠れた葉' }] },
    ],
    defaultExpandedIds: ['open'],
  },
};
// 開閉を外から持つ。
export const ControlledExpansion: Story = {
  render: args => ({
    components: { Tree },
    setup: () => ({ args, expanded: ref<string[]>(['composables']) }),
    template: `<div style="width: 240px">
      <button type="button" @click="expanded = []">すべて閉じる</button>
      <Tree v-bind="args" :expanded-ids="expanded" :on-expanded-change="ids => expanded = ids" />
      <output aria-label="開いている節">{{ expanded.join(',') }}</output>
    </div>`,
  }),
};
// 節が後から届く（非同期の読み込み・絞り込みの変更）。開閉を指定しなければ、届いた節も開いて出す。
export const LateNodes: Story = {
  render: args => ({
    components: { Tree },
    setup: () => ({ args, files, nodes: ref<TreeNode[]>(files.slice(0, 1)) }),
    template: `<div style="width: 240px">
      <button type="button" @click="nodes = files">残りを読み込む</button>
      <button type="button" @click="nodes = files.slice(0, 1)">最初の節だけにする</button>
      <Tree v-bind="args" :nodes="nodes" />
    </div>`,
  }),
};
