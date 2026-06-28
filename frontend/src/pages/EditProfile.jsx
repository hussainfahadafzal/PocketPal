import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
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

function BackHeader({ title, onBack }) {
  return (
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
          onClick={onBack}
          className="h-8 w-8 flex items-center justify-center rounded-xl text-muted hover:text-text transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-heading font-semibold text-text text-base">{title}</span>
      </div>
    </div>
  );
}

function CardSection({ title, children }) {
  return (
    <motion.div
      variants={item}
      className="rounded-3xl p-5 flex flex-col gap-4"
      style={{ background: 'rgba(13,18,37,0.85)', border: '1px solid rgba(30,45,78,0.55)' }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted/55">{title}</p>
      {children}
    </motion.div>
  );
}

export default function EditProfile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Identity
  const [name, setName]   = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');

  // Wallet
  const [balance, setBalance]       = useState('');
  const [savingsGoal, setSavingsGoal] = useState('');
  const [goalName, setGoalName]     = useState('');
  const [cycleMode, setCycleMode]   = useState('date'); // 'date' | 'days'
  const [refillDate, setRefillDate] = useState('');
  const [numDays, setNumDays]       = useState('');
  const [walletReady, setWalletReady] = useState(false);

  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState(null);

  useEffect(() => {
    client.get('/wallet')
      .then((r) => {
        setBalance(String(r.data.monthly_balance ?? ''));
        setSavingsGoal(String(r.data.savings_goal ?? ''));
        setGoalName(r.data.goal_name ?? '');
        if (r.data.budget_mode) {
          setCycleMode(r.data.budget_mode === 'days' ? 'days' : 'date');
        }
        if (r.data.next_refill_date) setRefillDate(r.data.next_refill_date);
      })
      .catch(() => {}) // no wallet yet — wallet section still shows for new values
      .finally(() => setWalletReady(true));
  }, []);

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    if (balance !== '' && Number(balance) <= 0) e.balance = 'Must be greater than 0';
    if (savingsGoal !== '' && Number(savingsGoal) < 0) e.savingsGoal = 'Cannot be negative';
    if (cycleMode === 'date' && refillDate && new Date(refillDate) <= new Date()) {
      e.refillDate = 'Must be a future date';
    }
    if (cycleMode === 'days' && numDays !== '') {
      const n = Number(numDays);
      if (n < 1 || n > 366) e.numDays = 'Between 1 and 366';
    }
    return e;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    const payload = { name: name.trim(), email: email.trim() };
    if (balance !== '')     payload.monthly_balance = Number(balance);
    if (savingsGoal !== '') payload.savings_goal    = Number(savingsGoal);
    if (goalName)           payload.goal_name       = goalName;
    if (cycleMode === 'date' && refillDate)   payload.next_refill_date = refillDate;
    if (cycleMode === 'days' && numDays !== '') payload.number_of_days = Number(numDays);

    try {
      await client.patch('/profile', payload);
      await refreshUser(); // sync updated name/email into AuthContext
      setToast({ message: 'Profile updated!', icon: '✅' });
      setTimeout(() => navigate('/profile'), 1000);
    } catch (err) {
      const detail = err.response?.data?.detail ?? '';
      if (typeof detail === 'string' && detail.toLowerCase().includes('email')) {
        setErrors({ email: detail });
      } else {
        setToast({ message: detail || 'Could not save changes.', icon: '⚠️' });
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

      <BackHeader title="Edit Profile" onBack={() => navigate('/profile')} />

      <motion.div
        className="max-w-sm mx-auto px-4 pt-6 flex flex-col gap-5"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          {/* Identity */}
          <CardSection title="Identity">
            <Input
              label="Full name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((v) => ({ ...v, name: '' })); }}
              error={errors.name}
              disabled={loading}
              autoComplete="name"
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((v) => ({ ...v, email: '' })); }}
              error={errors.email}
              disabled={loading}
              autoComplete="email"
            />
          </CardSection>

          {/* Budget */}
          {walletReady && (
            <CardSection title="Budget">
              <Input
                label="Current balance ($)"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="e.g. 1500"
                value={balance}
                onChange={(e) => { setBalance(e.target.value); setErrors((v) => ({ ...v, balance: '' })); }}
                error={errors.balance}
                disabled={loading}
              />
              <Input
                label="Savings goal ($)"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 300"
                value={savingsGoal}
                onChange={(e) => { setSavingsGoal(e.target.value); setErrors((v) => ({ ...v, savingsGoal: '' })); }}
                error={errors.savingsGoal}
                disabled={loading}
              />
              <Input
                label="Goal name (optional)"
                type="text"
                placeholder="e.g. Emergency fund"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                disabled={loading}
              />

              {/* Cycle mode toggle */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  Budget cycle
                </label>
                <div
                  className="flex rounded-xl overflow-hidden"
                  style={{ border: '1px solid rgba(30,45,78,0.7)' }}
                >
                  {[
                    { id: 'date', label: 'Refill date' },
                    { id: 'days', label: 'N-day cycle' },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      disabled={loading}
                      onClick={() => setCycleMode(id)}
                      className="flex-1 py-2.5 text-sm font-medium transition-all duration-150"
                      style={
                        cycleMode === id
                          ? { background: 'linear-gradient(135deg, #3B6CFF 0%, #8B5CF6 100%)', color: 'white' }
                          : { color: '#7A8BAD' }
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {cycleMode === 'date' ? (
                <Input
                  label="Next refill date"
                  type="date"
                  value={refillDate}
                  onChange={(e) => { setRefillDate(e.target.value); setErrors((v) => ({ ...v, refillDate: '' })); }}
                  error={errors.refillDate}
                  disabled={loading}
                />
              ) : (
                <Input
                  label="Cycle length (days)"
                  type="number"
                  min="1"
                  max="366"
                  step="1"
                  placeholder="e.g. 30"
                  value={numDays}
                  onChange={(e) => { setNumDays(e.target.value); setErrors((v) => ({ ...v, numDays: '' })); }}
                  error={errors.numDays}
                  disabled={loading}
                />
              )}
            </CardSection>
          )}

          <motion.div variants={item}>
            <Button type="submit" loading={loading}>Save changes</Button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}
