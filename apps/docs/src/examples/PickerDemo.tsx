import { useState } from 'react';
import { Button, Picker } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

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
        <Button label="共有チームをクリア" variant="ghost" onClick={() => setTeams([])} />
      </div>
      <p role="status">共有: {items.filter((item) => teams.includes(item.value)).map((item) => item.label).join('、') || '未選択'}</p>
    </div>
  );
}
