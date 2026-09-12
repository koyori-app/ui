import { useState } from 'react';
import { Avatar, AvatarGroup } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

const photo = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><rect width="2" height="2" fill="%23c4b5df"/><circle cx="1" cy="0.75" r="0.45" fill="%23faf8f5"/><circle cx="1" cy="2.1" r="0.85" fill="%23faf8f5"/></svg>';

const members = [
  { name: '山田 太郎', src: photo },
  { name: '佐藤 花子' },
  { name: 'yupix', src: photo },
  { name: '鈴木 一郎' },
  { name: '高橋 次郎' },
];

export default function AvatarDemo() {
  const [max, setMax] = useState(3);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar name="山田 太郎" src={photo} />
        <Avatar name="佐藤 花子" />
        <Avatar name="yupix" size={48} />
      </div>
      <AvatarGroup label="タスクの担当者" items={members} max={max} />
      <p>
        <label>
          表示する最大人数: {max}
          <input type="range" min={1} max={5} value={max}
            onChange={(event) => setMax(Number(event.target.value))} />
        </label>
      </p>
    </div>
  );
}
