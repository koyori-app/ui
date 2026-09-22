import { useState } from 'react';
import { Avatar, Checkbox, Skeleton } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

export default function SkeletonDemo() {
  const [loading, setLoading] = useState(true);
  return <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
    <Checkbox label="読み込み中" checked={loading} onCheckedChange={setLoading} />
    <div aria-busy={loading ? 'true' : undefined}
      style={{ display: 'grid', gap: 12, padding: 16, border: '1px solid var(--koyori-color-border)', borderRadius: 12 }}>
      {/* 常設の live region。読み上げは Skeleton ではなくこちらが担う。 */}
      <p role="status" style={{ margin: 0, fontSize: '0.875rem' }}>{loading ? 'プロフィールを読み込み中' : ''}</p>
      {loading ? <>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Skeleton width="40px" height="40px" radius="50%" />
          <Skeleton width="120px" height="16px" />
        </div>
        <Skeleton lines={3} />
      </> : <>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Avatar name="山田 太郎" size={40} />
          <span>山田 太郎</span>
        </div>
        <p style={{ margin: 0 }}>
          2025 年 4 月からタスク管理チームの担当です。週次の棚卸しと、アクセシビリティ検証の進行を受け持っています。
        </p>
      </>}
    </div>
  </div>;
}
