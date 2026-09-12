import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Accordion, Button, CheckIcon, type AccordionProps } from './index';

const meta = {
  title: 'Components/Accordion', component: Accordion,
  parameters: { layout: 'padded' },
  args: { id: 'accordion-default', label: '通知の設定' },
  render: args => <div style={{ maxWidth: 440 }}><Accordion {...args}><p style={{ margin: 0 }}>担当タスクの更新を受け取る方法を選べます。</p><a href="#guide">通知のガイド</a></Accordion></div>,
} satisfies Meta<typeof Accordion>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Open: Story = { args: { id: 'accordion-open', defaultOpen: true } };
export const Disabled: Story = { args: { id: 'accordion-disabled', disabled: true } };
export const DisabledOpen: Story = { args: { id: 'accordion-disabled-open', disabled: true, defaultOpen: true } };
export const WithIcon: Story = { args: { id: 'accordion-icon', icon: <CheckIcon /> } };
export const LongLabel: Story = { args: { id: 'accordion-long', label: 'プロジェクトに参加しているメンバー全員への通知設定について' } };
function ControlledExample(args: AccordionProps) {
  const [open, setOpen] = useState(false);
  return <div style={{ maxWidth: 440 }}>
    <Button label="外側から切り替え" variant="secondary" onClick={() => setOpen(!open)} />
    <Accordion {...args} open={open} onOpenChange={setOpen}>
      <label>メモ <input aria-label="メモ" defaultValue="閉じても残ります" /></label>
    </Accordion>
    <output>{open ? '開いています' : '閉じています'}</output>
  </div>;
}
export const Controlled: Story = { args: { id: 'accordion-controlled' }, render: args => <ControlledExample {...args} /> };
function SingleExample() {
  const [opened, setOpened] = useState<string | null>('general');
  return <div style={{ maxWidth: 440 }}>{['general', 'members', 'notifications'].map((id, index) =>
    <Accordion key={id} id={`single-${id}`} label={['基本設定', 'メンバー', '通知'][index]} open={opened === id} onOpenChange={open => setOpened(open ? id : null)}>
      <a href={`#${id}`}>{['基本設定を編集', 'メンバーを管理', '通知を変更'][index]}</a>
    </Accordion>)}</div>;
}
export const SingleOpen: Story = { render: () => <SingleExample /> };
export const MultipleOpen: Story = {
  render: () => <div style={{ maxWidth: 440 }}>
    <Accordion id="multiple-general" label="基本設定" defaultOpen><a href="#general">基本設定を編集</a></Accordion>
    <Accordion id="multiple-members" label="メンバー" defaultOpen><a href="#members">メンバーを管理</a></Accordion>
  </div>,
};

export const Nested: Story = {
  args: { id: 'nested-projects', label: 'プロジェクト', headingLevel: 2, defaultOpen: true },
  render: args => (
    <div style={{ maxWidth: 440 }}>
      <Accordion {...args}>
        <Accordion id="nested-settings" label="基本設定" headingLevel={3} defaultOpen>
          <p style={{ margin: 0 }}>プロジェクト名や公開範囲を変更できます。</p>
          <a href="#project-settings">設定画面を開く</a>
        </Accordion>
        <Accordion id="nested-members" label="メンバー" headingLevel={3}>
          <p style={{ margin: 0 }}>参加しているメンバーと権限を確認できます。</p>
          <a href="#project-members">メンバーを管理</a>
        </Accordion>
      </Accordion>
    </div>
  ),
};
