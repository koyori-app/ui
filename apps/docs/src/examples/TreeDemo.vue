<script setup lang="ts">
import { ref } from 'vue';
import { Tree, type TreeNode } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

// 行の右の件数は「解決 / 全体」。何を赤にするかはアプリ側で決める。
const nodes: TreeNode[] = [
  { id: 'lib', label: 'src/lib', children: [
    { id: 'lib/state', label: 'list-state.ts', badge: { label: '2 / 3', tone: 'danger' } },
    { id: 'lib/url', label: 'list-url.ts', badge: { label: '2 / 2', tone: 'success' } },
  ] },
  { id: 'pages', label: '…/projects/@key/tasks', title: 'src/pages/projects/@key/tasks', children: [
    { id: 'pages/page', label: '+Page.vue', badge: { label: '0 / 1', tone: 'danger' } },
  ] },
];
const selected = ref<string | null>('lib/state');
</script>

<template>
  <div style="display: grid; gap: 12px; max-width: 260px">
    <Tree label="ファイル" heading="ファイル · 3" :nodes="nodes" leaf-icon="file"
      :selected-id="selected" :on-select="(id: string) => selected = id" />
    <p role="status">選択中: {{ selected }}</p>
  </div>
</template>
