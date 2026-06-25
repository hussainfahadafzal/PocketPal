import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import Spinner from '../components/Spinner';
import BottomNav from '../components/BottomNav';
import TopBar from '../components/TopBar';

// ── Count-up hook ──────────────────────────────────────────────────────
function useCountUp(target, duration = 1100) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!target) { setDisplay(0); return; }
    let startTime = null;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const t = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4); // quartic ease-out = more "pop" at the end
      setDisplay(Math.round(eased * target));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

function greetingWord() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const inr = (n) => Math.round(Math.abs(n)).toLocaleString('en-IN');

// ── Framer Motion variants ─────────────────────────────────────────────
const SPRING = { duration: 0.5, ease: [0.22, 1, 0.36, 1] };

const containerVariants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  show:   { opacity: 1, y: 0, transition: SPRING },
};

// ── Hero Card ─────────────────────────────────────────────────────────
function HeroCard({ stats, animatedLimit }) {
  return (
    <motion.div variants={cardVariants}>
      <div
        className="rounded-3xl p-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(140deg, #3B6CFF 0%, #5B3CF5 45%, #7C28D9 100%)',
          boxShadow: '0 28px 72px -12px rgba(59,108,255,0.60), 0 12px 36px -10px rgba(109,40,217,0.40)',
        }}
      >
        {/* Ambient glow blobs */}
        <div
          className="absolute -top-12 -right-12 w-56 h-56 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.35) 0%, transparent 70%)', filter: 'blur(24px)' }}
          aria-hidden
        />
        <div
          className="absolute -bottom-10 -left-8 w-44 h-44 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(96,165,250,0.25) 0%, transparent 70%)', filter: 'blur(20px)' }}
          aria-hidden
        />

        {/* Label */}
        <p className="text-white/60 text-xs font-semibold uppercase tracking-[0.14em] mb-5 relative z-10">
          Today's spend limit
        </p>

        {/* Big number */}
        <div className="relative z-10 mb-4">
          <p
            className="font-display font-bold text-white leading-none"
            style={{ fontSize: 'clamp(3.8rem, 20vw, 5.5rem)', letterSpacing: '-0.04em' }}
          >
            <span
              className="text-white/55"
              style={{ fontSize: '42%', verticalAlign: 'super', marginRight: '0.06em', letterSpacing: 0 }}
            >
              ₹
            </span>
            {animatedLimit.toLocaleString('en-IN')}
          </p>
        </div>

        {/* Sub-stats row */}
        <div className="flex items-center gap-2 relative z-10 flex-wrap">
          <span className="text-white/50 text-sm font-medium">
            ₹{inr(stats.balance_left)} left
          </span>
          <span className="w-1 h-1 rounded-full bg-white/30 shrink-0" />
          <span className="text-white/50 text-sm font-medium">
            {stats.days_left_in_month} day{stats.days_left_in_month !== 1 ? 's' : ''} to go
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Badge Pills ────────────────────────────────────────────────────────
function BadgePills({ stats }) {
  const savedMore = stats.saved_vs_yesterday > 0;
  if (!savedMore && stats.streak_days === 0) return null;

  return (
    <motion.div variants={cardVariants} className="flex flex-wrap gap-2">
      {stats.streak_days > 0 && (
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-2"
          style={{
            background: 'linear-gradient(135deg, rgba(236,72,153,0.14) 0%, rgba(249,115,22,0.14) 100%)',
            border: '1px solid rgba(236,72,153,0.28)',
          }}
        >
          <span className="text-base leading-none">🔥</span>
          <span className="text-grad-energy text-xs font-bold">
            {stats.streak_days}-day streak
          </span>
        </div>
      )}
      {savedMore && (
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-2"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.14) 0%, rgba(6,182,212,0.14) 100%)',
            border: '1px solid rgba(16,185,129,0.28)',
          }}
        >
          <span className="text-base leading-none">💰</span>
          <span className="text-grad-success text-xs font-bold">
            ₹{inr(stats.saved_vs_yesterday)} saved vs yesterday
          </span>
        </div>
      )}
    </motion.div>
  );
}

// ── Pal Nudge ──────────────────────────────────────────────────────────
function PalNudge({ nudge }) {
  if (!nudge) return null;
  return (
    <motion.div variants={cardVariants}>
      <div
        className="rounded-3xl px-5 py-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(249,115,22,0.06) 100%)',
          border: '1px solid rgba(245,158,11,0.22)',
        }}
      >
        {/* Thin gradient top accent line */}
        <div
          className="absolute top-0 left-6 right-6 h-px rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.6), transparent)' }}
        />
        <p className="text-warn/80 text-[10px] font-bold uppercase tracking-[0.16em] mb-2.5">
          Pal says
        </p>
        <div className="flex items-start gap-3">
          <span className="text-lg shrink-0 mt-0.5 leading-none" aria-hidden>{nudge.icon}</span>
          <p className="text-text/80 text-sm leading-relaxed">{nudge.message}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ── Quick Stats ────────────────────────────────────────────────────────
function QuickStats({ stats }) {
  return (
    <motion.div variants={cardVariants} className="grid grid-cols-2 gap-3">
      <StatCard label="Spent today" value={`₹${inr(stats.spent_today)}`} />
      <StatCard label="This month"  value={`₹${inr(stats.spent_this_month)}`} />
    </motion.div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-surface border border-border rounded-3xl p-4">
      <p className="text-muted text-xs font-medium mb-2">{label}</p>
      <p className="font-display text-2xl font-bold text-text">{value}</p>
    </div>
  );
}

// ── FAB (Add expense) ──────────────────────────────────────────────────
function AddFAB({ onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.91 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      onClick={onClick}
      className="fixed bottom-[76px] right-5 flex items-center gap-2
        text-white font-bold text-sm px-5 py-3.5 rounded-full z-40
        hover:brightness-110"
      style={{
        background: 'linear-gradient(135deg, #3B6CFF 0%, #8B5CF6 100%)',
        boxShadow: '0 8px 32px rgba(59,108,255,0.55), 0 2px 12px rgba(139,92,246,0.3)',
      }}
    >
      <span className="text-xl leading-none font-light">+</span>
      Add expense
    </motion.button>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [nudge, setNudge]   = useState(null);

  const animatedLimit = useCountUp(stats?.daily_spend_limit ?? 0);

  useEffect(() => {
    client.get('/dashboard')
      .then((res) => setStats(res.data))
      .catch((err) => {
        if (err.response?.status === 404) navigate('/onboarding');
        else setError('Could not load your dashboard.');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    client.get('/pal/nudges')
      .then((res) => { if (res.data.length) setNudge(res.data[0]); })
      .catch(() => {});
  }, []);

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex flex-col">
        <TopBar showLogout />
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-bg flex flex-col">
        <TopBar showLogout />
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
          <p className="text-danger text-sm text-center">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-primary text-sm font-semibold underline underline-offset-2"
          >
            Tap to retry
          </button>
        </div>
      </div>
    );
  }

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="min-h-screen bg-bg pb-28">
      <TopBar showLogout />

      <motion.div
        className="max-w-sm mx-auto px-4 pt-5 flex flex-col gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* ── Greeting ── */}
        <motion.div variants={cardVariants}>
          <p className="text-muted text-sm mb-0.5">Good {greetingWord()}</p>
          <h1 className="font-display text-[1.7rem] font-bold text-text leading-tight">
            Hey, {firstName} 👋
          </h1>
        </motion.div>

        {/* ── Hero ── */}
        <HeroCard stats={stats} animatedLimit={animatedLimit} />

        {/* ── Badges ── */}
        <BadgePills stats={stats} />

        {/* ── Pal ── */}
        <PalNudge nudge={nudge} />

        {/* ── Stats ── */}
        <QuickStats stats={stats} />

      </motion.div>

      <AddFAB onClick={() => navigate('/add')} />
      <BottomNav />
    </div>
  );
}
