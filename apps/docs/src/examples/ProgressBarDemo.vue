<script setup lang="ts">
import { ref } from 'vue';
import { Checkbox, ProgressBar } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const items = ['要件を書く', 'デザインを決める', '実装する', 'レビューを受ける', '公開する'];
const done = ref<string[]>([items[0]]);

function toggle(item: string, checked: boolean) {
  done.value = checked ? [...done.value, item] : done.value.filter(name => name !== item);
}
</script>

<template>
  <div style="display: grid; gap: 12px; max-width: 360px">
    <ProgressBar label="チェックリストの達成率" :value="done.length" :max="items.length"
      :value-text="`${done.length} / ${items.length} 件`" />
    <Checkbox v-for="item in items" :key="item" :label="item" :checked="done.includes(item)"
      :on-checked-change="(checked) => toggle(item, checked)" />
  </div>
</template>
