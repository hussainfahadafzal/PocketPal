import { motion } from 'framer-motion';
import { useState } from 'react';

function EyeIcon({ show }) {
  return (
    <motion.svg
      key={show ? 'open' : 'closed'}
      initial={{ opacity: 0, scale: 0.84, rotate: -8 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, scale: 0.84, rotate: 8 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="w-4.5 h-4.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </motion.svg>
  );
}

function EyeOffIcon({ show }) {
  return (
    <motion.svg
      key={show ? 'off' : 'on'}
      initial={{ opacity: 0, scale: 0.84, rotate: 8 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, scale: 0.84, rotate: -8 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="w-4.5 h-4.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </motion.svg>
  );
}

export default function Input({ label, error, className = '', type, ...props }) {
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={isPassword ? (showPw ? 'text' : 'password') : type}
          className={`w-full bg-surface-2 border ${error ? 'border-danger' : 'border-border'}
            rounded-xl px-4 py-3 text-text text-base outline-none
            focus:border-primary transition-all duration-150 placeholder:text-muted/40
            ${isPassword ? 'pr-11' : ''}
            ${className}`}
          {...props}
        />
        {isPassword && (
          <motion.button
            type="button"
            tabIndex={-1}
            whileTap={{ scale: 0.9, rotate: -6 }}
            whileHover={{ scale: 1.04, y: -1 }}
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8
              flex items-center justify-center rounded-lg
              text-muted hover:text-text active:opacity-60
              transition-colors duration-150"
          >
            {showPw ? <EyeOffIcon show={showPw} /> : <EyeIcon show={showPw} />}
          </motion.button>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
