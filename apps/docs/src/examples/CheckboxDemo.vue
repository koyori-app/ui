<script setup lang="ts">
import { ref } from 'vue';
import { Checkbox } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';
const done = ref(false);
</script>

<template>
  <div style="display: grid; gap: 8px; justify-items: start">
    <Checkbox label="タスクを完了" :checked="done" :on-checked-change="value => done = value" />
    <Checkbox label="完了済み（変更不可）" checked disabled />
    <Checkbox label="TASK-140 を選択" hide-label />
    <p role="status">{{ done ? '完了しました' : '未完了です' }}</p>
  </div>
</template>
