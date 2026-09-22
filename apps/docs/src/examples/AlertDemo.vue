<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { Alert } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const status = ref<'idle' | 'error' | 'success'>('idle');
const submit = ref<HTMLButtonElement | null>(null);

// 閉じたあとのフォーカス先はアプリが決める。ここは操作の起点だった送信ボタン。
async function dismiss() {
  status.value = 'idle';
  await nextTick();
  submit.value?.focus();
}
</script>

<template>
  <div style="display: grid; gap: 12px; max-width: 460px">
    <button ref="submit" type="button" @click="status = 'error'">送信</button>
    <Alert v-if="status === 'error'" message="ネットワークに接続できず、送信できませんでした。"
      :on-retry="() => (status = 'success')" :on-dismiss="dismiss" />
    <Alert v-if="status === 'success'" variant="success" message="送信しました。" :on-dismiss="dismiss" />
  </div>
</template>
