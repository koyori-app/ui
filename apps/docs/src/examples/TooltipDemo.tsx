import { Button, EllipsisIcon, Tooltip } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

export default function TooltipDemo() {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, padding: 24 }}>
    <Tooltip id="react-actions-help" content="タスクの移動・複製などを選びます。">
      <Button ariaLabel="その他の操作" variant="tertiary" icon={<EllipsisIcon />} />
    </Tooltip>
    <Tooltip id="react-title-help" content="今月の全プロジェクトの進捗をまとめたレポート" placement="bottom">
      <a href="#使い方" style={{ maxWidth: 180, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>今月の全プロジェクトの進捗をまとめたレポート</a>
    </Tooltip>
    <Tooltip id="react-disabled-help" content="削除する権限がありません。">
      <span tabIndex={0} role="group" aria-label="削除できない理由">
        <span style={{ pointerEvents: 'none' }}><Button label="削除" disabled /></span>
      </span>
    </Tooltip>
  </div>;
}
