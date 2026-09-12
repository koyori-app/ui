import { useState } from 'react';
import { Button, ButtonGroup, EllipsisIcon } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

export default function ButtonGroupDemo() {
  const [action, setAction] = useState('未実行');

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Button label="戻る" variant="tertiary" onClick={() => setAction('戻る')} />
        <ButtonGroup label="整理">
          <Button label="アーカイブ" variant="tertiary" onClick={() => setAction('アーカイブ')} />
          <Button label="報告" variant="tertiary" onClick={() => setAction('報告')} />
        </ButtonGroup>
        <ButtonGroup label="通知">
          <Button label="スヌーズ" variant="tertiary" onClick={() => setAction('スヌーズ')} />
          <Button ariaLabel="その他の操作" icon={<EllipsisIcon size={16} />} variant="tertiary"
            onClick={() => setAction('その他の操作')} />
        </ButtonGroup>
      </div>
      <p role="status">操作: {action}</p>
    </div>
  );
}
