<script setup lang="ts">
import { ref } from 'vue';
import { Button, CheckIcon, EllipsisIcon, MenuIcon, Sidebar, SidebarLink } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const open = ref(true);
const rail = ref(false);
</script>

<template>
  <div style="display: flex; gap: 12px; height: 320px">
    <Sidebar id="vue-collapsible-sidebar" label="開閉できるサイドバーのデモ" :open="open" :rail="rail"
      :on-rail-change="(next) => rail = next">
      <SidebarLink label="概要" href="#collapse-overview" current><template #icon><CheckIcon /></template></SidebarLink>
      <SidebarLink label="受信トレイ" href="#collapse-inbox" badge="4"><template #icon><EllipsisIcon /></template></SidebarLink>
      <SidebarLink label="自分のタスク" href="#collapse-tasks"><template #icon><CheckIcon /></template></SidebarLink>
    </Sidebar>
    <div style="flex: 1; min-width: 0">
      <Button ariaLabel="メニュー" variant="ghost" :aria-expanded="open" aria-controls="vue-collapsible-sidebar"
        :on-click="() => open = !open"><template #icon><MenuIcon /></template></Button>
      <p>端のつまみでアイコンだけの表示に、ハンバーガーで開閉できます。</p>
    </div>
  </div>
</template>
