<script setup lang="ts">
import { ref } from 'vue';
import { ContextMenu, IconRail, IconRailItem, IconRailSeparator } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const tenants = [
  { id: 'acme', label: 'Acme', emoji: '🏢' },
  { id: 'tea', label: 'お茶会', emoji: '🍵' },
  { id: 'yoshino', label: '𠮷野商店' },
];
const selected = ref('acme');
const menu = ref({ open: false, x: 0, y: 0, tenant: '' });
const message = ref('');
</script>

<template>
  <div style="display: flex; gap: 16px; height: 260px">
    <div style="display: flex; border-right: 1px solid var(--koyori-color-border)">
      <IconRail label="テナント">
        <IconRailItem v-for="tenant in tenants" :key="tenant.id" :id="`demo-rail-${tenant.id}`" :label="tenant.label" :emoji="tenant.emoji"
          :selected="selected === tenant.id" :on-click="() => (selected = tenant.id)"
          :menu-open="menu.open && menu.tenant === tenant.label"
          :on-menu="(position) => (menu = { open: true, ...position, tenant: tenant.label })" />
        <IconRailSeparator />
        <IconRailItem id="demo-rail-add" label="テナントを追加" variant="action" :on-click="() => (message = '追加を押しました')">
          <template #icon>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </template>
        </IconRailItem>
      </IconRail>
    </div>
    <p style="margin: 0">右クリック・長押しで項目のメニュー。{{ message }}</p>
    <ContextMenu label="テナントの操作" :open="menu.open" :x="menu.x" :y="menu.y"
      :items="[{ value: 'settings', label: '設定' }, { value: 'leave', label: '抜ける', destructive: true }]"
      :on-select="(value) => (message = `${menu.tenant}: ${value}`)" :on-close="() => (menu.open = false)" />
  </div>
</template>
