import { IconTile } from '@koyori-app/ui-react';
import '@koyori-app/ui-react/style.css';

const image = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#3b82f6"/><circle cx="40" cy="40" r="20" fill="#fbbf24"/></svg>')}`;
const row = { display: 'flex', alignItems: 'center', gap: 8 } as const;

// タイルは読み上げから外れるので、名前は隣の文字や包む側の aria-label で伝える。
export default function IconTileDemo() {
  return (
    <ul style={{ display: 'flex', gap: 16, margin: 0, padding: 0, listStyle: 'none' }}>
      <li style={row}><IconTile name="Acme" src={image} />Acme</li>
      <li style={row}><IconTile name="お茶会" emoji="🍵" />お茶会</li>
      <li style={row}><IconTile name="𠮷野商店" />𠮷野商店</li>
      <li style={row}><IconTile name="小さい" emoji="🌿" size={24} />24px</li>
    </ul>
  );
}
