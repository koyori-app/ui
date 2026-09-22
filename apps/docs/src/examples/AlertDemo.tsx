import { useRef, useState } from 'react';
import { Alert } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

export default function AlertDemo() {
  const [status, setStatus] = useState<'idle' | 'error' | 'success'>('idle');
  const submit = useRef<HTMLButtonElement>(null);

  // 閉じたあとのフォーカス先はアプリが決める。ここは操作の起点だった送信ボタン。
  function dismiss() {
    setStatus('idle');
    submit.current?.focus();
  }

  return <div style={{ display: 'grid', gap: 12, maxWidth: 460 }}>
    <button ref={submit} type="button" onClick={() => setStatus('error')}>送信</button>
    {status === 'error' && <Alert message="ネットワークに接続できず、送信できませんでした。"
      onRetry={() => setStatus('success')} onDismiss={dismiss} />}
    {status === 'success' && <Alert variant="success" message="送信しました。" onDismiss={dismiss} />}
  </div>;
}
