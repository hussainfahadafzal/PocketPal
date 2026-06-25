import Spinner from './Spinner';

const variants = {
  primary: 'bg-primary hover:bg-primary/90 text-white',
  danger: 'bg-danger hover:bg-danger/90 text-white',
  ghost: 'border border-border text-muted hover:text-text hover:border-muted',
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
      className={`w-full py-3 px-4 rounded-xl font-medium text-sm transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : children}
    </button>
  );
}
