// Lucide check; ISC / Feather MIT. See THIRD_PARTY_NOTICES.md.
export interface CheckIconProps {
  size?: number;
}

export default function CheckIcon(props: CheckIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size ?? 16}
      height={props.size ?? 16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: '0', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
