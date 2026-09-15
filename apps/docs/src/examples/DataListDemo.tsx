import { useState } from 'react';
import { Checkbox, DataList, DataListRow, AvatarGroup, Picker } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

export default function DataListDemo() {
  const [selected, setSelected] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<Record<string, string[]>>({ 'TASK-140': ['yupix'], 'TASK-141': ['sousuke'] });
  const people = [{ value: 'yupix', label: 'yupix' }, { value: 'sousuke', label: 'sousuke' }];
  const columns = [
    { id: 'selection', label: '選択', width: '3.5rem' },
    { id: 'title', label: 'タイトル' },
    { id: 'owner', label: '担当者', width: '9rem' },
    { id: 'priority', label: '優先度', width: '8rem' },
  ];
  const groups = [
    { id: 'doing', label: '進行中', tasks: [{ id: 'TASK-140', title: '一覧のデザインを整える' }, { id: 'TASK-141', title: 'キーボード操作を確認する' }] },
    { id: 'done', label: '完了', tasks: [] },
  ];
  const priorities = [{ value: 'normal', label: '通常' }, { value: 'high', label: '高い' }];
  return <div style={{ display: 'grid', gap: 16 }}>
    {groups.map(group => <DataList key={group.id} id={`react-${group.id}`}
      label={group.label} columns={columns} count={group.tasks.length}
      status={group.tasks.length ? 'ready' : 'empty'} collapsible>
      {group.tasks.map(task => <DataListRow key={task.id} selected={selected.includes(task.id)}>
        <td><Checkbox label={`${task.id} を選択`} hideLabel checked={selected.includes(task.id)}
          onCheckedChange={checked => setSelected(current => checked ? [...current, task.id] : current.filter(id => id !== task.id))} /></td>
        <th scope="row">{task.title}</th>
        <td><Picker label={`${task.title}の担当者`} items={people} avatars selectionMode="multiple" searchable={false}
          selectedValues={assignees[task.id]} onSelectionChange={values => setAssignees(current => ({ ...current, [task.id]: values }))}
          trigger={assignees[task.id].length
            ? <AvatarGroup label="選択中の担当者" size={24} max={3} items={people.filter(person => assignees[task.id].includes(person.value)).map(person => ({ name: person.label }))} />
            : '未割り当て'} /></td>
        <td><Picker label={`${task.title}の優先度`} items={priorities} searchable={false} defaultSelectedValues={['normal']} /></td>
      </DataListRow>)}
    </DataList>)}
    <p role="status">選択中: {selected.join('、') || 'なし'}</p>
  </div>;
}
