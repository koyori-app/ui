<script setup lang="ts">
import { ref } from 'vue';
import { Calendar } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const date = ref('2026-09-18');
const isWeekend = (value: string) => [0, 6].includes(new Date(`${value}T00:00:00Z`).getUTCDay());
</script>

<template>
  <div style="display: grid; gap: 12px; justify-items: start">
    <Calendar label="配送日" :value="date" :on-value-change="(value) => (date = value)" locale="ja-JP" today="2026-09-16"
      min="2026-09-16" max="2026-12-31" :is-date-disabled="isWeekend" />
    <p style="margin: 0">配送日: {{ date }}</p>
  </div>
</template>
