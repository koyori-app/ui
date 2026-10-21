import { useState } from 'react';
import { Spinner } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

export default function SpinnerDemo() {
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<string[]>([]);

  // 取得の代わりに少し待つ。読み込み中は領域に aria-busy を付け、終わったら外す。
  function load() {
    setLoading(true);
    setComments([]);
    setTimeout(() => {
      setComments(['デザインを確認しました。', '来週のリリースに入れます。']);
      setLoading(false);
    }, 1500);
  }

  return <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
    <button type="button" onClick={load}>コメントを読み込む</button>
    <div className="koyori-card" aria-busy={loading ? 'true' : undefined} style={{ display: 'grid', placeItems: 'center', minHeight: 96 }}>
      {loading ? <Spinner label="コメントを読み込み中" />
        : comments.length ? <ul style={{ margin: 0, justifySelf: 'stretch' }}>
          {comments.map(comment => <li key={comment}>{comment}</li>)}
        </ul>
          : <p style={{ margin: 0 }}>まだ読み込んでいません。</p>}
    </div>
  </div>;
}
