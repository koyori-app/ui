import { useState } from 'react';
import { Button, Picker } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

const Flag = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
    <path d="M3 14V2.5h9.5l-2 3 2 3H3" />
  </svg>
);
const priorities = [
  { value: 'urgent', label: '緊急', icon: <Flag color="#dc2626" /> },
  { value: 'high', label: '高', icon: <Flag color="#f97316" /> },
  { value: 'medium', label: '中', icon: <Flag color="#eab308" /> },
  { value: 'low', label: '低', icon: <Flag color="#6b7280" /> },
  { value: 'none', label: '未設定' },
];

export default function PickerDemo() {
  const [teams, setTeams] = useState<string[]>(['design']);
  const items = [
    { value: 'design', label: 'デザイン' },
    { value: 'frontend', label: 'Frontend' },
    { value: 'backend', label: 'Backend' },
    { value: 'review', label: 'レビュー' },
    { value: 'support', label: 'サポート', disabled: true },
  ];
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <Picker label="担当チーム" items={items} />
        <Picker label="共有チーム" items={items} selectionMode="multiple"
          selectedValues={teams} onSelectionChange={setTeams} />
        <Picker label="優先度" items={priorities} searchable={false} />
        <Button label="共有チームをクリア" variant="ghost" onClick={() => setTeams([])} />
      </div>
      <p role="status">共有: {items.filter((item) => teams.includes(item.value)).map((item) => item.label).join('、') || '未選択'}</p>
    </div>
  );
}
