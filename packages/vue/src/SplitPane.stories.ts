import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import { Button, SplitPane, type SplitPaneProps } from './index';

const render = (mode = 'default') => (args: SplitPaneProps) => ({
  components: { Button, SplitPane },
  setup() {
    const size = ref(320), requests = ref<number[]>([]), width = ref(720);
    const minimum = ref(args.minSize ?? 160), disabled = ref(args.disabled), shown = ref(true);
    const change = (value: number) => { requests.value.push(value); if (mode === 'controlled') size.value = value; };
    return { args, mode, size, requests, width, minimum, disabled, shown, change };
  },
  template: `<div>
    <p>境界をドラッグ、またはフォーカスして ← / →・Home / End で幅を変更します。</p>
    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px">
      <Button label="外部サイズを240pxに" :on-click="() => size = 240" />
      <Button label="親幅を切替" :on-click="() => width = width === 720 ? 280 : 720" />
      <Button label="最小幅を切替" :on-click="() => minimum = minimum === 160 ? 260 : 160" />
      <Button label="操作可否を切替" :on-click="() => disabled = !disabled" />
      <Button label="表示を切替" :on-click="() => shown = !shown" />
    </div>
    <div data-split-container style="max-width: 100%; height: 280px; border: 1px solid #d9d3df" :style="{ width: (mode === 'narrow' ? 280 : width) + 'px' }">
      <SplitPane v-if="shown" v-bind="args" :min-size="minimum" :disabled="disabled"
        :size="mode === 'controlled' || mode === 'rejected' ? size : args.size" :on-size-change="change">
        <template #primary><section style="padding: 16px"><h2 id="split-heading">タスク一覧</h2><button type="button">一覧の操作</button><p>期限を確認する</p><p>資料を共有する</p></section></template>
        <template #secondary><section style="padding: 16px"><h2>詳細</h2><label>件名 <input value="期限を確認する" /></label><p>内容は各ペイン内でスクロールします。</p></section></template>
      </SplitPane>
    </div>
    <p>変更通知: <output data-requests>{{ JSON.stringify(requests) }}</output></p>
    <Button label="次の操作" />
  </div>`,
});
const meta = {
  title: 'Components/SplitPane', component: SplitPane,
  parameters: { layout: 'padded' },
  args: { label: 'タスク一覧', primaryId: 'task-list', ariaLabelledBy: 'split-heading', defaultSize: 320, minSize: 160, minSecondarySize: 160 },
  render: render(),
} satisfies Meta<typeof SplitPane>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Controlled: Story = { render: render('controlled') };
export const Rejected: Story = { render: render('rejected') };
export const Narrow: Story = { render: render('narrow') };
export const Disabled: Story = { args: { disabled: true } };
export const ZeroMinima: Story = { args: { minSize: 0, minSecondarySize: 0 } };
export const OutsideRange: Story = { args: { size: 900 } };
export const UnequalMinima: Story = { args: { minSize: 120, minSecondarySize: 240 }, render: render('narrow') };
export const InvalidValues: Story = { args: { size: Number.NaN, defaultSize: Number.POSITIVE_INFINITY, minSize: -10, minSecondarySize: Number.NaN } };
export const Empty: Story = {
  render: args => ({ components: { SplitPane }, setup: () => ({ args }), template: `<div style="height: 120px"><SplitPane v-bind="args" primary-id="empty-primary" :aria-labelled-by="undefined" /></div>` }),
};
