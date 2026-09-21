import { useState } from 'react';
import { Tabs, TabPanel } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

const items = [{ value: 'list', label: 'リスト' }, { value: 'board', label: 'ボード' }];
export default function TabsDemo() {
  const [view, setView] = useState('list');
  return <Tabs id="react-task-views" label="タスクの表示形式" items={items} value={view} onValueChange={setView}>
    <TabPanel value="list"><p>タスクを行で並べる表示です。</p><input aria-label="リストの下書き" placeholder="切り替えても入力を保持します" /></TabPanel>
    <TabPanel value="board"><p>状態ごとにタスクを並べる表示です。</p></TabPanel>
  </Tabs>;
}
