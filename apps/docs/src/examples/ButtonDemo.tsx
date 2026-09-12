import { useState } from 'react';
import { Button } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

export default function ButtonDemo() {
  const [disabled, setDisabled] = useState(false);
  const [clicks, setClicks] = useState(0);
  const variants = ['primary', 'secondary', 'tertiary', 'ghost'] as const;

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {variants.map((variant) => (
          <Button
            key={variant}
            label={variant[0].toUpperCase() + variant.slice(1)}
            variant={variant}
            disabled={disabled}
            onClick={() => setClicks((count) => count + 1)}
          />
        ))}
      </div>
      <p>
        <label>
          <input type="checkbox" checked={disabled}
            onChange={(event) => setDisabled(event.target.checked)} /> 無効にする
        </label>
      </p>
      <p role="status">クリック回数: {clicks}</p>
    </div>
  );
}
