import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import client from '../api/client';
import Input from '../components/Input';
import Button from '../components/Button';
import Toast from '../components/Toast';

const SPRING = { duration: 0.5, ease: [0.22, 1, 0.36, 1] };
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.03 } },
};
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: SPRING } };

export default function ChangePassword() {
  const navigate = useNavigate();

  const [current, setCurrent]   = useState('');
  const [newPw, setNewPw]       = useState('');
  const [confirm, setConfirm]   = useState('');
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState(null);

  const clear = (field) => setErrors((v) => ({ ...v, [field]: '' }));

  const validate = () => {
    const e = {};
    if (!current)            e.current = 'Current password is required';
    if (!newPw)              e.newPw   = 'New password is required';
    else if (newPw.length < 8) e.newPw = 'Minimum 8 characters';
    if (!confirm)            e.confirm = 'Please confirm your new password';
    else if (confirm !== newPw) e.confirm = 'Passwords do not match';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    try {
      await client.post('/profile/change-password', {
        current_password: current,
        new_password: newPw,
        confirm_password: confirm,
      });
      setToast({ message: 'Password changed!', icon: '🔒' });
      setTimeout(() => navigate('/profile'), 1000);
    } catch (err) {
      const detail = err.response?.data?.detail ?? '';
      if (typeof detail === 'string' && detail.toLowerCase().includes('current')) {
        setErrors({ current: detail });
      } else {
        setToast({ message: detail || 'Could not change password.', icon: '⚠️' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-bg pb-16 page-enter"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {toast && <Toast message={toast.message} icon={toast.icon} onDismiss={() => setToast(null)} />}

      {/* Header */}
      <div
        className="sticky top-0 z-40 border-b border-border/30"
        style={{
          background: 'rgba(7,9,26,0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <div className="max-w-sm mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate('/profile')}
            className="h-8 w-8 flex items-center justify-center rounded-xl text-muted hover:text-text transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-heading font-semibold text-text text-base">Change Password</span>
        </div>
      </div>

      <motion.div
        className="max-w-sm mx-auto px-4 pt-6 flex flex-col gap-5"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <motion.div
            variants={item}
            className="rounded-3xl p-5 flex flex-col gap-4"
            style={{ background: 'rgba(13,18,37,0.85)', border: '1px solid rgba(30,45,78,0.55)' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted/55">Security</p>
            <Input
              label="Current password"
              type="password"
              value={current}
              onChange={(e) => { setCurrent(e.target.value); clear('current'); }}
              error={errors.current}
              disabled={loading}
              autoComplete="current-password"
            />
            <Input
              label="New password"
              type="password"
              placeholder="Minimum 8 characters"
              value={newPw}
              onChange={(e) => { setNewPw(e.target.value); clear('newPw'); }}
              error={errors.newPw}
              disabled={loading}
              autoComplete="new-password"
            />
            <Input
              label="Confirm new password"
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); clear('confirm'); }}
              error={errors.confirm}
              disabled={loading}
              autoComplete="new-password"
            />
          </motion.div>

          <motion.div variants={item}>
            <Button type="submit" loading={loading}>Change Password</Button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}
