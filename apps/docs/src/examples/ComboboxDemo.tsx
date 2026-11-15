import { useMemo, useState } from 'react';
import { Button, Combobox, type ComboboxOption, type ComboboxSection, type ComboboxTag } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

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

export default function ComboboxDemo() {
  const [tags, setTags] = useState<ComboboxTag[]>([]);
  const [value, setValue] = useState('');
  const [message, setMessage] = useState('');

  // 候補の中身と、札・文字列の解釈は利用側で決める。ここでは前方一致の見本を書いている。
  const options = useMemo<ComboboxSection[]>(() => {
    if (value.startsWith('label:')) {
      const prefix = value.slice('label:'.length);
      return [
        {
          heading: 'label: の候補',
          options: labels.filter(l => l.value.startsWith(prefix)).map(l => ({
            value: `label:${l.value}`, label: l.value, color: l.color, meta: `${l.count} 件`, highlight: [[0, prefix.length]] as [number, number][],
          })),
        },
        { options: [{ value: 'no:label', label: 'no:label', description: 'ラベルが無いタスク' }] },
      ];
    }
    const matched = keys.filter(k => k.value.startsWith(value)).map(k => ({ ...k, highlight: [[0, value.length]] as [number, number][] }));
    return matched.length ? [{ heading: '条件', options: matched }] : [];
  }, [value]);

  function add(text: string) {
    const i = text.indexOf(':');
    setTags(current => [...current, i > 0 ? { prefix: text.slice(0, i + 1), label: text.slice(i + 1) } : { label: text }]);
    setValue('');
  }

  return <div style={{ display: 'grid', gap: 12, maxWidth: 480, minHeight: 340, alignContent: 'start' }}>
    <Combobox ariaLabel="タスクを検索" placeholder="タスクを検索..." value={value} tags={tags} options={options}
      autoHighlight={value.startsWith('label:')} onValueChange={next => setValue(next)}
      onSelect={next => {
        setMessage(`選択: ${next}`);
        if (next.endsWith(':')) setValue(next);
        else add(next);
      }}
      onCommit={next => {
        setMessage(`確定: ${next || '（空）'}`);
        if (next) add(next);
      }}
      onTagRemove={index => {
        setMessage(`外した札: ${tags[index].prefix ?? ''}${tags[index].label}`);
        setTags(current => current.filter((_, i) => i !== index));
      }}
      suffix={<Button variant="ghost" ariaLabel="書き方の早見表" icon="?" />}
      footer="↑↓ で選ぶ　Enter で入れる　Esc で閉じる" />
    <p role="status" style={{ margin: 0 }}>{message}</p>
  </div>;
}
