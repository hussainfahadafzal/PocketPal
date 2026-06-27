import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import AuthLoadingState from '../components/AuthLoadingState';

const SPRING = { duration: 0.5, ease: [0.22, 1, 0.36, 1] };
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: SPRING },
};

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (form.password.length < 8) e.password = 'At least 8 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }
    setErrors({});
    setLoading(true);
    try {
      await register(form.name.trim(), form.email, form.password);
    } catch (err) {
      setErrors({ api: err.response?.data?.detail || 'Registration failed. Try again.' });
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
          <p className="text-muted text-sm">Take control of your student budget.</p>
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
          <h2 className="font-heading text-lg font-semibold text-text mb-5">Create account</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Full name"
              type="text"
              placeholder="Alex Johnson"
              value={form.name}
              onChange={set('name')}
              error={errors.name}
              required
              autoComplete="name"
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@university.edu"
              value={form.email}
              onChange={set('email')}
              error={errors.email}
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={set('password')}
              error={errors.password}
              required
              autoComplete="new-password"
            />
            <Input
              label="Confirm password"
              type="password"
              placeholder="••••••••"
              value={form.confirm}
              onChange={set('confirm')}
              error={errors.confirm}
              required
              autoComplete="new-password"
            />

            {errors.api && (
              <p className="text-danger text-xs text-center">{errors.api}</p>
            )}

            {loading ? (
              <AuthLoadingState title="Creating your account" subtitle="Setting up your wallet and personal space" />
            ) : (
              <Button type="submit" className="mt-1">
                Create account
              </Button>
            )}
          </form>

          <p className="text-center text-sm text-muted mt-5">
            Already have one?{' '}
            <Link
              to="/login"
              className="font-medium transition-colors"
              style={{ color: '#3B6CFF' }}
            >
              Sign in
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
