import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, SplitPane, type SplitPaneProps } from './index';

function Example({ mode = 'default', ...args }: SplitPaneProps & { mode?: 'default' | 'controlled' | 'rejected' | 'narrow' }) {
  const [size, setSize] = useState(320);
  const [requests, setRequests] = useState<number[]>([]);
  const [width, setWidth] = useState(720);
  const [minimum, setMinimum] = useState(args.minSize ?? 160);
  const [disabled, setDisabled] = useState(args.disabled);
  const [shown, setShown] = useState(true);
  return <div>
    <p>境界をドラッグ、またはフォーカスして ← / →・Home / End で幅を変更します。</p>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
      <Button label="外部サイズを240pxに" onClick={() => setSize(240)} />
      <Button label="親幅を切替" onClick={() => setWidth(width === 720 ? 280 : 720)} />
      <Button label="最小幅を切替" onClick={() => setMinimum(minimum === 160 ? 260 : 160)} />
      <Button label="操作可否を切替" onClick={() => setDisabled(!disabled)} />
      <Button label="表示を切替" onClick={() => setShown(!shown)} />
    </div>
    <div data-split-container="" style={{ width: mode === 'narrow' ? 280 : width, maxWidth: '100%', height: 280, border: '1px solid #d9d3df' }}>
      {shown && <SplitPane {...args} minSize={minimum} disabled={disabled}
        size={mode === 'controlled' || mode === 'rejected' ? size : args.size}
        onSizeChange={value => { setRequests(old => [...old, value]); if (mode === 'controlled') setSize(value); }}
        primary={<section style={{ padding: 16 }}><h2 id="split-heading">タスク一覧</h2><button type="button">一覧の操作</button><p>期限を確認する</p><p>資料を共有する</p></section>}
        secondary={<section style={{ padding: 16 }}><h2>詳細</h2><label>件名 <input defaultValue="期限を確認する" /></label><p>内容は各ペイン内でスクロールします。</p></section>}
      />}
    </div>
    <p>変更通知: <output data-requests="">{JSON.stringify(requests)}</output></p>
    <Button label="次の操作" />
  </div>;
}

const meta = {
  title: 'Components/SplitPane', component: SplitPane,
  parameters: { layout: 'padded' },
  args: { label: 'タスク一覧', primaryId: 'task-list', ariaLabelledBy: 'split-heading', defaultSize: 320, minSize: 160, minSecondarySize: 160 },
  render: args => <Example {...args} />,
} satisfies Meta<typeof SplitPane>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Controlled: Story = { render: args => <Example {...args} mode="controlled" /> };
export const Rejected: Story = { render: args => <Example {...args} mode="rejected" /> };
export const Narrow: Story = { render: args => <Example {...args} mode="narrow" /> };
export const Disabled: Story = { args: { disabled: true } };
export const ZeroMinima: Story = { args: { minSize: 0, minSecondarySize: 0 } };
export const OutsideRange: Story = { args: { size: 900 } };
export const UnequalMinima: Story = { args: { minSize: 120, minSecondarySize: 240 }, render: args => <Example {...args} mode="narrow" /> };
export const InvalidValues: Story = { args: { size: Number.NaN, defaultSize: Number.POSITIVE_INFINITY, minSize: -10, minSecondarySize: Number.NaN } };
export const Empty: Story = { render: args => <div style={{ height: 120 }}><SplitPane {...args} primaryId="empty-primary" ariaLabelledBy={undefined} /></div> };
