import { motion } from 'framer-motion';
import Spinner from './Spinner';

/*
 * Primary  → blue→purple gradient with blue glow
 * Danger   → red gradient
 * Ghost    → transparent with border
 */
const STYLE = {
  primary: {
    background: 'linear-gradient(135deg, #3B6CFF 0%, #8B5CF6 100%)',
    boxShadow: '0 4px 20px rgba(59,108,255,0.35)',
  },
  danger: {
    background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
  },
  ghost: null,
};

const CLASS = {
  primary: 'text-white font-semibold hover:brightness-110',
  danger:  'text-white font-semibold hover:brightness-110',
  ghost:   'border border-border text-muted hover:text-text hover:border-border-bright',
};

export default function Button({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  const isActive = !disabled && !loading;

  return (
    <motion.button
      whileTap={isActive ? { scale: 0.96 } : undefined}
      transition={{ duration: 0.1, ease: 'easeOut' }}
      className={`w-full py-3.5 px-4 rounded-2xl text-sm
        transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${CLASS[variant] ?? CLASS.primary} ${className}`}
      style={STYLE[variant] ?? {}}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : children}
    </motion.button>
  );
}
