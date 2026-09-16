<script setup lang="ts">
import { ref } from 'vue';
import { ContextMenu, Dropdown, EllipsisIcon, contextMenuPosition, type ContextMenuItem } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const items: ContextMenuItem[] = [
  { value: 'edit', label: '編集' },
  { value: 'move', label: '移動', items: [
    { value: 'move-todo', label: '未着手' },
    { value: 'move-doing', label: '進行中' },
    { value: 'move-done', label: '完了' },
  ] },
  { value: 'duplicate', label: '複製' },
  { value: 'delete', label: '削除する', destructive: true },
];
const rows = ['請求書を送る', 'デザインを確認する'];

// Dropdown は階層を持たないので、代替のボタンには子を平らにして渡す。
const flat = items.flatMap(item => item.items ? item.items.map(child => ({ ...child, label: `${item.label}: ${child.label}` })) : [item]);
const labelOf = (value: string) => flat.find(item => item.value === value)?.label;
const menu = ref({ open: false, x: 0, y: 0, row: rows[0] });
const action = ref('未実行');

function openMenu(event: MouseEvent, row: string) {
  event.preventDefault();
  menu.value = { open: true, ...contextMenuPosition(event), row };
}

function run(value: string, row: string) {
  action.value = `${row}: ${labelOf(value)}`;
}
</script>

<template>
  <div style="display: grid; gap: 12px; justify-items: start">
    <div v-for="row in rows" :key="row" tabindex="0"
      style="display: flex; align-items: center; gap: 12px; width: 320px; padding: 12px; border: 1px solid var(--koyori-color-border); border-radius: 8px"
      @contextmenu="(event) => openMenu(event, row)"
    >
      <span style="flex: 1">{{ row }}</span>
      <Dropdown label="操作" :items="flat" :on-select="(value) => run(value, row)"><template #icon><EllipsisIcon /></template></Dropdown>
    </div>
    <ContextMenu :open="menu.open" :x="menu.x" :y="menu.y" label="タスクの操作" :items="items"
      :on-select="(value) => run(value, menu.row)" :on-close="() => menu.open = false" />
    <p role="status">{{ action }}</p>
  </div>
</template>
