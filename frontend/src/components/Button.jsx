import Spinner from './Spinner';

const variants = {
  primary: 'bg-primary hover:bg-primary/90 active:bg-primary/80 text-white',
  danger:  'bg-danger hover:bg-danger/90 active:bg-danger/80 text-white',
  ghost:   'border border-border text-muted hover:text-text hover:border-muted active:bg-surface-2',
};

export default function Button({
  children,
  variant = 'primary',
  loading = false,
  className = '',
  ...props
}) {
  return (
    <button
      className={`w-full py-3 px-4 rounded-xl font-medium text-sm
        transition-all duration-150 active:scale-[0.97]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        ${variants[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : children}
    </button>
  );
}
