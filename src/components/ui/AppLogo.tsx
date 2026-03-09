/** App logo: small closed teardrop + large open curved drop */
export default function AppLogo({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 26 26"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="My Flow Check"
    >
      {/* Small closed teardrop (left) */}
      <path d="M9.5 7.5c0 0-4 4.5-4 7.2 0 2.2 1.8 4 4 4s4-1.8 4-4c0-2.7-4-7.2-4-7.2z"/>
      {/* Large open curved drop (right) */}
      <path d="M19 4.5c0 0-6.5 6-6.5 11 0 4 2.8 7 6.5 7 2.8 0 5-2 5.5-4.5"/>
    </svg>
  );
}
