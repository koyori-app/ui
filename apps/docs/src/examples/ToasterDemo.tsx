import { Toaster, toast } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

export default function ToasterDemo() {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
    <button type="button" onClick={() => toast.success('保存しました。')}>保存</button>
    <button type="button"
      onClick={() => toast.success('タスクを作成しました。', { action: { label: 'タスクを開く', href: '#' } })}>作成</button>
    <button type="button" onClick={() => toast.error('保存できませんでした。時間をおいて試してください。')}>失敗</button>
    <Toaster />
  </div>;
}
