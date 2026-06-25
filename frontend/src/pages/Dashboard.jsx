import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import Spinner from '../components/Spinner';
import BottomNav from '../components/BottomNav';

// Animates a number from 0 → target with ease-out cubic easing
function useCountUp(target, duration = 1300) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!target) { setDisplay(0); return; }
    let startTime = null;

    const step = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
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

// Indian number formatting: 1,00,000 style
const inr = (n) => Math.round(Math.abs(n)).toLocaleString('en-IN');

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [nudge, setNudge] = useState(null);
  const animatedLimit = useCountUp(stats?.daily_spend_limit ?? 0);

  useEffect(() => {
    client
      .get('/dashboard')
      .then((res) => setStats(res.data))
      .catch(() => setError('Could not load your dashboard. Try refreshing.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    client
      .get('/pal/nudges')
      .then((res) => { if (res.data.length) setNudge(res.data[0]); })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-danger text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-primary text-sm underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const savedMore = stats.saved_vs_yesterday > 0;

  return (
    <div className="min-h-screen bg-bg pb-36">
      <div className="max-w-sm mx-auto px-4 pt-8 flex flex-col gap-4">

        {/* ── 1. Greeting ── */}
        <div className="flex items-start justify-between">
          <h1 className="font-heading text-2xl font-semibold text-text leading-snug">
            Good {greetingWord()}, {firstName} 👋
          </h1>
          <button
            onClick={logout}
            className="text-muted text-xs mt-1 shrink-0 hover:text-text transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* ── 2. Hero card ── */}
        <div
          className="rounded-2xl p-6 relative overflow-hidden select-none"
          style={{ background: 'linear-gradient(135deg, #3B6CFF 0%, #2952CC 55%, #162A7A 100%)' }}
        >
          {/* Ambient blobs for depth */}
          <div
            className="absolute -top-10 -right-10 w-44 h-44 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)' }}
            aria-hidden
          />
          <div
            className="absolute -bottom-8 -left-6 w-36 h-36 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)' }}
            aria-hidden
          />

          <p className="text-white/65 text-sm font-medium mb-5 relative z-10">
            Today you can spend
          </p>

          {/* The ONE bold number */}
          <div className="relative z-10 mb-1">
            {/* Soft glow behind the number */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 80% 60% at 30% 60%, rgba(147,197,253,0.22) 0%, transparent 75%)',
                filter: 'blur(8px)',
              }}
              aria-hidden
            />
            <p
              className="font-heading font-bold text-white relative"
              style={{
                fontSize: 'clamp(3.5rem, 18vw, 5rem)',
                lineHeight: 1,
                letterSpacing: '-0.03em',
              }}
            >
              <span className="text-white/75" style={{ fontSize: '55%', verticalAlign: 'super', marginRight: '0.05em' }}>
                ₹
              </span>
              {animatedLimit.toLocaleString('en-IN')}
            </p>
          </div>

          {/* Sub-line */}
          <p className="text-white/55 text-sm mt-5 relative z-10">
            Balance left ₹{inr(stats.balance_left)}&nbsp;•&nbsp;
            {stats.days_left_in_month} day{stats.days_left_in_month !== 1 ? 's' : ''} to go
          </p>
        </div>

        {/* ── 3. Saved pill ── */}
        {savedMore && (
          <div className="flex">
            <div className="inline-flex items-center gap-2 bg-save/10 border border-save/25 rounded-full px-4 py-2">
              <div className="w-1.5 h-1.5 rounded-full bg-save shrink-0" />
              <span className="text-save text-sm font-medium">
                You saved ₹{inr(stats.saved_vs_yesterday)} more than yesterday 🔥
              </span>
            </div>
          </div>
        )}

        {/* ── 4. Streak badge ── */}
        {stats.streak_days > 0 && (
          <div className="flex">
            <div className="inline-flex items-center gap-2 bg-streak/10 border border-streak/25 rounded-full px-4 py-2">
              <span className="text-streak text-sm font-semibold">
                🔥 {stats.streak_days}-day streak
              </span>
            </div>
          </div>
        )}

        {/* ── 5. Pal nudge — first result from GET /pal/nudges ── */}
        <div className="bg-warn/10 border border-warn/20 rounded-2xl px-5 py-4">
          <p className="text-warn text-[10px] font-bold uppercase tracking-[0.12em] mb-2">
            Pal says
          </p>
          {nudge ? (
            <div className="flex items-start gap-2">
              <span className="text-base shrink-0 leading-snug mt-0.5" aria-hidden>{nudge.icon}</span>
              <p className="text-text/85 text-sm leading-relaxed">{nudge.message}</p>
            </div>
          ) : (
            <p className="text-text/30 text-sm">…</p>
          )}
        </div>

        {/* ── 6. Quick stats ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface border border-border rounded-2xl p-4">
            <p className="text-muted text-xs mb-2">Spent today</p>
            <p className="font-heading text-xl font-bold text-text">
              ₹{inr(stats.spent_today)}
            </p>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-4">
            <p className="text-muted text-xs mb-2">This month</p>
            <p className="font-heading text-xl font-bold text-text">
              ₹{inr(stats.spent_this_month)}
            </p>
          </div>
        </div>

      </div>

      {/* ── 7. Floating add button — sits above the bottom nav ── */}
      <button
        onClick={() => navigate('/add')}
        className="fixed bottom-[76px] right-5 flex items-center gap-2 bg-primary hover:bg-primary/90 active:scale-95 text-white font-semibold text-sm px-5 py-3.5 rounded-full transition-all duration-150 z-40"
        style={{ boxShadow: '0 4px 24px rgba(59, 108, 255, 0.45)' }}
      >
        <span className="text-lg leading-none font-light">+</span>
        Add expense
      </button>

      <BottomNav />
    </div>
  );
}
