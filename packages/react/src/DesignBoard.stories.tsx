import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Alert, Avatar, Badge, Button, Checkbox, Field, Input, Meter, ProgressBar, Switch, TabPanel, Tabs, Tag } from './index';
import './design-board.css';

/* デザインシステムの見本ボード。部品はすべて本物で、色と形はトークンだけで決まる。
   Dark は data-theme="dark" の div で包み、ツールバーに頼らず VRT でも必ず撮れるようにする。 */
const SWATCHES: [string, string][] = [
  ['surface', '--koyori-color-surface'], ['text', '--koyori-color-text'], ['muted', '--koyori-color-text-muted'], ['border', '--koyori-color-border'],
  ['accent', '--koyori-color-accent'], ['on-accent', '--koyori-color-on-accent'], ['soft', '--koyori-color-accent-soft'], ['subtle', '--koyori-color-accent-subtle'],
  ['hover', '--koyori-color-surface-hover'], ['active', '--koyori-color-surface-active'],
  ['success', '--koyori-color-success'], ['info', '--koyori-color-info'], ['warning', '--koyori-color-warning'], ['danger', '--koyori-color-danger'],
];

// 状態の色は利用側（アプリ）が決めるもので、トークンではない。Tag と Badge は dotColor で外から受け取る。
const STATUS: Record<string, { label: string; color: string }> = {
  backlog: { label: 'Backlog', color: '#8d8f9d' },
  todo: { label: 'Todo', color: '#5b8def' },
  doing: { label: 'In Progress', color: '#f0a020' },
  review: { label: 'Reviewing', color: '#9b6bf0' },
  done: { label: 'Done', color: '#2fa36b' },
};
const TASKS = [
  { id: 'TASK-458', title: 'ホームでタスクを作ったら、リンク付きで通知する', status: 'doing', who: '山田 太郎', due: '11/12', prio: 'High', done: false },
  { id: 'TASK-156', title: 'タスク詳細の項目を保存したときの表示を直す', status: 'review', who: 'mika', due: '11/11', prio: 'Medium', done: false },
  { id: 'TASK-312', title: 'ステータスを Reviewing に移したときの元に戻す', status: 'todo', who: 'yupix', due: '11/15', prio: 'Medium', done: false },
  { id: 'TASK-77', title: 'リリースノートを書く', status: 'backlog', who: '佐藤 花子', due: '11/20', prio: 'Low', done: false },
  { id: 'TASK-12', title: 'ログイン画面の文言を直す', status: 'done', who: 'yupix', due: '11/05', prio: 'Low', done: true },
];
const PRIORITY_COLOR: Record<string, string> = { High: 'var(--koyori-color-danger)', Medium: 'var(--koyori-color-warning)', Low: 'var(--koyori-color-text-muted)' };
const TAB_ITEMS = [{ value: 'list', label: 'リスト' }, { value: 'board', label: 'ボード' }, { value: 'cal', label: 'カレンダー' }];

function Board() {
  const [tab, setTab] = useState('list');
  const [checks, setChecks] = useState([false, true, false, true]);
  const done = checks.filter(Boolean).length;
  return (
    <div className="design-board">
      <h1>デザインボード</h1>

      <h2>色</h2>
      <div className="swatches">
        {SWATCHES.map(([name, token]) => <div key={name} className="swatch"><i style={{ background: `var(${token})` }} /><span>{name}</span></div>)}
      </div>

      <h2>画面の見本</h2>
      <div className="panel app">
        <nav className="side" aria-label="見本のサイドバー">
          <b>Koyori</b>
          <div className="nav on">ホーム</div><div className="nav">マイタスク</div><div className="nav">スプリント</div><div className="nav">レビュー</div><div className="nav">通知</div>
        </nav>
        <div className="main">
          <div className="head">
            <h3>sprint 12 のタスク</h3>
            <div className="row"><Button label="フィルター" variant="secondary" /><Button label="タスクを作成" variant="primary" /></div>
          </div>
          <Tabs id="board-tabs" label="表示" items={TAB_ITEMS} value={tab} onValueChange={setTab}>
            <TabPanel value="list"><span /></TabPanel><TabPanel value="board"><span /></TabPanel><TabPanel value="cal"><span /></TabPanel>
          </Tabs>
          {TASKS.map(t => (
            <div key={t.id} className="task">
              <Checkbox label={`${t.id} を選択`} hideLabel checked={t.done} />
              <div className="title"><small>{t.id}</small>　{t.title}</div>
              <Tag label={STATUS[t.status].label} dotColor={STATUS[t.status].color} size="sm" />
              <Badge label={t.prio} size="sm" dotColor={PRIORITY_COLOR[t.prio]} />
              <span className="row" style={{ gap: 6 }}><Avatar name={t.who} size={24} /><small>{t.due}</small></span>
            </div>
          ))}
        </div>
        <aside className="detail" aria-label="見本の詳細">
          <h4>TASK-458</h4>
          <Field id="board-title" label="タイトル" description="一覧に表示される名前です。"><Input value="ホームでタスクを作ったら、リンク付きで通知する" /></Field>
          <Field id="board-note" label="メモ" error="メモは 200 文字以内で入力してください。"><Input placeholder="例: 通知の文言" /></Field>
          <Switch label="完了したら通知する" defaultChecked />
          <ProgressBar label="チェックリスト" value={done * 25} valueText={`${done} / 4 件`} />
          <div className="stack">
            {checks.map((c, i) => <Checkbox key={i} label={`確認項目 ${i + 1}`} checked={c} onCheckedChange={v => setChecks(cur => cur.map((x, j) => (j === i ? v : x)))} />)}
          </div>
        </aside>
      </div>

      <h2>ボタンと部品</h2>
      <div className="two">
        <div className="panel stack">
          <div className="row"><Button label="Primary" variant="primary" /><Button label="Secondary" variant="secondary" /><Button label="Tertiary" variant="tertiary" /><Button label="Ghost" variant="ghost" /><Button label="Danger" variant="danger" /><Button label="Disabled" variant="primary" disabled /></div>
          <div className="row"><Tag label="デザイン" dotColor="var(--koyori-color-accent)" /><Tag label="バグ" dotColor="var(--koyori-color-danger)" /><Tag label="新機能" dotColor="var(--koyori-color-info)" /><Badge label="12" /><Avatar name="山田 太郎" /><Avatar name="mika" /></div>
          <Meter label="パスワードの強度" value={2} valueText="普通" />
        </div>
        <div className="panel stack">
          <Alert variant="success" message="下書きを保存しました。" />
          <Alert variant="info" message="3 月 1 日からメールの形式が変わります。" />
          <Alert variant="warning" message="公開予定日が過ぎています。" />
          <Alert variant="danger" message="保存できませんでした。時間をおいて試してください。" onRetry={() => {}} />
        </div>
      </div>
    </div>
  );
}

const meta = {
  title: 'Design/Board',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = { render: () => <Board /> };
export const Dark: Story = { render: () => <div data-theme="dark"><Board /></div> };
