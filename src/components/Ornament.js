// Pequeña ornamentación decorativa elegante.
export default function Ornament({ className = '', size = 36 }) {
  return (
    <svg
      className={className}
      width={size} height={size / 2}
      viewBox="0 0 120 60"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <path d="M2 30 L48 30" />
      <path d="M72 30 L118 30" />
      <circle cx="60" cy="30" r="4" />
      <path d="M52 30 Q60 18 68 30 Q60 42 52 30 Z" fill="currentColor" opacity="0.18" />
    </svg>
  );
}
