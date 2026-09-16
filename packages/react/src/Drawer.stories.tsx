import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, CheckIcon, Drawer, EllipsisIcon, MenuIcon, Sidebar, SidebarLink, XIcon, type DrawerProps } from './index';

/* showModal() は開いた瞬間にページ全体を inert にするため、Docs では iframe で描画する。 */
const meta = {
  title: 'Components/Drawer',
  component: Drawer,
  parameters: { layout: 'padded', docs: { story: { inline: false, iframeHeight: 480 } } },
  args: { open: false, label: 'メニュー', placement: 'left' },
  argTypes: { placement: { control: 'select', options: ['left', 'right', 'top', 'bottom'] } },
  render: (args) => <DrawerExample {...args} />,
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

function DrawerExample(args: DrawerProps) {
  const [open, setOpen] = useState(false);
  const [rail, setRail] = useState(false);
  return (
    <div>
      <Button ariaLabel="メニューを開く" variant="ghost" icon={<MenuIcon />} onClick={() => setOpen(true)} />
      <Drawer {...args} open={open} onClose={() => setOpen(false)}>
        <Sidebar label="メインナビゲーション" rail={rail} header={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {!rail && <strong>Koyori workspace</strong>}
            {/* Drawer は閉じるボタンを持たないため、アプリ側で置く。 */}
            <Button ariaLabel="メニューを閉じる" variant="ghost" icon={<XIcon />} onClick={() => setOpen(false)} />
          </div>
        } footer={
          <Button ariaLabel={rail ? 'ラベルを表示する' : 'アイコンだけにする'} variant="ghost" icon={<MenuIcon />} onClick={() => setRail(!rail)} />
        }>
          <SidebarLink label="概要" href="#overview" icon={<CheckIcon />} current />
          <SidebarLink label="受信トレイ" href="#inbox" icon={<EllipsisIcon />} badge="4" />
          <SidebarLink label="自分のタスク" href="#tasks" icon={<CheckIcon />} />
        </Sidebar>
      </Drawer>
    </div>
  );
}

/* modal を false にすると dialog を使わず、その場に描く。広い画面の常時表示に使う。 */
export const Inline: Story = { args: { modal: false } };
export const Left: Story = {};
export const Right: Story = { args: { placement: 'right' } };
export const Top: Story = { args: { placement: 'top' } };
export const Bottom: Story = { args: { placement: 'bottom' } };
