export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-surface border border-border rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  );
}
