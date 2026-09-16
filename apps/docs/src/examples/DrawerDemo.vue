<script setup lang="ts">
import { ref } from 'vue';
import { Button, Drawer, MenuIcon, Sidebar, SidebarLink, XIcon, type DrawerProps } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const placements: { value: NonNullable<DrawerProps['placement']>; label: string }[] = [
  { value: 'left', label: '左' },
  { value: 'right', label: '右' },
  { value: 'top', label: '上' },
  { value: 'bottom', label: '下' },
];
const open = ref(false);
const placement = ref<DrawerProps['placement']>('left');

function show(value: DrawerProps['placement']) {
  placement.value = value;
  open.value = true;
}
</script>

<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px">
    <Button v-for="item in placements" :key="item.value" :label="`${item.label}から開く`" variant="secondary"
      :on-click="() => show(item.value)"><template #icon><MenuIcon /></template></Button>
    <Drawer :open="open" label="メニュー" :placement="placement" :on-close="() => open = false">
      <Sidebar label="メインナビゲーション">
        <template #header>
          <div style="display: flex; align-items: center; justify-content: space-between">
            <strong>Koyori workspace</strong>
            <Button ariaLabel="メニューを閉じる" variant="ghost" :on-click="() => open = false"><template #icon><XIcon /></template></Button>
          </div>
        </template>
        <SidebarLink label="概要" href="#drawer-overview" current />
        <SidebarLink label="受信トレイ" href="#drawer-inbox" badge="4" />
        <SidebarLink label="自分のタスク" href="#drawer-tasks" />
      </Sidebar>
    </Drawer>
  </div>
</template>
