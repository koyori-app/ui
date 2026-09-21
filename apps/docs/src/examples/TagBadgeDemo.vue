<script setup lang="ts">
import { ref } from 'vue';
import { Badge, Tag } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const initialLabels = ['デザイン', 'アクセシビリティ'];
const labels = ref([...initialLabels]);
const message = ref('');
const list = ref<HTMLDivElement | null>(null);
const reset = ref<HTMLButtonElement | null>(null);

function remove(label: string) {
  // 次、前、リセットの順にフォーカスを移してから、アプリ側で削除する。
  const buttons = list.value?.querySelectorAll('button');
  const index = labels.value.indexOf(label);
  (buttons?.[index + 1] ?? buttons?.[index - 1] ?? reset.value)?.focus();
  labels.value = labels.value.filter(value => value !== label);
  message.value = `${label}を削除しました`;
}
</script>

<template>
  <div style="display: grid; gap: 12px; justify-items: start">
    <p>ステータス: <Badge label="進行中" dot-color="var(--koyori-color-accent)" /> <Badge label="完了" dot-color="#23704b" size="md" /></p>
    <p>ラベル件数: <Badge :label="labels.length" /></p>
    <div ref="list" style="display: flex; flex-wrap: wrap; gap: 8px">
      <Tag v-for="label in labels" :key="label" :label="label" dot-color="var(--koyori-color-accent)" :on-remove="() => remove(label)" />
    </div>
    <button ref="reset" type="button" @click="labels = [...initialLabels]; message = 'ラベルを戻しました'">ラベルを戻す</button>
    <p role="status">{{ message }}</p>
    <Tag label="削除しないラベル" size="md" />
    <div style="width: 220px; max-width: 100%"><Tag label="リリース前に確認するアクセシビリティとキーボード操作" /></div>
  </div>
</template>
