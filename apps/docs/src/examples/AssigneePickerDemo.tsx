import { useState } from 'react';
import { AvatarGroup, Picker } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

const photo = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><rect width="2" height="2" fill="%23c4b5df"/><circle cx="1" cy="0.75" r="0.45" fill="%23faf8f5"/><circle cx="1" cy="2.1" r="0.85" fill="%23faf8f5"/></svg>';

const members = [
  { id: 'yamada', name: '山田 太郎', src: photo },
  { id: 'sato', name: '佐藤 花子' },
  { id: 'yupix', name: 'yupix', src: photo },
  { id: 'suzuki', name: '鈴木 一郎' },
  { id: 'takahashi', name: '高橋 次郎' },
];

export default function AssigneePickerDemo() {
  const [assignees, setAssignees] = useState<string[]>(['yamada']);
  const selected = members.filter((member) => assignees.includes(member.id));

  return (
    <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
      <Picker label="担当者" selectionMode="multiple" searchPlaceholder="名前で検索"
        items={members.map((member) => ({ value: member.id, label: member.name }))}
        selectedValues={assignees} onSelectionChange={setAssignees}
        trigger={selected.length > 0
          ? <AvatarGroup label="選択中の担当者" items={selected} max={3} size={24} />
          : '担当者を選ぶ'} />
      <p role="status">担当者: {selected.map((member) => member.name).join('、') || 'なし'}</p>
    </div>
  );
}
