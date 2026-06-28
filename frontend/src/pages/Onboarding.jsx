import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import Button from '../components/Button';
import Input from '../components/Input';

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function fmtDate(isoStr) {
  return new Date(isoStr + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function computedEndFromDays(days) {
  const n = parseInt(days, 10);
  if (!days || isNaN(n) || n < 1) return null;
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [balance, setBalance]     = useState('');
  const [goal, setGoal]           = useState('');
  const [goalName, setGoalName]   = useState('');
  const [cycleMode, setCycleMode] = useState('days');
  const [cycleDays, setCycleDays] = useState('30');
  const [cycleDate, setCycleDate] = useState('');
  const [errors, setErrors]       = useState({});
  const [loading, setLoading]     = useState(false);

  const validate = () => {
    const e = {};
    const bal = parseFloat(balance);
    const g   = parseFloat(goal);
    if (!balance || isNaN(bal) || bal <= 0) e.balance = 'Enter a positive amount';
    if (goal && (isNaN(g) || g < 0)) e.goal = 'Enter a valid amount';
    if (!isNaN(bal) && !isNaN(g) && g > bal) e.goal = 'Savings goal cannot exceed your budget';
    if (cycleMode === 'days') {
      const d = parseInt(cycleDays, 10);
      if (!cycleDays || isNaN(d) || d < 1) e.cycle = 'Enter at least 1 day';
    } else {
      if (!cycleDate) e.cycle = 'Pick a refill date';
    }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const body = {
        monthly_balance: parseFloat(balance),
        savings_goal:    parseFloat(goal) || 0,
        goal_name:       goalName.trim() || null,
      };
      if (cycleMode === 'days') {
        body.number_of_days = parseInt(cycleDays, 10);
      } else {
        body.next_refill_date = cycleDate;
      }
      await client.post('/wallet', body);
      navigate('/dashboard');
    } catch (err) {
      setErrors({ api: err.response?.data?.detail || 'Could not save. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  const firstName = user?.name?.split(' ')[0] || 'there';
  const previewEnd = cycleMode === 'days' ? computedEndFromDays(cycleDays) : cycleDate;

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-5 page-enter">
      <div className="w-full max-w-sm">

        <p className="text-center font-heading font-bold text-text text-base tracking-tight mb-8 opacity-60">
          PocketPal
        </p>

        <div className="mb-6">
          <p className="text-muted text-sm mb-1">Hey {firstName},</p>
          <h1 className="font-heading text-3xl font-bold text-text leading-tight">
            Set up your budget
          </h1>
          <p className="text-muted text-sm mt-2">30 seconds. Change it any time.</p>
        </div>

        <div className="rounded-3xl p-5" style={{ background: 'rgba(13,18,37,0.90)', border: '1px solid rgba(30,45,78,0.65)' }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Balance */}
            <div>
              <Input
                label="How much do you have?"
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 8000"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                error={errors.balance}
                required
              />
              <p className="text-muted text-xs mt-1.5">Total money you have right now</p>
            </div>

            {/* Cycle mode */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted mb-2">
                Budget cycle
              </p>

              {/* Mode toggle */}
              <div
                className="flex rounded-xl overflow-hidden mb-3"
                style={{ border: '1px solid rgba(30,45,78,0.7)' }}
              >
                {[
                  { key: 'days', label: 'Last me X days' },
                  { key: 'date', label: 'Until a date' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCycleMode(key)}
                    className="flex-1 py-2.5 text-xs font-semibold transition-all duration-200"
                    style={cycleMode === key ? {
                      background: 'linear-gradient(135deg, #3B6CFF 0%, #8B5CF6 100%)',
                      color: '#fff',
                    } : {
                      background: 'rgba(13,18,37,0.6)',
                      color: '#7A8BAD',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {cycleMode === 'days' ? (
                <div>
                  <Input
                    label="Number of days"
                    type="number"
                    min="1"
                    max="366"
                    placeholder="e.g. 30"
                    value={cycleDays}
                    onChange={(e) => setCycleDays(e.target.value)}
                    error={errors.cycle}
                  />
                  {previewEnd && (
                    <p className="text-muted text-xs mt-1.5">
                      Budget lasts until{' '}
                      <span className="text-text/70 font-medium">{fmtDate(previewEnd)}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <Input
                    label="Money refill date"
                    type="date"
                    min={tomorrowISO()}
                    value={cycleDate}
                    onChange={(e) => setCycleDate(e.target.value)}
                    error={errors.cycle}
                  />
                  {cycleDate && (
                    <p className="text-muted text-xs mt-1.5">
                      {Math.ceil((new Date(cycleDate + 'T00:00:00') - new Date()) / 86400000)} days to go
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Savings goal */}
            <div>
              <Input
                label="Savings goal (optional)"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 1500"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                error={errors.goal}
              />
              <p className="text-muted text-xs mt-1.5">
                Reserved — deducted before your daily limit is calculated
              </p>
            </div>

            <Input
              label="What are you saving for? (optional)"
              type="text"
              placeholder="e.g. New laptop, Trip to Goa"
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              maxLength={60}
            />

            {errors.api && (
              <p className="text-danger text-xs text-center">{errors.api}</p>
            )}

            <Button type="submit" loading={loading}>Start tracking</Button>
          </form>
        </div>

      </div>
    </div>
  );
}
