import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import client from '../api/client';
import Button from '../components/Button';
import Input from '../components/Input';

const SPRING = { duration: 0.5, ease: [0.22, 1, 0.36, 1] };
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: SPRING },
};

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await client.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-bg flex items-center justify-center p-5 page-enter overflow-hidden"
      style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(59,108,255,0.14) 0%, transparent 70%)',
        }}
        aria-hidden
      />

      <motion.div
        className="w-full max-w-sm relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
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
          <p className="text-muted text-sm">Reset your password</p>
        </motion.div>

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
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(59,108,255,0.15)', border: '1px solid rgba(59,108,255,0.3)' }}
              >
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <div>
                <p className="text-text font-semibold text-base">Check your inbox</p>
                <p className="text-muted text-sm mt-1 leading-relaxed">
                  We sent a password reset link to{' '}
                  <span className="text-text font-medium">{email}</span>.
                  It expires in 1 hour.
                </p>
              </div>
              <p className="text-muted text-xs">
                Didn't get it? Check your spam folder.
              </p>
              <Link
                to="/login"
                className="text-sm font-medium transition-colors mt-1"
                style={{ color: '#3B6CFF' }}
              >
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-heading text-lg font-semibold text-text mb-1">Forgot password?</h2>
              <p className="text-muted text-sm mb-5 leading-relaxed">
                Enter your email and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />

                {error && (
                  <p className="text-danger text-xs text-center">{error}</p>
                )}

                <Button type="submit" loading={loading}>
                  Send reset link
                </Button>
              </form>

              <p className="text-center text-sm text-muted mt-5">
                Remembered it?{' '}
                <Link
                  to="/login"
                  className="font-medium transition-colors"
                  style={{ color: '#3B6CFF' }}
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
