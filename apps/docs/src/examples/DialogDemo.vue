<script setup lang="ts">
import { ref } from 'vue';
import { Button, ConfirmDialog, Dialog, Field, Input } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const editing = ref(false);
const deleting = ref(false);
const title = ref('請求書を送る');
const draft = ref('請求書を送る');
const result = ref('変更なし');

function openEditor() {
  draft.value = title.value;
  editing.value = true;
}

function save() {
  title.value = draft.value;
  editing.value = false;
  result.value = `「${title.value}」に変更しました`;
}

function remove() {
  deleting.value = false;
  result.value = `「${title.value}」を削除しました`;
}
</script>

<template>
  <div style="display: grid; gap: 12px; justify-items: start">
    <div style="display: flex; gap: 8px">
      <Button label="タスクを編集" :on-click="openEditor" />
      <Button label="タスクを削除" variant="danger" :on-click="() => deleting = true" />
    </div>

    <Dialog :open="editing" title="タスクを編集" description="タイトルを変更して保存します。"
      :on-close="() => editing = false">
      <Field id="dialog-task-title" label="タイトル">
        <Input :value="draft" :on-value-change="(value) => draft = value" />
      </Field>
      <template #actions>
        <Button label="キャンセル" variant="tertiary" :on-click="() => editing = false" />
        <Button label="保存" :on-click="save" />
      </template>
    </Dialog>

    <ConfirmDialog :open="deleting" title="タスクを削除しますか？" message="この操作は取り消せません。"
      confirm-label="削除する" destructive
      :on-cancel="() => deleting = false" :on-confirm="remove" />

    <p role="status">{{ result }}</p>
  </div>
</template>
