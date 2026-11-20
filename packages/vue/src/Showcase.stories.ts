import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import {
  Accordion, Alert, Avatar, AvatarGroup, Badge, Breadcrumb, Button, Calendar, Checkbox, CheckIcon, DataList, DataListRow,
  Dialog, Dropdown, EllipsisIcon, Field, Input, Meter, Pagination, ProgressBar, Sidebar, SidebarLink, Switch, TabPanel, Tabs, Tag,
  Textarea, Tooltip,
} from './index';

/* 部品をタスクアプリの 1 画面に並べ、配色・大きさ・動きをまとめて確かめる。 */
const meta = { title: 'Showcase/Task app', parameters: { layout: 'fullscreen' }, tags: ['!autodocs'] } satisfies Meta;
export default meta;

const status = { todo: ['未着手', 'var(--koyori-color-text-muted)'], doing: ['進行中', 'var(--koyori-color-info)'], review: ['レビュー', 'var(--koyori-color-warning)'], done: ['完了', 'var(--koyori-color-success)'] } as const;
const tasks = [
  { id: 'UI-41', title: 'トーストの通知を読み上げに対応させる', status: 'review', tag: 'アクセシビリティ', people: ['yupix', 'sousuke'], due: '11/12' },
  { id: 'UI-42', title: '配色のトークンを墨に置き換える', status: 'doing', tag: 'デザイン', people: ['yupix'], due: '11/14' },
  { id: 'UI-43', title: 'タブの選択を島で滑らせる', status: 'doing', tag: 'モーション', people: ['mina', 'yupix', 'ken'], due: '11/15' },
  { id: 'UI-44', title: 'ライトの配色でコントラストを確かめる', status: 'todo', tag: 'デザイン', people: ['sousuke'], due: '11/18' },
  { id: 'UI-45', title: 'DataList の並べ替えを docs に書く', status: 'done', tag: 'ドキュメント', people: ['ken'], due: '11/08' },
] as const;

export const Default: StoryObj = {
  render: () => ({
    components: {
      Accordion, Alert, Avatar, AvatarGroup, Badge, Breadcrumb, Button, Calendar, Checkbox, CheckIcon, DataList, DataListRow,
      Dialog, Dropdown, EllipsisIcon, Field, Input, Meter, Pagination, ProgressBar, Sidebar, SidebarLink, Switch, TabPanel, Tabs, Tag,
      Textarea, Tooltip,
    },
    setup() {
      const done = ref<string[]>(['UI-45']);
      return {
        tasks, status, done, view: ref('list'), page: ref(2), dialog: ref(false),
        toggle: (id: string, checked: boolean) => { done.value = checked ? [...done.value, id] : done.value.filter(value => value !== id); },
        columns: [{ id: 'done', label: '完了', width: '3rem' }, { id: 'title', label: 'タスク' }, { id: 'status', label: '状態', width: '7rem' }, { id: 'tag', label: 'タグ', width: '10rem' }, { id: 'people', label: '担当', width: '6rem' }, { id: 'due', label: '期限', width: '4.5rem' }, { id: 'more', label: '操作', width: '3.5rem' }],
        views: [{ value: 'list', label: 'リスト' }, { value: 'board', label: 'ボード' }, { value: 'calendar', label: 'カレンダー' }, { value: 'timeline', label: 'タイムライン' }],
      };
    },
    template: `<div style="display: flex; gap: 12px; box-sizing: border-box; min-height: 100vh; padding: 12px">
      <div style="position: sticky; top: 12px; height: calc(100vh - 24px); flex-shrink: 0">
        <Sidebar label="メインナビゲーション">
          <template #header><div style="display: flex; gap: 10px; align-items: center"><Avatar name="Koyori" :size="24" /><strong>Koyori</strong></div></template>
          <SidebarLink label="受信トレイ" href="#inbox" badge="4" />
          <SidebarLink label="自分のタスク" href="#tasks" current><template #icon><CheckIcon /></template></SidebarLink>
          <SidebarLink label="今日" href="#today" />
          <Accordion id="showcase-projects" label="プロジェクト" :heading-level="2" default-open>
            <SidebarLink label="Koyori UI" href="#ui" /><SidebarLink label="Web サイト" href="#web" /><SidebarLink label="モバイルアプリ" href="#mobile" />
          </Accordion>
          <template #footer><div style="display: flex; gap: 10px; align-items: center"><Avatar name="yupix" :size="24" /><span>yupix</span></div></template>
        </Sidebar>
      </div>

      <main style="flex: 1; min-width: 0; display: grid; align-content: start; gap: 20px; padding: 12px 16px 48px">
        <header style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px">
          <div style="flex: 1; min-width: 12rem">
            <Breadcrumb :items="[{ label: 'プロジェクト', href: '#projects' }, { label: 'Koyori UI', href: '#ui' }, { label: '自分のタスク' }]" />
            <h1 style="margin: 4px 0 0; font-size: 1.5rem; line-height: 2rem; font-weight: 600; letter-spacing: -0.02em">自分のタスク</h1>
          </div>
          <AvatarGroup label="メンバー" :size="28" :max="3" :items="[{ name: 'yupix' }, { name: 'sousuke' }, { name: 'mina' }, { name: 'ken' }]" />
          <Tooltip id="showcase-filter-tip" content="絞り込み  F"><Button label="絞り込み" variant="secondary" /></Tooltip>
          <Button label="タスクを追加" :on-click="() => dialog = true" />
        </header>

        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 16px">
          <Tabs id="showcase-views" label="表示形式" :items="views" :value="view" :on-value-change="next => view = next" style="flex: 1">
            <TabPanel v-for="item in views" :key="item.value" :value="item.value" style="padding: 0" />
          </Tabs>
          <div style="width: 220px"><ProgressBar label="今週の進み具合" :value="done.length" :max="tasks.length" :value-text="done.length + ' / ' + tasks.length + ' 件'" /></div>
        </div>

        <DataList id="showcase-list" label="今週" :columns="columns" :count="tasks.length" collapsible>
          <DataListRow v-for="task in tasks" :key="task.id" :selected="done.includes(task.id)">
            <td><Checkbox :label="'「' + task.title + '」を完了'" hide-label :checked="done.includes(task.id)" :on-checked-change="checked => toggle(task.id, checked)" /></td>
            <th scope="row"><span style="margin-inline-end: 8px; color: var(--koyori-color-text-muted); font-variant-numeric: tabular-nums">{{ task.id }}</span><span :style="done.includes(task.id) ? { color: 'var(--koyori-color-text-muted)', textDecoration: 'line-through' } : {}">{{ task.title }}</span></th>
            <td><Badge :label="status[task.status][0]" :dot-color="status[task.status][1]" /></td>
            <td><Tag :label="task.tag" /></td>
            <td><AvatarGroup :label="task.title + 'の担当者'" :size="24" :max="2" :items="task.people.map(name => ({ name }))" /></td>
            <td style="color: var(--koyori-color-text-secondary); font-variant-numeric: tabular-nums">{{ task.due }}</td>
            <td><Dropdown :aria-label="task.id + ' の操作'" :items="[{ value: 'edit', label: '編集' }, { value: 'copy', label: '複製' }, { value: 'delete', label: '削除', destructive: true }]"><template #icon><EllipsisIcon /></template></Dropdown></td>
          </DataListRow>
        </DataList>
        <Pagination :page="page" :page-size="5" :total="48" :on-page-change="next => page = next" />

        <section style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; align-items: start">
          <div class="koyori-card">
            <h2 class="koyori-card-heading">タスクの詳細</h2>
            <Field id="showcase-title" label="タイトル" required><Input value="配色のトークンを墨に置き換える" /></Field>
            <Field id="showcase-note" label="メモ" description="Markdown で書けます。"><Textarea placeholder="気づいたことを書く" /></Field>
            <Field id="showcase-estimate" label="見積もり" error="1 以上の数を入れてください"><Input value="0" /></Field>
            <Switch label="期限の前日に通知する" default-checked />
            <Switch label="完了したら自動でアーカイブ" />
            <Meter label="優先度" :value="2" value-text="中" />
            <div class="koyori-card-actions"><Button label="削除" variant="danger" /><Button label="キャンセル" variant="tertiary" /><Button label="保存" /></div>
          </div>
          <div style="display: grid; gap: 8px">
            <Alert variant="info" message="3 件のタスクが今日期限です。" />
            <Alert variant="success" message="「DataList の並べ替え」を完了にしました。" />
            <Alert variant="warning" message="見積もりのないタスクが 2 件あります。" />
            <Alert message="同期に失敗しました。" :on-retry="() => {}" />
            <div style="display: flex; flex-wrap: wrap; gap: 8px; padding-top: 8px">
              <Button label="Primary" /><Button label="Secondary" variant="secondary" /><Button label="Tertiary" variant="tertiary" /><Button label="Ghost" variant="ghost" /><Button label="Disabled" disabled />
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px">
              <Tag label="デザイン" dot-color="var(--koyori-color-info)" /><Tag label="バグ" dot-color="var(--koyori-color-danger)" /><Tag label="削除できる" :on-remove="() => {}" /><Badge label="12" /><Badge label="完了" dot-color="var(--koyori-color-success)" />
            </div>
          </div>
          <div class="koyori-card" style="justify-items: center"><Calendar label="期限" locale="ja-JP" today="2026-11-10" default-value="2026-11-14" /></div>
        </section>
      </main>

      <Dialog :open="dialog" title="タスクを追加" description="タイトルだけで作れます。あとから詳細を足せます。" :on-close="() => dialog = false">
        <Field id="showcase-new" label="タイトル"><Input placeholder="例: 請求書を送る" /></Field>
        <template #actions><Button label="キャンセル" variant="tertiary" :on-click="() => dialog = false" /><Button label="追加" :on-click="() => dialog = false" /></template>
      </Dialog>
    </div>`,
  }),
};
