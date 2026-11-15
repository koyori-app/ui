import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, ref } from 'vue';
import { Button, Combobox, Dialog, Field, type ComboboxOption, type ComboboxSection, type ComboboxTag } from './index';

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
const labelOptions = (prefix: string): ComboboxSection[] => [
  {
    heading: 'label: の候補',
    options: labels.filter(l => l.value.startsWith(prefix)).map(l => ({
      value: `label:${l.value}`, label: l.value, color: l.color, meta: `${l.count} 件`, highlight: [[0, prefix.length] as [number, number]],
    })),
  },
  { options: [{ value: 'no:label', label: 'no:label', description: 'ラベルが無いタスク' }] },
];
const hint = '↑↓ で選ぶ　Enter で入れる　Esc で閉じる';

/* TASK-500 の検索欄を小さくした見本の規則。部品には入れない。 */
const playground = (initial: { tags?: ComboboxTag[]; value?: string; disabled?: boolean; defaultOpen?: boolean; width?: number }) => ({
  components: { Button, Combobox },
  setup() {
    const tags = ref<ComboboxTag[]>(initial.tags ?? []);
    const value = ref(initial.value ?? '');
    const log = ref('');
    const caret = ref(0);
    const options = computed<ComboboxSection[]>(() => {
      const text = value.value;
      if (text.startsWith('label:')) return labelOptions(text.slice('label:'.length));
      const matched = keys.filter(k => k.value.startsWith(text)).map(k => ({ ...k, highlight: [[0, text.length] as [number, number]] }));
      return matched.length ? [{ heading: '条件', options: matched }] : [];
    });
    const auto = computed(() => value.value.startsWith('label:'));
    const add = (text: string) => {
      const i = text.indexOf(':');
      tags.value = [...tags.value, i > 0 ? { prefix: text.slice(0, i + 1), label: text.slice(i + 1) } : { label: text }];
    };
    const select = (v: string) => { log.value = `select:${v}`; if (v.endsWith(':')) value.value = v; else { add(v); value.value = ''; } };
    const commit = (v: string) => { log.value = `commit:${v}`; if (v) { add(v); value.value = ''; } };
    const remove = (index: number) => { log.value = `remove:${index}`; tags.value = tags.value.filter((_, i) => i !== index); };
    const edit = (v: string, c: number) => { value.value = v; caret.value = c; };
    return { tags, value, options, auto, select, commit, remove, edit, log, caret, initial, hint };
  },
  /* 開いた一覧が下の要素を覆うので、記録と「次の項目」は欄の横に置く（狭いときは下へ回る）。 */
  template: `<div style="display: flex; flex-wrap: wrap; gap: 12px 16px; align-items: flex-start; min-height: 360px">
    <div :style="{ flex: '1 1 360px', maxWidth: (initial.width ?? 480) + 'px' }">
      <Combobox aria-label="タスクを検索" placeholder="タスクを検索..." :value="value" :tags="tags" :options="options" :auto-highlight="auto"
        :disabled="initial.disabled" :default-open="initial.defaultOpen"
        :on-value-change="edit" :on-caret-change="c => caret = c" :on-select="select" :on-commit="commit" :on-tag-remove="remove">
        <template #suffix><Button variant="ghost" aria-label="書き方の早見表"><template #icon>?</template></Button></template>
        <template #footer>{{ hint }}</template>
      </Combobox>
    </div>
    <div style="flex: none">
      <p style="margin: 0 0 8px">記録: <output aria-label="記録">{{ log }}</output><br />キャレット: <output aria-label="位置">{{ caret }}</output></p>
      <button type="button">次の項目</button>
    </div>
  </div>`,
});

/* 操作しない見本。props をそのまま渡す。 */
const fixed = (props: Record<string, unknown>, width?: number) => ({
  components: { Button, Combobox },
  setup: () => ({ props, hint, width }),
  template: `<div :style="{ maxWidth: width ? width + 'px' : '640px', minHeight: '360px' }">
    <Combobox aria-label="タスクを検索" v-bind="props">
      <template #suffix><Button variant="ghost" aria-label="書き方の早見表"><template #icon>?</template></Button></template>
      <template #footer>{{ hint }}</template>
    </Combobox>
  </div>`,
});

const meta = {
  title: 'Components/Combobox',
  component: Combobox,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

const longTags = (count: number): ComboboxTag[] => Array.from({ length: count }, (_, i) => ({ prefix: 'label:', label: `とても長いラベルの名前 ${i + 1}` }));

export const Default: Story = { render: () => playground({}) };
export const WithTags: Story = {
  render: () => playground({ tags: [{ prefix: 'status:', label: '"In Progress"' }, { prefix: '-label:', label: '保留' }], value: '通知' }),
};
export const Suggesting: Story = {
  render: () => fixed({
    tags: [{ prefix: 'status:', label: 'open' }], value: 'label:b', defaultOpen: true, autoHighlight: true, options: labelOptions('b'),
  }),
};
export const KeyList: Story = {
  render: () => fixed({
    defaultOpen: true,
    options: [{ heading: '条件', options: [...keys, { value: 'assignee:', label: 'assignee:', description: '担当者', meta: 'assignee:me' }] }],
  }),
};
export const ManyTags: Story = { render: () => playground({ tags: longTags(8) }) };
export const Narrow: Story = {
  render: () => playground({
    tags: [{ prefix: 'status:', label: '"In Progress"' }, { prefix: '-label:', label: '保留' }, { label: 'リリース前に確認するアクセシビリティとキーボード操作の一覧' }],
    defaultOpen: true, width: 280,
  }),
};
export const Disabled: Story = { render: () => playground({ tags: [{ label: 'bug' }], disabled: true }) };
export const InField: Story = {
  render: () => ({
    components: { Combobox, Field },
    setup: () => ({ options: [{ heading: '条件', options: keys }] }),
    template: `<div style="max-width: 480px; min-height: 360px">
      <Field id="search" label="検索条件" description="status:open のように、条件を空白で区切って書きます。" error="条件を解釈できませんでした。">
        <Combobox placeholder="条件を入力..." :options="options" />
      </Field>
    </div>`,
  }),
};
export const InDialog: Story = {
  parameters: { docs: { story: { inline: false, iframeHeight: 480 } } },
  render: () => ({
    components: { Combobox, Dialog },
    setup() {
      const open = ref(true);
      return { open, options: [{ heading: '条件', options: keys }], hint };
    },
    template: `<div>
      <Dialog title="タスクを検索" description="条件を入力して絞り込みます。" :open="open" :on-close="() => open = false">
        <div style="min-height: 240px">
          <Combobox aria-label="条件" placeholder="条件を入力..." :options="options"><template #footer>{{ hint }}</template></Combobox>
        </div>
      </Dialog>
      <output style="display: block; margin-top: 12px" aria-live="polite">{{ open ? '開いています' : '閉じています' }}</output>
    </div>`,
  }),
};
