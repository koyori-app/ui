<script setup lang="ts">
import { ref } from 'vue';
import { Tabs, TabPanel } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const view = ref('list');
const items = [{ value: 'list', label: 'リスト' }, { value: 'board', label: 'ボード' }];
</script>

<template>
  <Tabs id="vue-task-views" label="タスクの表示形式" :items="items" :value="view" :on-value-change="(value) => view = value">
    <TabPanel value="list"><p>タスクを行で並べる表示です。</p><input aria-label="リストの下書き" placeholder="切り替えても入力を保持します" /></TabPanel>
    <TabPanel value="board"><p>状態ごとにタスクを並べる表示です。</p></TabPanel>
  </Tabs>
</template>
