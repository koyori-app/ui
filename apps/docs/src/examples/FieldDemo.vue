<script setup lang="ts">
import { ref } from 'vue';
import { Button, Field, Input, Textarea } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const title = ref('');
const note = ref('');
const error = ref('');
const result = ref('未送信');

function submit() {
  if (!title.value.trim()) {
    error.value = 'タイトルを入力してください。';
    result.value = '未送信';
    document.getElementById('vue-task-title')?.focus();
    return;
  }
  error.value = '';
  result.value = `「${title.value}」を作成しました`;
}
</script>

<template>
  <form novalidate style="display: grid; gap: 16px; max-width: 360px" @submit.prevent="submit">
    <Field id="vue-task-title" label="タイトル" required :error="error">
      <Input name="title" :value="title" autocomplete="off" :on-value-change="(value) => title = value" />
    </Field>
    <Field id="vue-task-note" label="メモ" description="担当者に共有したい補足を書きます。">
      <Textarea name="note" :rows="4" :value="note" :on-value-change="(value) => note = value" />
    </Field>
    <div><Button label="タスクを作成" type="submit" /></div>
    <p role="status">{{ result }}</p>
  </form>
</template>
