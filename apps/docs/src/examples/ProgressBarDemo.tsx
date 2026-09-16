import { useState } from 'react';
import { Checkbox, ProgressBar } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

const items = ['要件を書く', 'デザインを決める', '実装する', 'レビューを受ける', '公開する'];

export default function ProgressBarDemo() {
  const [done, setDone] = useState<string[]>([items[0]]);
  return <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
    <ProgressBar label="チェックリストの達成率" value={done.length} max={items.length}
      valueText={`${done.length} / ${items.length} 件`} />
    {items.map(item => (
      <Checkbox key={item} label={item} checked={done.includes(item)}
        onCheckedChange={checked => setDone(checked ? [...done, item] : done.filter(name => name !== item))} />
    ))}
  </div>;
}
