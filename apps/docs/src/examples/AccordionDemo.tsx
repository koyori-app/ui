import { useState } from 'react';
import { Accordion } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

export default function AccordionDemo() {
  const [opened, setOpened] = useState<string | null>('general');
  return <div style={{ maxWidth: 480 }}>
    <Accordion id="react-doc-general" label="ワークスペースについて" open={opened === 'general'} onOpenChange={open => setOpened(open ? 'general' : null)}>
      <p style={{ margin: 0 }}>プロジェクト、メンバー、通知をひとつの場所で管理できます。</p>
    </Accordion>
    <Accordion id="react-doc-members" label="メンバーを招待するには？" open={opened === 'members'} onOpenChange={open => setOpened(open ? 'members' : null)}>
      <p style={{ margin: 0 }}>チームの設定から招待できます。招待した人にはメールが届きます。</p>
    </Accordion>
    <Accordion id="react-doc-notices" label="通知を変更するには？" open={opened === 'notices'} onOpenChange={open => setOpened(open ? 'notices' : null)}>
      <p style={{ margin: 0 }}>通知の設定で、受け取りたい更新だけを選べます。</p>
    </Accordion>
  </div>;
}
