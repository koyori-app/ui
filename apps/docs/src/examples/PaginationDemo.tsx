import { useState } from 'react';
import { Pagination } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

const tasks = Array.from({ length: 47 }, (_, index) => `タスク ${index + 1}`);
const pageSize = 10;

export default function PaginationDemo() {
  // ページはアプリが持つ。実際のアプリでは URL のクエリと同期することが多い。
  const [page, setPage] = useState(1);
  const visible = tasks.slice((page - 1) * pageSize, page * pageSize);

  return <div style={{ display: 'grid', gap: 12, maxWidth: 480 }}>
    <ul style={{ margin: 0 }}>
      {visible.map(task => <li key={task}>{task}</li>)}
    </ul>
    <Pagination page={page} pageSize={pageSize} total={tasks.length} onPageChange={setPage} />
  </div>;
}
