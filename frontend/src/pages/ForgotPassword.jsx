import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../api/client';
import Button from '../components/Button';
import Input from '../components/Input';

const SPRING = { duration: 0.45, ease: [0.22, 1, 0.36, 1] };
const slide = {
  hidden: { opacity: 0, x: 32 },
  show:   { opacity: 1, x: 0, transition: SPRING },
  exit:   { opacity: 0, x: -32, transition: { duration: 0.2 } },
};

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep]         = useState(1); // 1=email, 2=otp+password, 3=done
  const [email, setEmail]       = useState('');
  const [otp, setOtp]           = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({});

  const sendOtp = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      await client.post('/auth/forgot-password', { email });
      setStep(2);
    } catch (err) {
      setErrors({ email: err.response?.data?.detail || 'Something went wrong.' });
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    const e2 = {};
    if (otp.length !== 6)     e2.otp      = 'Enter the 6-digit code';
    if (password.length < 8)  e2.password = 'At least 8 characters';
    if (password !== confirm) e2.confirm  = "Passwords don't match";
    if (Object.keys(e2).length) { setErrors(e2); return; }

    setErrors({});
    setLoading(true);
    try {
      await client.post('/auth/reset-password', { email, otp, new_password: password });
      setStep(3);
    } catch (err) {
      setErrors({ otp: err.response?.data?.detail || 'Invalid or expired code.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-bg flex items-center justify-center p-5 overflow-hidden"
      style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(59,108,255,0.13) 0%, transparent 70%)' }}
        aria-hidden
      />

      <div className="w-full max-w-sm relative z-10">
        <div className="mb-8 text-center">
          <h1
            className="font-display font-bold tracking-tight leading-none mb-1"
            style={{
              fontSize: 'clamp(2.4rem,12vw,3rem)',
              letterSpacing: '-0.04em',
              background: 'linear-gradient(135deg,#3B6CFF 0%,#8B5CF6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            PocketPal
          </h1>
          <p className="text-muted text-sm">Reset your password</p>
        </div>

        <div
          className="rounded-3xl p-6 overflow-hidden"
          style={{
            background: 'rgba(13,18,37,0.90)',
            border: '1px solid rgba(30,45,78,0.65)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 32px 64px -16px rgba(0,0,0,0.45)',
          }}
        >
          <AnimatePresence mode="wait" initial={false}>

            {step === 1 && (
              <motion.form key="s1" variants={slide} initial="hidden" animate="show" exit="exit"
                onSubmit={sendOtp} className="flex flex-col gap-4">
                <div>
                  <h2 className="font-heading text-lg font-semibold text-text mb-1">Forgot password?</h2>
                  <p className="text-muted text-sm">Enter your email and we'll send a 6-digit code.</p>
                </div>
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                  required
                  autoComplete="email"
                  autoFocus
                />
                <Button type="submit" loading={loading}>Send code</Button>
                <p className="text-center text-sm text-muted">
                  Remembered it?{' '}
                  <Link to="/login" className="font-medium" style={{ color: '#3B6CFF' }}>Sign in</Link>
                </p>
              </motion.form>
            )}

            {step === 2 && (
              <motion.form key="s2" variants={slide} initial="hidden" animate="show" exit="exit"
                onSubmit={resetPassword} className="flex flex-col gap-4">
                <div>
                  <h2 className="font-heading text-lg font-semibold text-text mb-1">Check your email</h2>
                  <p className="text-muted text-sm">
                    We sent a 6-digit code to{' '}
                    <span className="text-text font-medium">{email}</span>.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-secondary">6-digit code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="______"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    autoFocus
                    autoComplete="one-time-code"
                    className="w-full rounded-xl border bg-surface px-4 h-14 text-center font-mono text-3xl font-bold tracking-[0.4em] text-text placeholder-muted/30 outline-none transition-all focus:border-primary"
                    style={{ borderColor: errors.otp ? 'var(--color-danger)' : 'rgba(30,45,78,0.65)' }}
                  />
                  {errors.otp && <p className="text-xs text-danger">{errors.otp}</p>}
                </div>

                <Input
                  label="New password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                  autoComplete="new-password"
                />
                <Input
                  label="Confirm password"
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  error={errors.confirm}
                  autoComplete="new-password"
                />

                <Button type="submit" loading={loading}>Reset password</Button>

                <button type="button"
                  onClick={() => { setStep(1); setOtp(''); setErrors({}); }}
                  className="text-sm text-muted text-center hover:text-text transition-colors">
                  ← Use a different email
                </button>
              </motion.form>
            )}

            {step === 3 && (
              <motion.div key="s3" variants={slide} initial="hidden" animate="show"
                className="flex flex-col items-center gap-4 py-2 text-center">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}
                >
                  <svg className="w-7 h-7" fill="none" stroke="#22c55e" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-text font-semibold text-base">Password updated!</p>
                  <p className="text-muted text-sm mt-1">Sign in with your new password.</p>
                </div>
                <Button onClick={() => navigate('/login')} className="w-full mt-1">Sign in</Button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
