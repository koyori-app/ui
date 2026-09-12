import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import { Accordion, Button, CheckIcon } from './index';

const meta = {
  title: 'Components/Accordion', component: Accordion,
  parameters: { layout: 'padded' },
  args: { id: 'accordion-default', label: '通知の設定' },
  render: args => ({ components: { Accordion }, setup: () => ({ args }), template: `<div style="max-width: 440px"><Accordion v-bind="args"><p style="margin: 0">担当タスクの更新を受け取る方法を選べます。</p><a href="#guide">通知のガイド</a></Accordion></div>` }),
} satisfies Meta<typeof Accordion>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Open: Story = { args: { id: 'accordion-open', defaultOpen: true } };
export const Disabled: Story = { args: { id: 'accordion-disabled', disabled: true } };
export const DisabledOpen: Story = { args: { id: 'accordion-disabled-open', disabled: true, defaultOpen: true } };
export const WithIcon: Story = { args: { id: 'accordion-icon' }, render: args => ({ components: { Accordion, CheckIcon }, setup: () => ({ args }), template: '<Accordion v-bind="args"><template #icon><CheckIcon /></template><p>担当タスクの更新を受け取る方法を選べます。</p></Accordion>' }) };
export const LongLabel: Story = { args: { id: 'accordion-long', label: 'プロジェクトに参加しているメンバー全員への通知設定について' } };
export const Controlled: Story = {
  args: { id: 'accordion-controlled' },
  render: args => ({ components: { Accordion, Button }, setup: () => ({ args, open: ref(false) }),
    template: `<div style="max-width: 440px">
      <Button label="外側から切り替え" variant="secondary" :on-click="() => open = !open" />
      <Accordion v-bind="args" :open="open" :on-open-change="value => open = value"><label>メモ <input aria-label="メモ" value="閉じても残ります" /></label></Accordion>
      <output>{{ open ? '開いています' : '閉じています' }}</output>
    </div>`,
  }),
};
export const SingleOpen: Story = {
  render: () => ({ components: { Accordion }, setup: () => ({ opened: ref<string | null>('general'), sections: [{ id: 'general', label: '基本設定', link: '基本設定を編集' }, { id: 'members', label: 'メンバー', link: 'メンバーを管理' }, { id: 'notifications', label: '通知', link: '通知を変更' }] }),
    template: `<div style="max-width: 440px"><Accordion v-for="section in sections" :key="section.id" :id="'single-' + section.id" :label="section.label" :open="opened === section.id" :on-open-change="open => opened = open ? section.id : null"><a :href="'#' + section.id">{{ section.link }}</a></Accordion></div>`,
  }),
};
export const MultipleOpen: Story = {
  render: () => ({ components: { Accordion }, template: `<div style="max-width: 440px"><Accordion id="multiple-general" label="基本設定" default-open><a href="#general">基本設定を編集</a></Accordion><Accordion id="multiple-members" label="メンバー" default-open><a href="#members">メンバーを管理</a></Accordion></div>` }),
};

export const Nested: Story = {
  args: { id: 'nested-projects', label: 'プロジェクト', headingLevel: 2, defaultOpen: true },
  render: args => ({
    components: { Accordion },
    setup: () => ({ args }),
    template: `<div style="max-width: 440px">
      <Accordion v-bind="args">
        <Accordion id="nested-settings" label="基本設定" :heading-level="3" default-open>
          <p style="margin: 0">プロジェクト名や公開範囲を変更できます。</p>
          <a href="#project-settings">設定画面を開く</a>
        </Accordion>
        <Accordion id="nested-members" label="メンバー" :heading-level="3">
          <p style="margin: 0">参加しているメンバーと権限を確認できます。</p>
          <a href="#project-members">メンバーを管理</a>
        </Accordion>
      </Accordion>
    </div>`,
  }),
};
