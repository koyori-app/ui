import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, EllipsisIcon, Tooltip } from './index';

const meta = {
  title: 'Components/Tooltip',
  component: Tooltip,
  parameters: { layout: 'padded' },
  args: { id: 'action-help', content: 'タスクの移動・複製などを選びます。' },
  render: (args) => <div style={{ padding: 64 }}>
    <Tooltip {...args}><Button ariaLabel="その他の操作" variant="tertiary" icon={<EllipsisIcon />} /></Tooltip>
    <button style={{ marginLeft: 24 }}>次へ</button>
  </div>,
} satisfies Meta<typeof Tooltip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Bottom: Story = { args: { placement: 'bottom' } };
export const Left: Story = { args: { placement: 'left' } };
export const Right: Story = { args: { placement: 'right' } };
export const Empty: Story = { args: { content: '   ' } };
export const Disabled: Story = { args: { disabled: true } };
export const LongText: Story = { args: { content: '担当者・期限・進捗率は詳細画面でも確認できます。変更前に内容を確認してください。'.repeat(4) + '\n' + 'long-unbroken-reference-'.repeat(8) } };
export const ExistingDescription: Story = {
  render: (args) => <div style={{ padding: 64 }}>
    <p id="existing-description">操作は取り消せます。</p>
    <Tooltip {...args}><button aria-describedby="existing-description">編集</button></Tooltip>
  </div>,
};
export const DisabledTrigger: Story = {
  render: (args) => <Tooltip {...args}><Button label="削除" disabled /></Tooltip>,
};
export const DisabledWrapper: Story = {
  args: { content: 'このタスクを削除する権限がありません。' },
  render: (args) => <div style={{ padding: 64 }}>
    <Tooltip {...args}>
      <span tabIndex={0} role="group" aria-label="削除できない理由">
        <span style={{ pointerEvents: 'none' }}><Button label="削除" disabled /></span>
      </span>
    </Tooltip>
  </div>,
};
export const Edges: Story = {
  render: (args) => <>{(['top', 'bottom', 'left', 'right'] as const).map((placement, i) =>
    <div key={placement} style={{ position: 'fixed', [i < 2 ? 'top' : 'bottom']: 0, [i % 2 ? 'right' : 'left']: 0 }}>
      <Tooltip {...args} id={`edge-${placement}`} placement={placement}><Button label={placement} /></Tooltip>
    </div>)}</>,
};
export const Clipped: Story = {
  render: (args) => <div style={{ margin: 80, width: 100, height: 40, overflow: 'hidden', transform: 'translateX(10px)' }}>
    <Tooltip {...args}><Button label="補足" /></Tooltip>
  </div>,
};
export const InDialog: Story = {
  render: (args) => <dialog id="tooltip-dialog" style={{ padding: 48 }}>
    <Tooltip {...args}><Button label="補足" /></Tooltip>
    <button style={{ marginLeft: 24 }}>次へ</button>
  </dialog>,
};
function ChangingTooltip() {
  const [content, setContent] = useState('最初の説明');
  const [disabled, setDisabled] = useState(false);
  return <div style={{ padding: 64 }}>
    <Tooltip id="changing-help" content={content} disabled={disabled}><button>補足</button></Tooltip>
    <button onClick={() => setContent('変更した説明')}>内容を変更</button>
    <button onClick={() => setDisabled(!disabled)}>無効を切り替え</button>
  </div>;
}
export const Dynamic: Story = { render: () => <ChangingTooltip /> };
