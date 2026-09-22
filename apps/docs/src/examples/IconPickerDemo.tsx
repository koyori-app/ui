import { useState } from 'react';
import { IconPicker } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

const emojis = ['🌱', '📘', '🛠️', '🎯', '🚀', '🧪', '🍎', '🗂️'];

export default function IconPickerDemo() {
  const [emoji, setEmoji] = useState('📘');
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState('');

  // MIME とサイズの検証、アップロード、保存はアプリ側の責務。ここでは受け取るだけ。
  function select(file: File) {
    if (!file.type.startsWith('image/')) { setMessage('画像ファイルを選んでください。'); return; }
    if (file.size > 1024 * 1024) { setMessage('1MB 以下の画像を選んでください。'); return; }
    setMessage(`${file.name} を選びました。`);
    setImageUrl(URL.createObjectURL(file));
  }

  return <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
    <IconPicker label="プロジェクトのアイコン" emojis={emojis} emoji={emoji} imageUrl={imageUrl}
      onEmojiChange={value => { setEmoji(value); setImageUrl(undefined); setMessage(''); }}
      onImageSelect={select}
      onImageRemove={() => { setImageUrl(undefined); setMessage('画像を削除しました。'); }} />
    <p role="status" style={{ margin: 0 }}>{message}</p>
  </div>;
}
