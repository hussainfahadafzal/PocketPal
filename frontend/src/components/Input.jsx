export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          {label}
        </label>
      )}
      <input
        className={`bg-surface-2 border ${error ? 'border-danger' : 'border-border'}
          rounded-xl px-4 py-3 text-text text-sm outline-none
          focus:border-primary transition-all duration-150 placeholder:text-muted/40
          ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
