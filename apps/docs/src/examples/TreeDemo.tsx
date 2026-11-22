import { useState } from 'react';
import { Tree, type TreeNode } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

// 行の右の件数は「解決 / 全体」。何を赤にするかはアプリ側で決める。
const nodes: TreeNode[] = [
  { id: 'lib', label: 'src/lib', children: [
    { id: 'lib/state', label: 'list-state.ts', badge: { label: '2 / 3', tone: 'danger' } },
    { id: 'lib/url', label: 'list-url.ts', badge: { label: '2 / 2', tone: 'success' } },
  ] },
  { id: 'pages', label: '…/projects/@key/tasks', title: 'src/pages/projects/@key/tasks', children: [
    { id: 'pages/page', label: '+Page.vue', badge: { label: '0 / 1', tone: 'danger' } },
  ] },
];

export default function TreeDemo() {
  const [selected, setSelected] = useState<string | null>('lib/state');
  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 260 }}>
      <Tree label="ファイル" heading="ファイル · 3" nodes={nodes} leafIcon="file"
        selectedId={selected} onSelect={setSelected} />
      <p role="status">選択中: {selected}</p>
    </div>
  );
}
