/*
 * glow prop: 'blue' | 'green' | 'pink' | 'orange' | undefined
 */
export default function Card({ children, className = '', glow }) {
  const glowShadow = {
    blue:   'shadow-glow-blue',
    green:  'shadow-glow-green',
    pink:   'shadow-glow-pink',
    orange: 'shadow-glow-orange',
  }[glow] ?? '';

  return (
    <div
      className={`bg-surface border border-border rounded-3xl p-5 ${glowShadow} ${className}`}
    >
      {children}
    </div>
  );
}
