<script setup lang="ts">
import { ref } from 'vue';
import { Dropdown, Picker, EllipsisIcon } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const action = ref('未実行');
const status = ref<string[]>(['todo']);
const labels = ref<string[]>([]);
const statusItems = [
  { value: 'todo', label: '未着手' },
  { value: 'doing', label: '進行中' },
  { value: 'done', label: '完了' },
];
const labelItems = [
  { value: 'design', label: 'デザイン' },
  { value: 'frontend', label: 'フロントエンド' },
  { value: 'backend', label: 'バックエンド' },
];
</script>

<template>
  <div>
    <div style="display: flex; flex-wrap: wrap; gap: 12px">
      <Dropdown label="タスクの操作"
        :items="[{ value: 'copy', label: 'リンクをコピー' },
          { value: 'archive', label: 'アーカイブ', disabled: true }]"
        :on-select="(value) => action = value">
        <template #icon><EllipsisIcon :size="16" /></template>
      </Dropdown>
      <Picker label="ステータス" :items="statusItems" :searchable="false"
        selection-mode="single" :selected-values="status"
        :on-selection-change="(values) => status = values" />
      <Picker label="ラベル" :items="labelItems" :searchable="false"
        selection-mode="multiple" :selected-values="labels"
        :on-selection-change="(values) => labels = values" />
    </div>
    <p role="status">
      操作: {{ action }} ／ ステータス: {{ status.join(', ') || '未選択' }}
      ／ ラベル: {{ labels.join(', ') || '未選択' }}
    </p>
  </div>
</template>
