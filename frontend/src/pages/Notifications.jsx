import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const SPRING = { duration: 0.45, ease: [0.22, 1, 0.36, 1] };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.03 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: SPRING } };

const NOTIFS = [
  {
    key:   'pocketpal_notif_streak',
    icon:  '🔥',
    grad:  'rgba(236,72,153,0.12)',
    label: 'Streak reminders',
    desc:  "Daily nudge to log an expense and keep your streak alive",
  },
  {
    key:   'pocketpal_notif_budget',
    icon:  '⚠️',
    grad:  'rgba(245,158,11,0.12)',
    label: 'Budget warnings',
    desc:  "Alert when you're close to or over your daily spend limit",
  },
  {
    key:   'pocketpal_notif_weekly',
    icon:  '📊',
    grad:  'rgba(59,108,255,0.12)',
    label: 'Weekly summary',
    desc:  "Sunday recap of your spending, savings, and PocketScore",
  },
  {
    key:   'pocketpal_notif_goals',
    icon:  '🎯',
    grad:  'rgba(16,185,129,0.12)',
    label: 'Goal milestones',
    desc:  "Celebrate when you hit 25%, 50%, 75% and 100% of a goal",
  },
];

function read(key) {
  const v = localStorage.getItem(key);
  return v === null ? true : v === '1'; // default ON
}

function Toggle({ on, onChange }) {
  return (
    <motion.button
      type="button"
      onClick={() => onChange(!on)}
      whileTap={{ scale: 0.9 }}
      className="relative h-7 w-12 rounded-full shrink-0 transition-colors duration-200"
      style={{ background: on ? 'linear-gradient(135deg,#3B6CFF,#8B5CF6)' : 'rgba(255,255,255,0.10)' }}
    >
      <motion.span
        className="absolute top-1 h-5 w-5 rounded-full bg-white shadow"
        animate={{ left: on ? 'calc(100% - 1.25rem - 0.25rem)' : '0.25rem' }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      />
    </motion.button>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState(() =>
    Object.fromEntries(NOTIFS.map((n) => [n.key, read(n.key)]))
  );

  const toggle = (key) => {
    const next = !prefs[key];
    localStorage.setItem(key, next ? '1' : '0');
    setPrefs((p) => ({ ...p, [key]: next }));
  };

  return (
    <div className="min-h-screen bg-bg pb-16 page-enter" style={{ paddingTop: 'env(safe-area-inset-top,0px)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border/30"
        style={{ background: 'rgba(7,9,26,0.90)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', paddingTop: 'env(safe-area-inset-top,0px)' }}
      >
        <div className="max-w-sm mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/profile')}
            className="h-8 w-8 flex items-center justify-center rounded-xl text-muted hover:text-text transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-heading font-semibold text-text text-base flex-1">Notifications</span>
        </div>
      </div>

      <motion.div className="max-w-sm mx-auto px-4 pt-6 flex flex-col gap-4" variants={container} initial="hidden" animate="show">
        <motion.p variants={fadeUp} className="text-muted text-sm leading-relaxed">
          Notification preferences are saved on this device. Push notifications require your browser's permission.
        </motion.p>

        <motion.div variants={fadeUp}
          className="rounded-3xl overflow-hidden divide-y"
          style={{ background: 'rgba(13,18,37,0.90)', border: '1px solid rgba(30,45,78,0.55)', divideColor: 'rgba(30,45,78,0.4)' }}
        >
          {NOTIFS.map((n) => (
            <div key={n.key} className="flex items-center gap-3.5 px-4 py-4">
              <span className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl text-[17px]" style={{ background: n.grad }}>
                {n.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text leading-tight">{n.label}</p>
                <p className="text-xs text-muted/55 mt-0.5 leading-snug">{n.desc}</p>
              </div>
              <Toggle on={prefs[n.key]} onChange={() => toggle(n.key)} />
            </div>
          ))}
        </motion.div>

        <motion.p variants={fadeUp} className="text-muted/40 text-xs text-center leading-relaxed px-4">
          In-app notifications are always shown. Enabling push requires accepting your browser's notification permission prompt.
        </motion.p>
      </motion.div>
    </div>
  );
}
