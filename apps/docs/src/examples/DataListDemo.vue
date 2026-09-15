<script setup lang="ts">
import { ref } from 'vue';
import { Checkbox, DataList, DataListRow, AvatarGroup, Picker } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const selected = ref<string[]>([]);
const assignees = ref<Record<string, string[]>>({ 'TASK-140': ['yupix'], 'TASK-141': ['sousuke'] });
const people = [{ value: 'yupix', label: 'yupix' }, { value: 'sousuke', label: 'sousuke' }];
const columns = [
  { id: 'selection', label: '選択', width: '3.5rem' },
  { id: 'title', label: 'タイトル' },
  { id: 'owner', label: '担当者', width: '9rem' },
  { id: 'priority', label: '優先度', width: '8rem' },
];
const groups = [
  { id: 'doing', label: '進行中', tasks: [{ id: 'TASK-140', title: '一覧のデザインを整える' }, { id: 'TASK-141', title: 'キーボード操作を確認する' }] },
  { id: 'done', label: '完了', tasks: [] },
];
const priorities = [{ value: 'normal', label: '通常' }, { value: 'high', label: '高い' }];
</script>

<template>
  <div style="display: grid; gap: 16px">
    <DataList v-for="group in groups" :key="group.id" :id="'vue-' + group.id"
      :label="group.label" :columns="columns" :count="group.tasks.length"
      :status="group.tasks.length ? 'ready' : 'empty'" collapsible>
      <DataListRow v-for="task in group.tasks" :key="task.id" :selected="selected.includes(task.id)">
        <td><Checkbox :label="task.id + ' を選択'" hide-label :checked="selected.includes(task.id)"
          :on-checked-change="checked => selected = checked ? [...selected, task.id] : selected.filter(id => id !== task.id)" /></td>
        <th scope="row">{{ task.title }}</th>
        <td><Picker :label="task.title + 'の担当者'" :items="people" avatars selection-mode="multiple" :searchable="false"
          :selected-values="assignees[task.id]" :on-selection-change="values => assignees[task.id] = values">
          <template #trigger>
            <AvatarGroup v-if="assignees[task.id].length" label="選択中の担当者" :size="24" :max="3"
              :items="people.filter(person => assignees[task.id].includes(person.value)).map(person => ({ name: person.label }))" />
            <template v-else>未割り当て</template>
          </template>
        </Picker></td>
        <td><Picker :label="task.title + 'の優先度'" :items="priorities" :searchable="false" :default-selected-values="['normal']" /></td>
      </DataListRow>
    </DataList>
    <p role="status">選択中: {{ selected.join('、') || 'なし' }}</p>
  </div>
</template>
