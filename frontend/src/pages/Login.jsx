import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth, REMEMBER_ME_KEY, SAVED_EMAIL_KEY } from '../context/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import AuthLoadingState from '../components/AuthLoadingState';

const SPRING = { duration: 0.5, ease: [0.22, 1, 0.36, 1] };
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: SPRING },
};

export default function Login() {
  const { login } = useAuth();
  // Pre-fill email if the user previously checked "Remember me".
  const [email, setEmail] = useState(() => localStorage.getItem(SAVED_EMAIL_KEY) ?? '');
  const [password, setPassword] = useState('');
  // Default to checked; respect the user's last explicit choice if they've logged in before.
  const [rememberMe, setRememberMe] = useState(
    () => localStorage.getItem(REMEMBER_ME_KEY) !== '0'
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, rememberMe);
    } catch (err) {
      setError(err.response?.data?.detail || 'Sign in failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-bg flex items-center justify-center p-5 page-enter overflow-hidden"
      style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
    >
      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(59,108,255,0.14) 0%, transparent 70%)',
        }}
        aria-hidden
      />
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        aria-hidden
      />

      <motion.div
        className="w-full max-w-sm relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Brand wordmark */}
        <motion.div variants={itemVariants} className="mb-8 text-center">
          <h1
            className="font-display font-bold tracking-tight leading-none mb-2"
            style={{
              fontSize: 'clamp(2.4rem, 12vw, 3rem)',
              letterSpacing: '-0.04em',
              background: 'linear-gradient(135deg, #3B6CFF 0%, #8B5CF6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            PocketPal
          </h1>
          <p className="text-muted text-sm">Spend Smart, Save Sharp.</p>
        </motion.div>

        {/* Card */}
        <motion.div
          variants={itemVariants}
          className="rounded-3xl p-6"
          style={{
            background: 'rgba(13,18,37,0.90)',
            border: '1px solid rgba(30,45,78,0.65)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 32px 64px -16px rgba(0,0,0,0.45)',
          }}
        >
          <h2 className="font-heading text-lg font-semibold text-text mb-5">Welcome back</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-busy={loading}>
            <Input
              label="Email"
              type="email"
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              required
              autoComplete="email"
              disabled={loading}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              required
              autoComplete="current-password"
              disabled={loading}
            />

            {/* Remember me + Forgot password row */}
            <div className="flex items-center justify-between -mt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="relative flex h-4 w-4 shrink-0 items-center justify-center rounded transition-all duration-150"
                  style={{
                    background: rememberMe
                      ? 'linear-gradient(135deg, #3B6CFF 0%, #8B5CF6 100%)'
                      : 'transparent',
                    border: rememberMe ? 'none' : '1.5px solid rgba(255,255,255,0.18)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                    disabled={loading}
                  />
                  {rememberMe && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none" aria-hidden>
                      <path
                        d="M1 3.5L3.2 5.5L8 1"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span className="text-xs text-muted">Remember me</span>
              </label>

              <Link
                to="/forgot-password"
                className="text-xs text-muted hover:text-primary transition-colors duration-150"
              >
                Forgot password?
              </Link>
            </div>

            {error && (
              <p className="text-danger text-xs text-center">{error}</p>
            )}

            {loading ? (
              <AuthLoadingState title="Signing you in" subtitle="Preparing your workspace and syncing your account" />
            ) : (
              <Button type="submit" className="mt-1">
                Sign in
              </Button>
            )}
            <p className="text-[11px] text-center text-muted/80 min-h-4">
              {loading
                ? 'Please wait while we verify your details.'
                : rememberMe
                  ? "You'll stay signed in for 7 days on this device."
                  : "You'll be signed out when the app is closed."}
            </p>
          </form>

          <p className="text-center text-sm text-muted mt-5">
            No account?{' '}
            <Link
              to="/register"
              className="font-medium transition-colors"
              style={{ color: '#3B6CFF' }}
            >
              Create one
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
