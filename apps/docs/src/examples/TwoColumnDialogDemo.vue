<script setup lang="ts">
import { ref } from 'vue';
import { Button, Dialog, Field, Input, Picker, Textarea } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const priorities = [
  { value: 'high', label: '高' },
  { value: 'normal', label: '中' },
  { value: 'low', label: '低' },
];

const open = ref(false);
const title = ref('');
const result = ref('未作成');

function close() {
  open.value = false;
}

function submit() {
  open.value = false;
  result.value = title.value.trim() ? `「${title.value}」を作成しました` : 'タイトルが空のまま作成しました';
}
</script>

<template>
  <div class="task-form">
    <Button label="タスクを作成" :on-click="() => open = true" />

    <Dialog :open="open" plain title="新規タスク" description="KOY にタスクを追加します" :on-close="close">
      <form class="task-form__columns" @submit.prevent="submit">
        <div class="task-form__main">
          <input v-model="title" class="task-form__title" aria-label="タイトル（必須）" autofocus
            placeholder="タイトルを入力" />
          <div class="task-form__body">
            <Field id="task-description" label="説明">
              <Textarea :rows="8" placeholder="説明を入力" />
            </Field>
          </div>
          <div class="task-form__footer">
            <Button label="作成" type="submit" />
            <Button label="取り消す" variant="tertiary" :on-click="close" />
          </div>
        </div>

        <aside class="task-form__side">
          <div class="task-form__side-head">
            <Button aria-label="閉じる" variant="ghost" label="×" :on-click="close" />
          </div>
          <div class="task-form__props">
            <Field id="task-priority" label="優先度">
              <Picker label="中" :items="priorities" :searchable="false" />
            </Field>
            <Field id="task-due" label="期限">
              <Input type="text" placeholder="2026-09-30" />
            </Field>
            <Field id="task-estimate" label="見積もり（分）">
              <Input type="text" placeholder="60" />
            </Field>
          </div>
        </aside>
      </form>
    </Dialog>

    <p role="status">{{ result }}</p>
  </div>
</template>

<!-- 2 列のレイアウトはアプリ側の CSS で組む。ダイアログの幅と高さはトークンで指定する。 -->
<style>
.task-form { --koyori-dialog-width: 1040px; --koyori-dialog-height: min(720px, 90vh); }
.task-form__columns { display: flex; flex: 1; min-height: 0; }
.task-form__main { display: flex; flex: 1; flex-direction: column; min-width: 0; }
.task-form__title { box-sizing: border-box; width: 100%; padding: 16px 20px 8px; border: 0; border-bottom: 1px solid var(--koyori-color-border); background: transparent; color: inherit; font: inherit; font-size: 1.25rem; font-weight: 600; }
.task-form__title:focus-visible { outline: var(--koyori-focus-width) solid var(--koyori-focus-color); outline-offset: -2px; }
.task-form__body { display: flex; flex: 1; flex-direction: column; min-height: 0; overflow-y: auto; padding: 16px 20px; }
.task-form__footer { display: flex; gap: 8px; flex-shrink: 0; border-top: 1px solid var(--koyori-color-border); padding: 12px 20px; }
.task-form__side { display: flex; flex-direction: column; flex-shrink: 0; width: 288px; border-left: 1px solid var(--koyori-color-border); background: var(--koyori-color-accent-subtle); }
.task-form__side-head { display: flex; justify-content: flex-end; flex-shrink: 0; border-bottom: 1px solid var(--koyori-color-border); padding: 8px 12px; }
.task-form__props { display: flex; flex: 1; flex-direction: column; gap: 12px; min-height: 0; overflow-y: auto; padding: 14px 12px; }
@media (max-width: 767px) {
  .task-form { --koyori-dialog-height: auto; }
  .task-form__columns { flex-direction: column; }
  .task-form__side { width: auto; border-left: 0; border-top: 1px solid var(--koyori-color-border); }
  .task-form__body, .task-form__props { overflow: visible; }
}
</style>
