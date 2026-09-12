import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { Button, Field, Picker, EllipsisIcon, type PickerProps } from './index';

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
export const Disabled: Story = { args: { disabled: true } };
export const AllDisabled: Story = {
  args: { defaultOpen: true, items: [{ value: 'unavailable', label: '準備中', disabled: true }] },
};
export const Scrollable: Story = {
  args: { defaultOpen: true, items: Array.from({ length: 30 }, (_, index) => ({ value: String(index), label: `チーム ${index + 1}` })) },
};
export const BottomEdge: Story = {
  args: { defaultOpen: true },
  render: (args) => <div style={{ position: 'fixed', bottom: 16, right: 16 }}><Picker {...args} /></div>,
};
export const NoIcon: Story = { args: { icon: null } };
export const CustomIcon: Story = { render: (args) => <Picker {...args} icon={<EllipsisIcon />} /> };
export const TwoPickers: Story = {
  render: (args) => <div><Picker {...args} /><Picker {...args} label="確認チーム" /></div>,
};

function ControlledExample(args: PickerProps) {
  const [values, setValues] = useState<string[]>([]);
  return (
    <div>
      <Picker {...args} selectedValues={values} onSelectionChange={(next) => { setValues(next); args.onSelectionChange?.(next); }} />
      <Button label="選択をクリア" variant="ghost" onClick={() => setValues([])} />
      <output style={{ display: 'block', marginTop: 12 }} aria-live="polite">選択: {values.join('、') || 'なし'}</output>
    </div>
  );
}

export const Controlled: Story = {
  args: { selectionMode: 'multiple' },
  render: (args) => <ControlledExample {...args} />,
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

function FieldExample(args: PickerProps) {
  const [values, setValues] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isRequired, setRequired] = useState(true);
  return <div style={{ maxWidth: 360 }}>
    <Field id="team" label="担当チーム" description="作業を担当するチームです。" required={isRequired} requiredText="Required" error={error}>
      <Picker {...args} label="選んでください" selectedValues={values}
        onSelectionChange={next => { setValues(next); setError(''); }} />
    </Field>
    <Button label="確認" onClick={() => setError(!isRequired || values.length ? '' : 'チームを選択してください。')} />
    <Button label="選択をクリア" variant="ghost" onClick={() => { setValues([]); setError(''); }} />
    <Button label="必須／任意を切り替え" variant="ghost" onClick={() => setRequired(!isRequired)} />
  </div>;
}

export const InField: Story = { render: args => <FieldExample {...args} /> };
export const InFieldWithoutSearch: Story = { ...InField, args: { searchable: false } };
export const InFieldDisabled: Story = { ...InField, args: { disabled: true } };

function UpdatingParentExample(args: PickerProps) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(value => value + 1), 80);
    return () => clearInterval(timer);
  }, []);
  return <div>
    <Picker {...args} formatResultsCount={count => `${count}件の候補`} />
    <output>{tick}</output>
  </div>;
}
export const UpdatingParent: Story = {
  args: { defaultOpen: true },
  render: args => <UpdatingParentExample {...args} />,
};
