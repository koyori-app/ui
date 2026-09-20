import { useState } from 'react';
import { Calendar } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

const isWeekend = (date: string) => [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay());

export default function CalendarDemo() {
  const [date, setDate] = useState('2026-09-18');
  return <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
    <Calendar label="配送日" value={date} onValueChange={setDate} locale="ja-JP" today="2026-09-16"
      min="2026-09-16" max="2026-12-31" isDateDisabled={isWeekend} />
    <p style={{ margin: 0 }}>配送日: {date}</p>
  </div>;
}
