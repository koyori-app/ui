<script setup lang="ts">
import { computed, ref } from 'vue';
import { Button, Combobox, type ComboboxOption, type ComboboxSection, type ComboboxTag } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const labels = [
  { value: 'bug', color: '#e5484d', count: 12 },
  { value: 'backend', color: '#0ea5e9', count: 8 },
  { value: 'feature', color: '#3b82f6', count: 5 },
];
const keys: ComboboxOption[] = [
  { value: 'status:', label: 'status:', description: 'ステータス', meta: 'status:"In Progress"' },
  { value: 'label:', label: 'label:', description: 'ラベル（, で OR）', meta: 'label:bug,feature' },
  { value: 'sort:', label: 'sort:', description: '並び', meta: 'sort:updated', disabled: true },
];

const tags = ref<ComboboxTag[]>([]);
const value = ref('');
const message = ref('');

// 候補の中身と、札・文字列の解釈は利用側で決める。ここでは前方一致の見本を書いている。
const options = computed<ComboboxSection[]>(() => {
  const text = value.value;
  if (text.startsWith('label:')) {
    const prefix = text.slice('label:'.length);
    return [
      {
        heading: 'label: の候補',
        options: labels.filter(l => l.value.startsWith(prefix)).map(l => ({
          value: `label:${l.value}`, label: l.value, color: l.color, meta: `${l.count} 件`, highlight: [[0, prefix.length]],
        })),
      },
      { options: [{ value: 'no:label', label: 'no:label', description: 'ラベルが無いタスク' }] },
    ];
  }
  const matched = keys.filter(k => k.value.startsWith(text)).map(k => ({ ...k, highlight: [[0, text.length]] as [number, number][] }));
  return matched.length ? [{ heading: '条件', options: matched }] : [];
});
const autoHighlight = computed(() => value.value.startsWith('label:'));

function add(text: string) {
  const i = text.indexOf(':');
  tags.value = [...tags.value, i > 0 ? { prefix: text.slice(0, i + 1), label: text.slice(i + 1) } : { label: text }];
  value.value = '';
}
function select(next: string) {
  message.value = `選択: ${next}`;
  if (next.endsWith(':')) value.value = next;
  else add(next);
}
function commit(next: string) {
  message.value = `確定: ${next || '（空）'}`;
  if (next) add(next);
}
function remove(index: number) {
  message.value = `外した札: ${tags.value[index].prefix ?? ''}${tags.value[index].label}`;
  tags.value = tags.value.filter((_, i) => i !== index);
}
</script>

<template>
  <div style="display: grid; gap: 12px; max-width: 480px; min-height: 340px; align-content: start">
    <Combobox aria-label="タスクを検索" placeholder="タスクを検索..." :value="value" :tags="tags" :options="options"
      :auto-highlight="autoHighlight" :on-value-change="(next) => (value = next)" :on-select="select" :on-commit="commit"
      :on-tag-remove="remove">
      <template #suffix><Button variant="ghost" ariaLabel="書き方の早見表"><template #icon>?</template></Button></template>
      <template #footer>↑↓ で選ぶ　Enter で入れる　Esc で閉じる</template>
    </Combobox>
    <p role="status" style="margin: 0">{{ message }}</p>
  </div>
</template>
