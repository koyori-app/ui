import { useEffect, useRef, useState } from 'react';
import { AvatarGroup, Button, Checkbox, Picker, ProgressBar } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';
import './task-properties-demo.css';

const members = [{ id: 'yamada', name: '山田 太郎' }, { id: 'sato', name: '佐藤 花子' }, { id: 'suzuki', name: '鈴木 一郎' }];
const statuses = [{ value: 'todo', label: '未着手' }, { value: 'doing', label: '進行中' }, { value: 'done', label: '完了' }];

export default function TaskPropertiesDemo() {
  // Keep this initial snapshot identical on the server and the client.
  const [assignees, setAssignees] = useState(['yamada']);
  const [status, setStatus] = useState('doing');
  const [canEdit, setCanEdit] = useState(true);
  const [candidatesState, setCandidatesState] = useState('ready');
  const assigneeControl = useRef<HTMLDivElement>(null);
  const retrying = useRef(false);
  const selected = members.filter(member => assignees.includes(member.id));
  const names = selected.map(member => member.name).join('、') || '未割り当て';
  const message = ({ loading: '候補を読み込み中…', error: '候補を取得できませんでした。', empty: '担当者に指定できる利用者がいません。' })[candidatesState as 'loading' | 'error' | 'empty'] || '';
  useEffect(() => {
    if (candidatesState === 'ready' && retrying.current) {
      retrying.current = false;
      if (canEdit) assigneeControl.current?.querySelector('button')?.focus();
    }
  }, [candidatesState, canEdit]);
  async function retry() {
    setCandidatesState('loading');
    // Replace this demo delay with task's fetch/retry; keep selection on failure.
    await new Promise(resolve => setTimeout(resolve, 300));
    retrying.current = true;
    setCandidatesState('ready');
  }

  return <section className="task-properties-demo" data-task-properties="react" aria-label="Reactのタスクプロパティ">
    <h3>請求書を送る</h3>
    <dl className="task-properties-list">
      <div data-property="assignees">
        <dt>担当者</dt>
        <dd>
          <div ref={assigneeControl}>
            {canEdit && candidatesState === 'ready'
              ? <Picker label="担当者" items={members.map(member => ({ value: member.id, label: member.name }))} avatars selectionMode="multiple"
                  selectedValues={assignees} onSelectionChange={setAssignees}
                  trigger={<span className="task-property-value"><AvatarGroup label="選択中の担当者" items={selected} size={24} max={3} /><span>{names}</span></span>} />
              : <div className="task-property-readonly"><span className="task-property-value"><AvatarGroup label="選択中の担当者" items={selected} size={24} max={3} /><span>{names}</span></span></div>}
          </div>
          <p className="task-property-message" role="status">{message}</p>
          {canEdit && candidatesState === 'error' && <Button label="候補を再取得" variant="tertiary" onClick={retry} />}
        </dd>
      </div>
      <div data-property="status">
        <dt>状態</dt>
        <dd>{canEdit
          ? <Picker label="状態" items={statuses} searchable={false} selectedValues={[status]} onSelectionChange={values => setStatus(values[0])} />
          : <span className="task-property-readonly">{statuses.find(item => item.value === status)?.label}</span>}</dd>
      </div>
      <div data-property="progress"><dt>進捗</dt><dd><ProgressBar label="請求書を送るの進捗" value={40} hideLabel /></dd></div>
    </dl>
    <p data-selection-summary>担当者: {names} / 状態: {statuses.find(item => item.value === status)?.label}</p>
    <fieldset className="task-property-scenarios">
      <legend>利用側の状態を試す</legend>
      <label>候補取得 <select value={candidatesState} onChange={event => setCandidatesState(event.target.value)}><option value="ready">取得済み</option><option value="loading">読み込み中</option><option value="error">取得失敗</option><option value="empty">候補なし</option></select></label>
      <Checkbox label="編集を許可" checked={canEdit} onCheckedChange={setCanEdit} />
    </fieldset>
  </section>;
}
