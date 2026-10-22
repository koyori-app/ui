import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Avatar, Dropdown, EllipsisIcon, type DropdownItem, type DropdownProps } from './index';

const meta = {
  title: 'Components/Dropdown',
  component: Dropdown,
  parameters: { layout: 'padded' },
  args: {
    label: 'ワークスペース',
    defaultOpen: false,
    disabled: false,
    items: [
      { value: 'recent', label: '最近使った項目' },
      { value: 'favorites', label: 'お気に入り' },
      { value: 'shared', label: '共有' },
      { value: 'private', label: 'プライベート' },
    ],
  },
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Open: Story = { args: { defaultOpen: true } };
export const Disabled: Story = { args: { disabled: true } };
export const DisabledItem: Story = {
  args: {
    defaultOpen: true,
    items: [
      { value: 'edit', label: '編集' },
      { value: 'share', label: '共有（権限が必要）', disabled: true },
      { value: 'duplicate', label: '複製' },
    ],
  },
};
export const Empty: Story = { args: { defaultOpen: true, items: [] } };
export const Localized: Story = { args: { label: 'Actions', defaultOpen: true, items: [], emptyMessage: 'No actions available' } };
export const LongLabel: Story = {
  args: {
    defaultOpen: true,
    items: [
      { value: 'short', label: '短い項目' },
      { value: 'long', label: '複数行に折り返す長い項目でも背景が項目の高さに合わせて滑らかに移動します' },
      { value: 'last', label: '最後の項目' },
    ],
  },
};

export const CustomIcon: Story = {
  render: (args) => <Dropdown {...args} icon={<EllipsisIcon />} />,
};
export const BottomEdge: Story = {
  args: { defaultOpen: true },
  render: (args) => <div style={{ position: 'fixed', bottom: 16, left: 16 }}><Dropdown {...args} /></div>,
};
export const NoIcon: Story = { args: { icon: null } };
export const Scrollable: Story = {
  args: {
    defaultOpen: true,
    items: Array.from({ length: 20 }, (_, index) => ({ value: String(index), label: `項目 ${index + 1}` })),
  },
};

function ActionExample(args: DropdownProps) {
  const [action, setAction] = useState('未実行');
  return <div>
    <button type="button">前の操作</button>
    <Dropdown {...args} onSelect={(value) => { setAction(value); args.onSelect?.(value); }} />
    <button type="button">次の操作</button>
    <output style={{ display: 'block', marginTop: 12 }} aria-live="polite">操作: {action}</output>
  </div>;
}
export const Actions: Story = {
  render: (args) => <ActionExample {...args} />,
};
export const TwoMenus: Story = {
  render: (args) => <div><Dropdown {...args} /><Dropdown {...args} label="別の操作" /></div>,
};

const columns: DropdownItem[] = [
  { value: 'status', label: 'ステータス', kind: 'checkbox', checked: true },
  { value: 'assignee', label: '担当者', kind: 'checkbox', checked: true },
  { value: 'due', label: '期限', kind: 'checkbox', checked: false },
  { value: 'labels', label: 'ラベル（変更不可）', kind: 'checkbox', checked: false, disabled: true },
];
/* 選んでも閉じない。checked はアプリが items を更新して反転する。開閉の通知も表示する。 */
function CheckboxExample(args: DropdownProps) {
  const [items, setItems] = useState(args.items as DropdownItem[]);
  const [changes, setChanges] = useState<string[]>([]);
  return <div>
    <output style={{ display: 'block', marginBottom: 12 }}>開閉: {changes.join('、')}</output>
    <Dropdown {...args} items={items}
      onSelect={(value) => {
        setItems((current) => current.map((item) => item.value === value ? { ...item, checked: !item.checked } : item));
        args.onSelect?.(value);
      }}
      onOpenChange={(open) => setChanges((current) => [...current, open ? '開' : '閉'])} />
  </div>;
}
export const Checkboxes: Story = {
  args: { label: '表示する列', defaultOpen: true, items: columns },
  render: (args) => <CheckboxExample {...args} />,
};
function RadioExample(args: DropdownProps) {
  const [sort, setSort] = useState('updated');
  const items = [
    { value: 'updated', label: '更新日' },
    { value: 'created', label: '作成日' },
    { value: 'title', label: 'タイトル' },
  ].map((item): DropdownItem => ({ ...item, kind: 'radio', checked: item.value === sort }));
  return <Dropdown {...args} items={items} onSelect={(value) => { setSort(value); args.onSelect?.(value); }} />;
}
export const Radios: Story = {
  args: { label: '並び順', variant: 'tertiary', defaultOpen: true },
  render: (args) => <RadioExample {...args} />,
};
export const Sections: Story = {
  args: {
    label: 'アカウント',
    defaultOpen: true,
    items: [
      { heading: 'テナント', items: [{ value: 'koyori', label: 'Koyori' }, { value: 'personal', label: '個人' }] },
      { items: [{ value: 'settings', label: '設定' }] },
      { items: [{ value: 'logout', label: 'ログアウト', destructive: true }] },
    ],
  },
};
export const IconOnlyTrigger: Story = {
  args: {
    label: undefined,
    ariaLabel: 'タスクの操作',
    items: [{ value: 'edit', label: '編集' }, { value: 'delete', label: 'タスクを削除', destructive: true }],
  },
  render: (args) => <Dropdown {...args} icon={<EllipsisIcon />} />,
};
export const CustomTrigger: Story = {
  args: { label: 'アカウント' },
  render: (args) => <Dropdown {...args} trigger={<><Avatar name="yupix" size={20} />yupix</>} />,
};
