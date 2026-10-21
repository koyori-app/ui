<script setup lang="ts">
import { computed, ref } from 'vue';
import { Pagination } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const tasks = Array.from({ length: 47 }, (_, index) => `タスク ${index + 1}`);
const pageSize = 10;
// ページはアプリが持つ。実際のアプリでは URL のクエリと同期することが多い。
const page = ref(1);
const visible = computed(() => tasks.slice((page.value - 1) * pageSize, page.value * pageSize));
</script>

<template>
  <div style="display: grid; gap: 12px; max-width: 480px">
    <ul style="margin: 0">
      <li v-for="task in visible" :key="task">{{ task }}</li>
    </ul>
    <Pagination :page="page" :page-size="pageSize" :total="tasks.length" :on-page-change="(next) => (page = next)" />
  </div>
</template>
