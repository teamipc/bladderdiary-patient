/** IPC brand mark — geometric P+I block with IPC text */
export default function IpcLogo({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 180 220"
      width={size}
      height={size * (220 / 180)}
      className={className}
      aria-label="IPC"
    >
      {/* ── Top mark: P + I blocks ── */}
      {/* P shape — use a single path for clean rendering */}
      <path
        d="M8 12C8 5.4 13.4 0 20 0h68c6.6 0 12 5.4 12 12v20c0 6.6-5.4 12-12 12H56v68c0 6.6-5.4 12-12 12H20c-6.6 0-12-5.4-12-12V12z"
        fill="currentColor"
      />
      {/* P cutout — the white space inside the P */}
      <rect x="56" y="44" width="32" height="68" rx="0" fill="white" />

      {/* I bar */}
      <rect x="112" y="0" width="60" height="112" rx="12" fill="currentColor" />

      {/* ── Bottom text: I P C ── */}
      {/* I */}
      <rect x="8" y="132" width="22" height="84" rx="5" fill="currentColor" />

      {/* P */}
      <path
        d="M46 132h32c16 0 28 12.5 28 28s-12 28-28 28H68v28H46V132z"
        fill="currentColor"
      />
      {/* P hole */}
      <rect x="68" y="148" width="16" height="24" rx="8" fill="white" />

      {/* C */}
      <path
        d="M160 132c23 0 20 0 20 0v22h-14c-11 0-20 8-20 18s9 18 20 18h14v22h-20c-26 0-42-18-42-40s16-40 42-40z"
        fill="currentColor"
      />
    </svg>
  );
}
