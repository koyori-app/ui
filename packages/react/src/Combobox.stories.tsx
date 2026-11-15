import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';
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
const help = <Button variant="ghost" ariaLabel="書き方の早見表" icon="?" />;

/* TASK-500 の検索欄を小さくした見本の規則。部品には入れない。 */
function Playground({ tags: initialTags = [], value: initialValue = '', disabled, defaultOpen, width }: {
  tags?: ComboboxTag[]; value?: string; disabled?: boolean; defaultOpen?: boolean; width?: number;
}) {
  const [tags, setTags] = useState<ComboboxTag[]>(initialTags);
  const [value, setValue] = useState(initialValue);
  const [log, setLog] = useState('');
  const [caret, setCaret] = useState(0);
  const options = useMemo<ComboboxSection[]>(() => {
    if (value.startsWith('label:')) return labelOptions(value.slice('label:'.length));
    const matched = keys.filter(k => k.value.startsWith(value)).map(k => ({ ...k, highlight: [[0, value.length] as [number, number]] }));
    return matched.length ? [{ heading: '条件', options: matched }] : [];
  }, [value]);
  const add = (text: string) => {
    const i = text.indexOf(':');
    setTags(current => [...current, i > 0 ? { prefix: text.slice(0, i + 1), label: text.slice(i + 1) } : { label: text }]);
  };
  /* 開いた一覧が下の要素を覆うので、記録と「次の項目」は欄の横に置く（狭いときは下へ回る）。 */
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 16px', alignItems: 'flex-start', minHeight: 360 }}>
    <div style={{ flex: '1 1 360px', maxWidth: width ?? 480 }}>
      <Combobox ariaLabel="タスクを検索" placeholder="タスクを検索..." value={value} tags={tags} options={options}
        autoHighlight={value.startsWith('label:')} disabled={disabled} defaultOpen={defaultOpen}
        onValueChange={(next, at) => { setValue(next); setCaret(at); }} onCaretChange={setCaret}
        onSelect={next => { setLog(`select:${next}`); if (next.endsWith(':')) setValue(next); else { add(next); setValue(''); } }}
        onCommit={next => { setLog(`commit:${next}`); if (next) { add(next); setValue(''); } }}
        onTagRemove={index => { setLog(`remove:${index}`); setTags(current => current.filter((_, i) => i !== index)); }}
        suffix={help} footer={hint} />
    </div>
    <div style={{ flex: 'none' }}>
      <p style={{ margin: '0 0 8px' }}>記録: <output aria-label="記録">{log}</output><br />キャレット: <output aria-label="位置">{caret}</output></p>
      <button type="button">次の項目</button>
    </div>
  </div>;
}

/* 操作しない見本。props をそのまま渡す。 */
const fixed = (props: Record<string, unknown>) => (
  <div style={{ maxWidth: 640, minHeight: 360 }}>
    <Combobox ariaLabel="タスクを検索" {...props} suffix={help} footer={hint} />
  </div>
);

function DialogExample() {
  const [open, setOpen] = useState(true);
  return <div>
    <Dialog title="タスクを検索" description="条件を入力して絞り込みます。" open={open} onClose={() => setOpen(false)}>
      <div style={{ minHeight: 240 }}>
        <Combobox ariaLabel="条件" placeholder="条件を入力..." options={[{ heading: '条件', options: keys }]} footer={hint} />
      </div>
    </Dialog>
    <output style={{ display: 'block', marginTop: 12 }} aria-live="polite">{open ? '開いています' : '閉じています'}</output>
  </div>;
}

const meta = {
  title: 'Components/Combobox',
  component: Combobox,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

const longTags = (count: number): ComboboxTag[] => Array.from({ length: count }, (_, i) => ({ prefix: 'label:', label: `とても長いラベルの名前 ${i + 1}` }));

export const Default: Story = { render: () => <Playground /> };
export const WithTags: Story = {
  render: () => <Playground tags={[{ prefix: 'status:', label: '"In Progress"' }, { prefix: '-label:', label: '保留' }]} value="通知" />,
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
export const ManyTags: Story = { render: () => <Playground tags={longTags(8)} /> };
export const Narrow: Story = {
  render: () => <Playground width={280} defaultOpen tags={[
    { prefix: 'status:', label: '"In Progress"' }, { prefix: '-label:', label: '保留' }, { label: 'リリース前に確認するアクセシビリティとキーボード操作の一覧' },
  ]} />,
};
export const Disabled: Story = { render: () => <Playground tags={[{ label: 'bug' }]} disabled /> };
export const InField: Story = {
  render: () => (
    <div style={{ maxWidth: 480, minHeight: 360 }}>
      <Field id="search" label="検索条件" description="status:open のように、条件を空白で区切って書きます。" error="条件を解釈できませんでした。">
        <Combobox placeholder="条件を入力..." options={[{ heading: '条件', options: keys }]} />
      </Field>
    </div>
  ),
};
export const InDialog: Story = {
  parameters: { docs: { story: { inline: false, iframeHeight: 480 } } },
  render: () => <DialogExample />,
};

function RegressionExample() {
  const [options, setOptions] = useState<ComboboxOption[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [tick, setTick] = useState(0);
  const record = (text: string) => setEvents(old => [...old, text]);
  return <div style={{ minHeight: 1800 }}>
    <button onMouseDown={e => e.preventDefault()} onClick={() => { options.push(...Array.from({ length: 60 }, (_, i) => ({ value: i ? String(i) : '', label: `候補${i}` }))); setOptions(options); setTick(tick + 1); }}>候補を追加</button>
    <Combobox ariaLabel="回帰検証" options={options} value={String(tick)} onOpenChange={v => record(`open:${v}`)} onCaretChange={v => record(`caret:${v}`)} onSelect={v => record(`select:${v}`)} onCommit={v => record(`commit:${v}`)} />
    <output aria-label="通知">{JSON.stringify(events)}</output>
  </div>;
}
export const Regression: Story = { render: () => <RegressionExample /> };
