<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { AvatarGroup, Button, Checkbox, Picker, ProgressBar } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';
import './task-properties-demo.css';

// The application supplies the same initial snapshot to SSR and the browser.
const members = [{ id: 'yamada', name: '山田 太郎' }, { id: 'sato', name: '佐藤 花子' }, { id: 'suzuki', name: '鈴木 一郎' }];
const statuses = [{ value: 'todo', label: '未着手' }, { value: 'doing', label: '進行中' }, { value: 'done', label: '完了' }];
const assignees = ref(['yamada']);
const status = ref('doing');
const canEdit = ref(true);
const candidatesState = ref('ready');
const mounted = ref(false);
const assigneeControl = ref<HTMLElement | null>(null);
const selected = computed(() => members.filter(member => assignees.value.includes(member.id)));
const names = computed(() => selected.value.map(member => member.name).join('、') || '未割り当て');
const message = computed(() => ({ loading: '候補を読み込み中…', error: '候補を取得できませんでした。', empty: '担当者に指定できる利用者がいません。' })[candidatesState.value as 'loading' | 'error' | 'empty'] || '');

// Do not instantiate the current Vue Picker during SSR. v-show is insufficient.
onMounted(() => { mounted.value = true; });
async function retry() {
  candidatesState.value = 'loading';
  // Replace this demo delay with task's fetch/retry; keep selection on failure.
  await new Promise(resolve => setTimeout(resolve, 300));
  candidatesState.value = 'ready';
  await nextTick();
  if (canEdit.value) assigneeControl.value?.querySelector('button')?.focus();
}
</script>

<template>
  <section class="task-properties-demo" data-task-properties="vue" aria-label="Vueのタスクプロパティ">
    <h3>請求書を送る</h3>
    <dl class="task-properties-list">
      <div data-property="assignees">
        <dt>担当者</dt>
        <dd>
          <div ref="assigneeControl">
            <Picker v-if="mounted && canEdit && candidatesState === 'ready'" label="担当者"
              :items="members.map(member => ({ value: member.id, label: member.name }))" avatars selection-mode="multiple"
              :selected-values="assignees" :on-selection-change="values => assignees = values">
              <template #trigger><span class="task-property-value"><AvatarGroup label="選択中の担当者" :items="selected" :size="24" :max="3" /><span>{{ names }}</span></span></template>
            </Picker>
            <div v-else class="task-property-readonly"><span class="task-property-value"><AvatarGroup label="選択中の担当者" :items="selected" :size="24" :max="3" /><span>{{ names }}</span></span></div>
          </div>
          <p class="task-property-message" role="status">{{ message }}</p>
          <Button v-if="mounted && canEdit && candidatesState === 'error'" label="候補を再取得" variant="tertiary" :on-click="retry" />
        </dd>
      </div>
      <div data-property="status">
        <dt>状態</dt>
        <dd>
          <Picker v-if="mounted && canEdit" label="状態" :items="statuses" :searchable="false"
            :selected-values="[status]" :on-selection-change="values => status = values[0]" />
          <span v-else class="task-property-readonly">{{ statuses.find(item => item.value === status)?.label }}</span>
        </dd>
      </div>
      <div data-property="progress"><dt>進捗</dt><dd><ProgressBar label="請求書を送るの進捗" :value="40" hide-label /></dd></div>
    </dl>
    <p data-selection-summary>担当者: {{ names }} / 状態: {{ statuses.find(item => item.value === status)?.label }}</p>
    <fieldset class="task-property-scenarios">
      <legend>利用側の状態を試す</legend>
      <label>候補取得 <select v-model="candidatesState"><option value="ready">取得済み</option><option value="loading">読み込み中</option><option value="error">取得失敗</option><option value="empty">候補なし</option></select></label>
      <Checkbox label="編集を許可" :checked="canEdit" :on-checked-change="value => canEdit = value" />
    </fieldset>
  </section>
</template>
