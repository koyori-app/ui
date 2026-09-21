<script setup lang="ts">
import { ref } from 'vue';
import { InlineEdit, Input, Textarea } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const title = ref('請求書を送る');
const draft = ref(title.value);
const editing = ref(false);
const saving = ref(false);
const error = ref('');
const note = ref('担当者と金額を確認する');
const noteDraft = ref(note.value);
const noteEditing = ref(false);

async function save() {
  if (!draft.value.trim()) { error.value = 'タイトルを入力してください。'; return; }
  error.value = '';
  saving.value = true;
  try {
    // 実際のアプリでは、ここでAPI更新を待つ。
    await new Promise(resolve => setTimeout(resolve, 600));
    if (draft.value.includes('失敗')) throw new Error('保存に失敗しました。内容を直して再試行してください。');
    title.value = draft.value;
    editing.value = false;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '保存に失敗しました。';
  } finally { saving.value = false; }
}
</script>

<template>
  <div style="display: grid; gap: 24px; max-width: 440px">
    <InlineEdit id="vue-inline-title" label="タイトル" :editing="editing" :saving="saving" :error="error"
      description="「失敗」を含めて保存すると、失敗時の動きを確認できます。" commit-on-blur
      :on-edit="() => { draft = title; error = ''; editing = true; }"
      :on-cancel="() => { draft = title; error = ''; editing = false; }" :on-commit="save">
      <template #display><strong>{{ title }}</strong></template>
      <Input :value="draft" :on-value-change="v => draft = v" />
    </InlineEdit>
    <InlineEdit id="vue-inline-note" label="メモ" :editing="noteEditing" multiline
      description="Enterで改行、Ctrl / Command + Enterで保存します。"
      :on-edit="() => { noteDraft = note; noteEditing = true; }"
      :on-cancel="() => { noteDraft = note; noteEditing = false; }"
      :on-commit="() => { note = noteDraft; noteEditing = false; }">
      <template #display>{{ note || 'メモを追加' }}</template>
      <Textarea :value="noteDraft" :on-value-change="v => noteDraft = v" />
    </InlineEdit>
  </div>
</template>
