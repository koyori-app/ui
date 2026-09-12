<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { Accordion, Avatar, Sidebar, SidebarLink } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const pages = [
  { href: '#sidebar-overview', label: '概要' },
  { href: '#sidebar-inbox', label: '受信トレイ', badge: '4' },
  { href: '#sidebar-tasks', label: '自分のタスク' },
  { href: '#sidebar-ui', label: 'Koyori UI' },
  { href: '#sidebar-website', label: 'Web サイト' },
];
const current = ref('#sidebar-ui');
const sync = () => { if (pages.some(page => page.href === location.hash)) current.value = location.hash; };
onMounted(() => { sync(); window.addEventListener('hashchange', sync); });
onUnmounted(() => window.removeEventListener('hashchange', sync));
</script>

<template>
  <div style="height: 420px">
    <Sidebar label="サイドバーのデモ">
      <template #header><div style="display: flex; align-items: center; gap: 10px"><Avatar name="Koyori" /><strong>Koyori workspace</strong></div></template>
      <SidebarLink v-for="page in pages.slice(0, 3)" :key="page.href" v-bind="page" :current="current === page.href" />
      <Accordion id="vue-sidebar-projects" label="プロジェクト" default-open>
        <SidebarLink v-for="page in pages.slice(3)" :key="page.href" v-bind="page" :current="current === page.href" />
      </Accordion>
      <template #footer><div style="display: flex; align-items: center; gap: 10px"><Avatar name="Yupix" :size="28" /><span>Yupix</span></div></template>
    </Sidebar>
  </div>
</template>
