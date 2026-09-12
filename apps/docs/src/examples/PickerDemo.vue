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
</script>

<template>
  <div>
    <div style="display: flex; flex-wrap: wrap; gap: 12px">
      <Picker label="担当チーム" :items="items" />
      <Picker label="共有チーム" :items="items" selection-mode="multiple"
        :selected-values="teams" :on-selection-change="(values) => teams = values" />
      <Button label="共有チームをクリア" variant="ghost" @click="teams = []" />
    </div>
    <p role="status">共有: {{ items.filter((item) => teams.includes(item.value)).map((item) => item.label).join('、') || '未選択' }}</p>
  </div>
</template>
