/**
 * TDR wordmark placeholder — inline SVG so no external asset loads.
 * GAP-002: replace with the production logo artwork (legacy site asset is
 * unreachable from this environment). Red = brand pulse (--redline).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 84 24"
      className={className}
      role="img"
      aria-label="TDR"
      fill="none"
    >
      <text
        x="0"
        y="19"
        fontFamily="var(--font-display)"
        fontWeight="700"
        fontSize="22"
        letterSpacing="1"
        fill="var(--color-redline)"
      >
        TDR
      </text>
      <path d="M56 4 L76 4 L72 8 L52 8 Z" fill="var(--color-redline)" opacity="0.9" />
      <path d="M52 16 L72 16 L68 20 L48 20 Z" fill="var(--color-redline)" opacity="0.55" />
    </svg>
  );
}
