// Lucide eye; ISC. See THIRD_PARTY_NOTICES.md.
// インライン SVG に xmlns は不要。付けると Starlight の Tabs が HTML を組み直すときに :xmlns へ変わり、hydration がずれる。
export interface EyeIconProps {
  size?: number;
}

export default function EyeIcon(props: EyeIconProps) {
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
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
