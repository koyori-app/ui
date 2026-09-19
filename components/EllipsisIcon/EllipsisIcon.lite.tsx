// Lucide ellipsis; ISC / Feather MIT. See THIRD_PARTY_NOTICES.md.
// インライン SVG に xmlns は不要。付けると Starlight の Tabs が HTML を組み直すときに :xmlns へ変わり、hydration がずれる。
export interface EllipsisIconProps {
  size?: number;
}

export default function EllipsisIcon(props: EllipsisIconProps) {
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
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}
