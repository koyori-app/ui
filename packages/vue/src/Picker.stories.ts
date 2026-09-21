import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { AvatarGroup, Button, Field, Picker, EllipsisIcon, type PickerProps } from './index';

const meta = {
  title: 'Components/Picker',
  component: Picker,
  parameters: { layout: 'padded' },
  args: {
    label: '担当チーム',
    items: [
      { value: 'design', label: 'デザイン' },
      { value: 'frontend', label: 'Frontend' },
      { value: 'backend', label: 'Backend' },
      { value: 'support', label: 'サポート', disabled: true },
      { value: 'review', label: 'レビュー' },
      { value: 'release', label: '公開' },
    ],
  },
  render: (args) => ({ components: { Picker }, setup: () => ({ args }), template: '<Picker v-bind="args" />' }),
} satisfies Meta<typeof Picker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const UndefinedSearch: Story = { args: { searchable: undefined, defaultOpen: true } };
export const Open: Story = { args: { defaultOpen: true } };
export const MultipleSelection: Story = {
  args: { selectionMode: 'multiple', defaultOpen: true, defaultSelectedValues: ['design'] },
};
export const AllSelected: Story = {
  args: { selectionMode: 'multiple', defaultOpen: true, defaultSelectedValues: ['design', 'frontend', 'backend', 'review', 'release'] },
};
export const Empty: Story = { args: { defaultOpen: true, items: [] } };
export const ErrorWithoutRetry: Story = { args: { defaultOpen: true, items: [], error: '候補を読み込めませんでした' } };

// Simulate caller-owned requests: the first retry fails, the second succeeds.
function asyncExample(args: PickerProps, initiallyEmpty = false) {
  return {
    components: { Picker },
    setup() {
      const request = ref({
        loading: !!args.loading, error: args.error || '', attempt: 0,
        items: args.loading || initiallyEmpty ? [] : args.items,
      });
      const values = ref(args.defaultSelectedValues || []);
      watch(() => request.value.loading, (loading, _, onCleanup) => {
        if (!loading) return;
        const timer = setTimeout(() => {
          request.value = {
            ...request.value, loading: false,
            error: request.value.attempt === 1 ? '再試行も失敗しました' : '',
            items: request.value.attempt === 1 ? request.value.items : args.items,
          };
        }, 900);
        onCleanup(() => clearTimeout(timer));
      }, { immediate: true });
      const retry = () => { request.value = { ...request.value, loading: true, attempt: request.value.attempt + 1 }; };
      const change = (next: string[]) => { values.value = next; args.onSelectionChange?.(next); };
      return { args, request, values, retry, change };
    },
    template: `<div>
      <Picker v-bind="args" :items="request.items" :loading="request.loading" :error="request.error"
        :on-retry="retry" :on-selection-change="change" />
      <output style="display: block; margin-top: 12px">選択: {{ values.join('、') || 'なし' }}</output>
    </div>`,
  };
}
export const AsyncLoading: Story = {
  args: { defaultOpen: true, loading: true, defaultSelectedValues: ['frontend'] },
  render: args => asyncExample(args),
};
export const AsyncRetry: Story = {
  args: { defaultOpen: true, error: '候補を読み込めませんでした', selectionMode: 'multiple', defaultSelectedValues: ['frontend'] },
  render: args => asyncExample(args),
};
export const AsyncRetryWithoutSearch: Story = {
  ...AsyncRetry, args: { ...AsyncRetry.args, searchable: false },
};
export const AsyncRetryEmptyWithoutSearch: Story = {
  ...AsyncRetryWithoutSearch,
  render: args => asyncExample(args, true),
};
export const Disabled: Story = { args: { disabled: true } };
export const AllDisabled: Story = {
  args: { defaultOpen: true, items: [{ value: 'unavailable', label: '準備中', disabled: true }] },
};
export const Scrollable: Story = {
  args: { defaultOpen: true, items: Array.from({ length: 30 }, (_, index) => ({ value: String(index), label: `チーム ${index + 1}` })) },
};
export const BottomEdge: Story = {
  args: { defaultOpen: true },
  render: (args) => ({
    components: { Picker }, setup: () => ({ args }),
    template: '<div style="position: fixed; bottom: 16px; right: 16px"><Picker v-bind="args" /></div>',
  }),
};
export const NoIcon: Story = { args: { icon: null } };
export const CustomIcon: Story = {
  render: (args) => ({
    components: { Picker, EllipsisIcon }, setup: () => ({ args }),
    template: '<Picker v-bind="args"><template #icon><EllipsisIcon /></template></Picker>',
  }),
};
const memberPhoto = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><rect width="2" height="2" fill="%23c4b5df"/><circle cx="1" cy="0.75" r="0.45" fill="%23faf8f5"/><circle cx="1" cy="2.1" r="0.85" fill="%23faf8f5"/></svg>';

export const WithAvatars: Story = {
  args: {
    label: '担当者', avatars: true, selectionMode: 'multiple', defaultOpen: true, defaultSelectedValues: ['yamada'],
    items: [
      { value: 'yamada', label: '山田 太郎', src: memberPhoto },
      { value: 'sato', label: '佐藤 花子' },
      { value: 'yupix', label: 'yupix', src: memberPhoto },
      { value: 'suzuki', label: '鈴木 一郎' },
      { value: 'takahashi', label: '高橋 次郎', disabled: true },
    ],
  },
};
export const CustomTrigger: Story = {
  args: { selectionMode: 'multiple', defaultSelectedValues: ['design', 'frontend', 'backend', 'review'] },
  render: (args) => ({
    components: { Picker, AvatarGroup },
    setup: () => ({ args, teams: [{ name: 'デザイン' }, { name: 'Frontend' }, { name: 'Backend' }, { name: 'レビュー' }] }),
    template: `<Picker v-bind="args">
      <template #trigger><AvatarGroup label="選択中のチーム" :items="teams" :size="24" :max="3" /></template>
    </Picker>`,
  }),
};
export const TwoPickers: Story = {
  render: (args) => ({
    components: { Picker }, setup: () => ({ args }),
    template: '<div><Picker v-bind="args" /><Picker v-bind="args" label="確認チーム" /></div>',
  }),
};
export const Controlled: Story = {
  args: { selectionMode: 'multiple' },
  render: (args) => ({
    components: { Button, Picker },
    setup() {
      const values = ref<string[]>([]);
      const change = (next: string[]) => { values.value = next; args.onSelectionChange?.(next); };
      return { args, values, change };
    },
    template: `<div>
      <Picker v-bind="args" :selected-values="values" :on-selection-change="change" />
      <Button label="選択をクリア" variant="ghost" @click="values = []" />
      <output style="display: block; margin-top: 12px" aria-live="polite">選択: {{ values.join('、') || 'なし' }}</output>
    </div>`,
  }),
};

export const WithoutSearch: Story = {
  args: { searchable: false, defaultOpen: true, defaultSelectedValues: ['frontend'] },
};
export const MultipleWithoutSearch: Story = {
  args: { searchable: false, selectionMode: 'multiple', defaultOpen: true, defaultSelectedValues: ['design'] },
};
export const AdjacentSelection: Story = {
  args: { searchable: false, selectionMode: 'multiple', defaultOpen: true, defaultSelectedValues: ['design', 'backend'] },
};
export const EmptyWithoutSearch: Story = {
  args: { searchable: false, defaultOpen: true, items: [] },
};
export const ControlledWithoutSearch: Story = {
  ...Controlled,
  args: { searchable: false, selectionMode: 'multiple' },
};

export const LargeList: Story = {
  args: { defaultOpen: true, items: Array.from({ length: 1001 }, (_, i) => ({ value: String(i), label: `Team ${i}` })) },
};
export const Localized: Story = {
  args: {
    label: 'Teams', defaultOpen: true, selectionMode: 'multiple', selectionSeparator: ', ',
    items: [{ value: 'design', label: 'Design' }, { value: 'frontend', label: 'Frontend' }],
    searchLabel: 'Search teams', searchPlaceholder: 'Search…', emptyMessage: 'No teams found',
    formatResultsCount: count => `${count} teams available`,
  },
};
export const SeparateEmptyMessages: Story = {
  args: { defaultOpen: true, emptyMessage: '候補がありません', noResultsMessage: '一致する候補がありません' },
};
export const LocalizedAsync: Story = {
  args: { defaultOpen: true, error: 'Could not load teams', loadingMessage: 'Loading teams…', retryLabel: 'Try again' },
  render: args => asyncExample(args),
};
export const InField: Story = {
  render: args => ({
    components: { Button, Field, Picker },
    setup() {
      const values = ref<string[]>([]);
      const error = ref('');
      const isRequired = ref(true);
      const change = (next: string[]) => { values.value = next; error.value = ''; };
      return { args, values, error, isRequired, change };
    },
    template: `<div style="max-width: 360px">
      <Field id="team" label="担当チーム" description="作業を担当するチームです。" :required="isRequired" required-text="Required" :error="error">
        <Picker v-bind="args" label="選んでください" :selected-values="values" :on-selection-change="change" />
      </Field>
      <Button label="確認" @click="error = !isRequired || values.length ? '' : 'チームを選択してください。'" />
      <Button label="選択をクリア" variant="ghost" @click="values = []; error = ''" />
      <Button label="必須／任意を切り替え" variant="ghost" @click="isRequired = !isRequired" />
    </div>`,
  }),
};
export const InFieldWithoutSearch: Story = { ...InField, args: { searchable: false } };
export const InFieldDisabled: Story = { ...InField, args: { disabled: true } };

export const UpdatingParent: Story = {
  args: { defaultOpen: true },
  render: args => ({
    components: { Picker },
    setup() {
      const tick = ref(0);
      let timer: ReturnType<typeof setInterval>;
      onMounted(() => { timer = setInterval(() => tick.value++, 80); });
      onUnmounted(() => clearInterval(timer));
      return { args, tick };
    },
    template: '<div><Picker v-bind="args" :format-results-count="count => count + \'件の候補\'" /><output>{{ tick }}</output></div>',
  }),
};
