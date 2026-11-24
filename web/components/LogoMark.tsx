export function LogoMark({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <path
        d="M20.5 9A7.5 7.5 0 0 0 7.8 7.8L5.5 10.1m0-4.6v4.6h4.6M3.5 15a7.5 7.5 0 0 0 12.7 1.2l2.3-2.3m0 4.6v-4.6h-4.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
