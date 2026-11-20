<script setup lang="ts">
import { ref } from 'vue';
import { Button, Picker } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const teams = ref<string[]>(['design']);
const items = [
  { value: 'design', label: 'デザイン' },
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend', label: 'Backend' },
  { value: 'review', label: 'レビュー' },
  { value: 'support', label: 'サポート', disabled: true },
];
const priorities = [
  { value: 'urgent', label: '緊急', icon: '#dc2626' },
  { value: 'high', label: '高', icon: '#f97316' },
  { value: 'medium', label: '中', icon: '#eab308' },
  { value: 'low', label: '低', icon: '#6b7280' },
  { value: 'none', label: '未設定' },
];
</script>

<template>
  <div>
    <div style="display: flex; flex-wrap: wrap; gap: 12px">
      <Picker label="担当チーム" :items="items" />
      <Picker label="共有チーム" :items="items" selection-mode="multiple"
        :selected-values="teams" :on-selection-change="(values) => teams = values" />
      <Picker label="優先度" :items="priorities" :searchable="false">
        <template #item-icon="{ item }">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"
            stroke-linecap="round" stroke-linejoin="round" :style="{ color: item.icon }"><path d="M3 14V2.5h9.5l-2 3 2 3H3" /></svg>
        </template>
      </Picker>
      <Button label="共有チームをクリア" variant="ghost" @click="teams = []" />
    </div>
    <p role="status">共有: {{ items.filter((item) => teams.includes(item.value)).map((item) => item.label).join('、') || '未選択' }}</p>
  </div>
</template>
