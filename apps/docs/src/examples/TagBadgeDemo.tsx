import { useRef, useState } from 'react';
import { Badge, Tag } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

const initialLabels = ['デザイン', 'アクセシビリティ'];

export default function TagBadgeDemo() {
  const [labels, setLabels] = useState(initialLabels);
  const [message, setMessage] = useState('');
  const list = useRef<HTMLDivElement>(null);
  const reset = useRef<HTMLButtonElement>(null);

  function remove(label: string) {
    // 次、前、リセットの順にフォーカスを移してから、アプリ側で削除する。
    const buttons = list.current?.querySelectorAll('button');
    const index = labels.indexOf(label);
    (buttons?.[index + 1] ?? buttons?.[index - 1] ?? reset.current)?.focus();
    setLabels(labels.filter(value => value !== label));
    setMessage(`${label}を削除しました`);
  }

  return <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
    <p>ステータス: <Badge label="進行中" dotColor="var(--koyori-color-accent)" /> <Badge label="完了" dotColor="#23704b" size="md" /></p>
    <p>ラベル件数: <Badge label={labels.length} /></p>
    <div ref={list} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {labels.map(label => <Tag key={label} label={label} dotColor="var(--koyori-color-accent)" onRemove={() => remove(label)} />)}
    </div>
    <button ref={reset} type="button" onClick={() => { setLabels(initialLabels); setMessage('ラベルを戻しました'); }}>ラベルを戻す</button>
    <p role="status">{message}</p>
    <Tag label="削除しないラベル" size="md" />
    <div style={{ width: 220, maxWidth: '100%' }}><Tag label="リリース前に確認するアクセシビリティとキーボード操作" /></div>
  </div>;
}
