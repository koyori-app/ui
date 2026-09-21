import { useState } from 'react';
import { Button, SplitPane } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

export default function SplitPaneDemo() {
  const [size, setSize] = useState(240);
  return <div>
    <p>一覧の希望幅: {Math.round(size)}px。境界はドラッグ、← / →、Home / End で動かせます。</p>
    <div style={{ height: 240, border: '1px solid var(--koyori-color-border)' }}>
      <SplitPane label="タスク一覧" primaryId="docs-react-tasks" ariaLabelledBy="docs-react-tasks-title"
        size={size} minSize={160} minSecondarySize={160} onSizeChange={setSize}
        primary={<section style={{ padding: 16 }}><h3 id="docs-react-tasks-title">タスク一覧</h3><Button label="期限を確認する" variant="ghost" /></section>}
        secondary={<section style={{ padding: 16 }}><h3>詳細</h3><p>日程と担当者を確認します。</p><Button label="詳細を開く" variant="secondary" /></section>}
      />
    </div>
  </div>;
}
