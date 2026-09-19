// Lucide menu; ISC / Feather MIT. See THIRD_PARTY_NOTICES.md.
// インライン SVG に xmlns は不要。付けると Starlight の Tabs が HTML を組み直すときに :xmlns へ変わり、hydration がずれる。
export interface MenuIconProps {
  size?: number;
}

export default function MenuIcon(props: MenuIconProps) {
  return (
    <svg
      width={props.size ?? 16}
      height={props.size ?? 16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: '0', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }}
    >
      <path d="M4 5h16" />
      <path d="M4 12h16" />
      <path d="M4 19h16" />
    </svg>
  );
}
