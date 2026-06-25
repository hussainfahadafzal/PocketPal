import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../api/client';
import TopBar from '../components/TopBar';
import { useCountUp } from '../hooks/useCountUp';

const SPRING = { duration: 0.5, ease: [0.22, 1, 0.36, 1] };
const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: SPRING },
};
const containerVariants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
};

const GRAD = {
  background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

function Toggle({ enabled, onToggle, disabled }) {
  return (
    <motion.button
      onClick={onToggle}
      disabled={disabled}
      className="relative shrink-0 w-12 h-6 rounded-full transition-colors duration-300 disabled:opacity-50"
      style={{
        background: enabled
          ? 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)'
          : '#1E2D4E',
        boxShadow: enabled ? '0 2px 12px rgba(16,185,129,0.45)' : 'none',
      }}
      whileTap={!disabled ? { scale: 0.92 } : undefined}
      aria-checked={enabled}
      role="switch"
    >
      <motion.div
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.35)' }}
        animate={{ x: enabled ? 24 : 2 }}
        transition={{ type: 'spring', damping: 22, stiffness: 320 }}
      />
    </motion.button>
  );
}

export default function Jar() {
  const [jar, setJar]               = useState(null);
  const [roundupEnabled, setRoundup] = useState(false);
  const [toggling, setToggling]     = useState(false);

  const [goalName,   setGoalName]   = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalSaving, setGoalSaving] = useState(false);
  const [goalStatus, setGoalStatus] = useState(null);
  const [goalError,  setGoalError]  = useState('');

  useEffect(() => {
    client.get('/wallet/jar').then((r) => {
      setJar(r.data);
      setGoalName(r.data.jar_goal_name   ?? '');
      setGoalAmount(r.data.jar_goal_amount ? String(r.data.jar_goal_amount) : '');
    }).catch(() => {});

    client.get('/wallet').then((r) => {
      setRoundup(r.data.roundup_enabled ?? false);
    }).catch(() => {});
  }, []);

  async function toggleRoundup() {
    setToggling(true);
    try {
      const res = await client.post('/wallet/roundup');
      setRoundup(res.data.roundup_enabled);
    } catch {
    } finally {
      setToggling(false);
    }
  }

  async function saveGoal() {
    const name   = goalName.trim();
    const amount = parseFloat(goalAmount);
    if (!name)                { setGoalError('Enter a goal name'); return; }
    if (!amount || amount <= 0) { setGoalError('Enter a positive amount'); return; }
    setGoalError('');
    setGoalSaving(true);
    setGoalStatus(null);
    try {
      await client.post('/wallet/jar-goal', { jar_goal_name: name, jar_goal_amount: amount });
      const r = await client.get('/wallet/jar');
      setJar(r.data);
      setGoalStatus('ok');
      setTimeout(() => setGoalStatus(null), 2500);
    } catch {
      setGoalStatus('err');
    } finally {
      setGoalSaving(false);
    }
  }

  const animJar = useCountUp(jar?.savings_jar ?? 0, 1200);
  const hasGoal = jar && jar.jar_goal_amount > 0;
  const pct     = hasGoal ? Math.min((jar.savings_jar / jar.jar_goal_amount) * 100, 100) : 0;

  return (
    <div className="min-h-screen bg-bg pb-28 page-enter">
      <TopBar showLogout />

      <motion.div
        className="max-w-sm mx-auto px-4 pt-5 flex flex-col gap-5"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Heading */}
        <motion.div variants={cardVariants}>
          <p className="text-muted text-sm mb-0.5">Automatic saving</p>
          <h1 className="font-display text-[1.7rem] font-bold text-text leading-tight">
            Savings Jar
          </h1>
        </motion.div>

        {/* Jar total card */}
        <motion.div variants={cardVariants}>
          <div
            className="rounded-3xl p-6 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.14) 0%, rgba(6,182,212,0.11) 100%)',
              border: '1px solid rgba(16,185,129,0.30)',
              boxShadow: '0 16px 48px -12px rgba(16,185,129,0.20)',
            }}
          >
            <div
              className="absolute top-0 left-8 right-8 h-px rounded-full"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.65), transparent)' }}
            />
            <div
              className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.20) 0%, transparent 70%)', filter: 'blur(20px)' }}
              aria-hidden
            />

            <div className="flex items-start justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted/70">
                Total saved
              </p>
              {jar?.double_active && (
                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.5 }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, rgba(236,72,153,0.22) 0%, rgba(249,115,22,0.18) 100%)',
                    border: '1px solid rgba(236,72,153,0.45)',
                  }}
                >
                  <span className="text-[10px]">🔥</span>
                  <span className="text-[10px] font-bold" style={GRAD}>2× active!</span>
                </motion.div>
              )}
            </div>

            <p
              className="font-display font-bold leading-none mt-3 mb-1"
              style={{
                fontSize: 'clamp(3rem, 16vw, 4rem)',
                letterSpacing: '-0.04em',
                ...GRAD,
              }}
            >
              ₹{animJar.toLocaleString('en-IN')}
            </p>

            {hasGoal && (
              <>
                <p className="text-muted/70 text-xs mb-3">
                  {jar.jar_goal_name} · ₹{Math.round(jar.jar_goal_amount).toLocaleString('en-IN')} goal
                </p>
                <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden mb-1.5">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #10B981 0%, #06B6D4 100%)' }}
                    initial={{ width: '0%' }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted/60 text-[10px]">
                    {pct >= 100 ? '🎉 Goal reached!' : `${pct.toFixed(1)}% there`}
                  </span>
                  <span className="text-muted/50 text-[10px]">
                    ₹{Math.round(jar.jar_goal_amount - jar.savings_jar).toLocaleString('en-IN')} to go
                  </span>
                </div>
              </>
            )}

            {!hasGoal && (
              <p className="text-muted/50 text-xs mt-2">Set a goal below to track your progress.</p>
            )}
          </div>
        </motion.div>

        {/* Round-up toggle */}
        <motion.div variants={cardVariants}>
          <div
            className="rounded-3xl p-5"
            style={{
              background: roundupEnabled
                ? 'linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(6,182,212,0.08) 100%)'
                : 'rgba(13,18,37,0.80)',
              border: roundupEnabled
                ? '1px solid rgba(16,185,129,0.28)'
                : '1px solid rgba(30,45,78,0.6)',
              transition: 'background 0.35s ease, border-color 0.35s ease',
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-text text-sm font-semibold mb-1">🪙 Round-up saving</p>
                <p className="text-muted text-xs leading-relaxed">
                  Every spend rounds up to ₹10 — the difference goes straight into the jar.{' '}
                  <span
                    className="font-semibold"
                    style={{
                      background: 'linear-gradient(135deg, #EC4899 0%, #F97316 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    7-day streak doubles it.
                  </span>
                </p>
              </div>
              <Toggle enabled={roundupEnabled} onToggle={toggleRoundup} disabled={toggling} />
            </div>
          </div>
        </motion.div>

        {/* Set goal */}
        <motion.div variants={cardVariants}>
          <div
            className="rounded-3xl p-5"
            style={{
              background: 'rgba(13,18,37,0.80)',
              border: '1px solid rgba(30,45,78,0.6)',
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-4">
              Set a goal
            </p>
            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="What are you saving for? e.g. Goa trip"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3
                  text-text text-sm outline-none focus:border-primary transition-all duration-150
                  placeholder:text-muted/35"
              />
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none select-none">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  placeholder="Target amount"
                  value={goalAmount}
                  onChange={(e) => setGoalAmount(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl pl-9 pr-4 py-3
                    text-text text-sm outline-none focus:border-primary transition-all duration-150
                    placeholder:text-muted/35"
                />
              </div>
              {goalError && <p className="text-danger text-xs">{goalError}</p>}
              <button
                onClick={saveGoal}
                disabled={goalSaving}
                className="w-full py-3.5 rounded-2xl text-white text-sm font-semibold
                  transition-all duration-200 active:scale-[0.97] disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
                  boxShadow: '0 8px 24px rgba(16,185,129,0.35)',
                }}
              >
                {goalSaving ? 'Saving…' : goalStatus === 'ok' ? 'Goal saved ✓' : 'Save goal'}
              </button>
              {goalStatus === 'err' && (
                <p className="text-danger text-xs text-center">Could not save. Try again.</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* How it works */}
        <motion.div variants={cardVariants}>
          <div
            className="rounded-3xl px-5 py-4"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.07) 0%, rgba(6,182,212,0.05) 100%)',
              border: '1px solid rgba(16,185,129,0.16)',
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted/60 mb-3">
              How it works
            </p>
            <div className="flex flex-col gap-2.5">
              {[
                ['🪙', 'You log ₹47', 'We round up to ₹50 — ₹3 goes to your jar automatically'],
                ['🔥', '7-day streak', 'Every round-up doubles. Log ₹47 → ₹6 goes to the jar'],
                ['🫙', 'Watch it grow', 'The jar fills toward your goal with every expense you log'],
              ].map(([icon, title, desc]) => (
                <div key={title} className="flex items-start gap-3">
                  <span className="text-base leading-none shrink-0 mt-0.5">{icon}</span>
                  <div>
                    <p className="text-text/80 text-xs font-semibold">{title}</p>
                    <p className="text-muted/60 text-xs leading-snug mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
