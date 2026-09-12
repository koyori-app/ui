import { useState } from 'react';
import { Dropdown, Picker, EllipsisIcon } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

export default function DropdownDemo() {
  const [action, setAction] = useState('未実行');
  const [status, setStatus] = useState<string[]>(['todo']);
  const [labels, setLabels] = useState<string[]>([]);
  const statusItems = [
    { value: 'todo', label: '未着手' },
    { value: 'doing', label: '進行中' },
    { value: 'done', label: '完了' },
  ];
  const labelItems = [
    { value: 'design', label: 'デザイン' },
    { value: 'frontend', label: 'フロントエンド' },
    { value: 'backend', label: 'バックエンド' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <Dropdown label="タスクの操作"
          items={[{ value: 'copy', label: 'リンクをコピー' },
            { value: 'archive', label: 'アーカイブ', disabled: true }]}
          icon={<EllipsisIcon size={16} />} onSelect={setAction} />
        <Picker label="ステータス" items={statusItems} searchable={false}
          selectionMode="single" selectedValues={status}
          onSelectionChange={setStatus} />
        <Picker label="ラベル" items={labelItems} searchable={false}
          selectionMode="multiple" selectedValues={labels}
          onSelectionChange={setLabels} />
      </div>
      <p role="status">
        操作: {action} ／ ステータス: {status.join(', ') || '未選択'}
        ／ ラベル: {labels.join(', ') || '未選択'}
      </p>
    </div>
  );
}
