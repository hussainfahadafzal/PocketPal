import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState({});

  if (!token) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-5">
        <div className="text-center max-w-xs">
          <p className="text-danger text-sm mb-4">Invalid or missing reset link.</p>
          <Link to="/forgot-password" className="text-primary text-sm font-medium underline underline-offset-2">
            Request a new one
          </Link>
        </div>
      </div>
    );
  }

  const validate = () => {
    const e = {};
    if (password.length < 8) e.password = 'At least 8 characters';
    if (password !== confirm) e.confirm = 'Passwords do not match';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    try {
      await client.post('/auth/reset-password', { token, new_password: password });
      setDone(true);
    } catch (err) {
      setErrors({ api: err.response?.data?.detail || 'Link expired or invalid. Request a new one.' });
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
          <p className="text-muted text-sm">Set a new password</p>
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
          {done ? (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}
              >
                <svg className="w-6 h-6 text-save" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-text font-semibold text-base">Password updated!</p>
                <p className="text-muted text-sm mt-1">You can now sign in with your new password.</p>
              </div>
              <Button onClick={() => navigate('/login')} className="w-full mt-1">
                Sign in
              </Button>
            </div>
          ) : (
            <>
              <h2 className="font-heading text-lg font-semibold text-text mb-1">New password</h2>
              <p className="text-muted text-sm mb-5">Choose a strong password — min. 8 characters.</p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  label="New password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                  required
                  autoComplete="new-password"
                  autoFocus
                />
                <Input
                  label="Confirm password"
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  error={errors.confirm}
                  required
                  autoComplete="new-password"
                />

                {errors.api && (
                  <p className="text-danger text-xs text-center">{errors.api}</p>
                )}

                <Button type="submit" loading={loading} className="mt-1">
                  Update password
                </Button>
              </form>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
