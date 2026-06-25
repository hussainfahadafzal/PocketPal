import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import client from '../api/client';
import TopBar from '../components/TopBar';
import Spinner from '../components/Spinner';
import { useCountUp } from '../hooks/useCountUp';

const CX = 100;
const CY = 100;
const R  = 76;
const C  = 2 * Math.PI * R;       // full circumference ≈ 477.5
const ARC_DEG = 240;               // gauge spans 240° (120° gap at bottom)
const ARC = (ARC_DEG / 360) * C;  // ≈ 318.3
const ROT = 150;                   // rotate so arc starts at ~8 o'clock (150° in SVG)

const LABEL_COLOR = {
  Excellent: '#8B5CF6',
  Good:      '#3B6CFF',
  Fair:      '#F59E0B',
  Poor:      '#EF4444',
};

const SIGNAL_META = [
  { key: 'score_discipline', label: 'Budget',   max: 300, color: '#3B6CFF', icon: '🎯' },
  { key: 'score_saving',     label: 'Saving',   max: 250, color: '#10B981', icon: '💰' },
  { key: 'score_streak',     label: 'Streak',   max: 200, color: '#EC4899', icon: '🔥' },
  { key: 'score_caps',       label: 'Caps',     max: 100, color: '#F59E0B', icon: '📊' },
];

// ── Circular gauge ───────────────────────────────────────────────────────────
function ScoreGauge({ score, label, loading }) {
  const animScore = useCountUp(score ?? 0, 1400);
  const filledArc = ((animScore / 850) * ARC).toFixed(2);
  const labelColor = LABEL_COLOR[label] ?? '#7A8BAD';

  return (
    <div className="relative mx-auto" style={{ width: 220, height: 220 }}>
      <svg viewBox="0 0 200 200" width={220} height={220} className="block">
        <defs>
          {/* Gradient follows the horizontal span of the arc */}
          <linearGradient
            id="scoreGrad"
            x1="24" y1="0" x2="176" y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%"   stopColor="#3B6CFF" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>

          {/* Glow filter for the filled arc */}
          <filter id="arcGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track — full 240° arc */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke="rgba(26,38,66,0.92)"
          strokeWidth={13}
          strokeLinecap="round"
          strokeDasharray={`${ARC.toFixed(2)} ${(C - ARC).toFixed(2)}`}
          transform={`rotate(${ROT} ${CX} ${CY})`}
        />

        {/* Score arc — driven by count-up animation */}
        {!loading && (
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke="url(#scoreGrad)"
            strokeWidth={13}
            strokeLinecap="round"
            strokeDasharray={`${filledArc} ${(C - parseFloat(filledArc)).toFixed(2)}`}
            transform={`rotate(${ROT} ${CX} ${CY})`}
            filter="url(#arcGlow)"
          />
        )}
      </svg>

      {/* Center overlay — score + label */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center select-none"
        style={{ paddingBottom: 12 }}
      >
        {loading ? (
          <Spinner size="md" />
        ) : (
          <>
            <p
              className="font-display font-bold text-white leading-none"
              style={{ fontSize: 'clamp(2.6rem, 14vw, 3.4rem)', letterSpacing: '-0.04em' }}
            >
              {animScore}
            </p>
            <p className="text-muted text-xs mt-0.5">/ 850</p>
            <p
              className="text-sm font-bold mt-1.5 tracking-wide"
              style={{ color: labelColor }}
            >
              {label}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Signal breakdown bar ─────────────────────────────────────────────────────
function SignalBar({ icon, label, value, max, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none">{icon}</span>
          <span className="text-xs font-semibold text-muted/80">{label}</span>
        </div>
        <span className="text-xs font-bold text-text/80">
          {value}<span className="text-muted/50 font-normal">/{max}</span>
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
        />
      </div>
    </div>
  );
}

// ── Tip card ──────────────────────────────────────────────────────────────────
function TipCard({ tip, index }) {
  // Strip the leading emoji from the tip string for the icon
  const emojiMatch = tip.match(/^([\u{1F300}-\u{1FAFF}🎯🔥💰🪙📊🌟])\s*/u);
  const icon  = emojiMatch ? emojiMatch[1] : '💡';
  const text  = emojiMatch ? tip.slice(emojiMatch[0].length) : tip;

  const gradients = [
    'linear-gradient(135deg, rgba(59,108,255,0.14) 0%, rgba(139,92,246,0.10) 100%)',
    'linear-gradient(135deg, rgba(16,185,129,0.14) 0%, rgba(6,182,212,0.10) 100%)',
    'linear-gradient(135deg, rgba(236,72,153,0.14) 0%, rgba(249,115,22,0.10) 100%)',
  ];
  const borders = [
    'rgba(59,108,255,0.28)',
    'rgba(16,185,129,0.28)',
    'rgba(236,72,153,0.28)',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.3 + index * 0.1 }}
      className="rounded-2xl px-4 py-3.5 flex items-start gap-3"
      style={{
        background: gradients[index % 3],
        border:     `1px solid ${borders[index % 3]}`,
      }}
    >
      <span className="text-xl leading-none shrink-0 mt-0.5">{icon}</span>
      <p className="text-text/80 text-sm leading-relaxed">{text}</p>
    </motion.div>
  );
}

// ── Score page ────────────────────────────────────────────────────────────────
const SPRING = { duration: 0.5, ease: [0.22, 1, 0.36, 1] };
const containerVariants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: SPRING },
};

export default function Score() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    client.get('/pocketscore')
      .then((r) => setData(r.data))
      .catch(() => setError('Could not load your score. Try again.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-bg pb-28 page-enter">
      <TopBar showLogout />

      <motion.div
        className="max-w-sm mx-auto px-4 pt-5 flex flex-col gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* ── Heading ── */}
        <motion.div variants={cardVariants}>
          <p className="text-muted text-sm mb-0.5">Your financial health</p>
          <h1 className="font-display text-[1.7rem] font-bold text-text leading-tight">
            PocketScore
          </h1>
        </motion.div>

        {/* ── Gauge ── */}
        <motion.div variants={cardVariants} className="flex flex-col items-center">
          {error ? (
            <p className="text-danger text-sm text-center py-8">{error}</p>
          ) : (
            <ScoreGauge
              score={data?.score ?? 0}
              label={data?.label ?? ''}
              loading={loading}
            />
          )}
        </motion.div>

        {/* ── Signal breakdown ── */}
        {!loading && data && (
          <motion.div
            variants={cardVariants}
            className="rounded-3xl p-5"
            style={{
              background: 'rgba(13,18,37,0.85)',
              border: '1px solid rgba(30,45,78,0.55)',
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted/60 mb-4">
              Score breakdown
            </p>
            <div className="flex flex-col gap-4">
              {SIGNAL_META.map((s) => (
                <SignalBar
                  key={s.key}
                  icon={s.icon}
                  label={s.label}
                  value={data[s.key]}
                  max={s.max}
                  color={s.color}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Tips ── */}
        {!loading && data?.tips?.length > 0 && (
          <motion.div variants={cardVariants}>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted/60 mb-3">
              What to work on
            </p>
            <div className="flex flex-col gap-3">
              {data.tips.map((tip, i) => (
                <TipCard key={i} tip={tip} index={i} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── How it works ── */}
        <motion.div variants={cardVariants}>
          <div
            className="rounded-3xl px-5 py-4 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(59,108,255,0.08) 0%, rgba(139,92,246,0.06) 100%)',
              border: '1px solid rgba(59,108,255,0.18)',
            }}
          >
            <div
              className="absolute top-0 left-8 right-8 h-px rounded-full"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(59,108,255,0.5), transparent)' }}
            />
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted/60 mb-3">
              What builds your score
            </p>
            <div className="flex flex-col gap-2.5">
              {[
                ['🎯', 'Budget (max 300)', 'Stay under your daily spend limit every day'],
                ['💰', 'Saving (max 250)', 'Hit your savings goal + grow your jar'],
                ['🔥', 'Streak (max 200)', 'Consecutive days under the limit'],
                ['📊', 'Caps (max 100)',   'Keep category spending within set caps'],
              ].map(([icon, title, desc]) => (
                <div key={title} className="flex items-start gap-3">
                  <span className="text-base leading-none shrink-0 mt-0.5">{icon}</span>
                  <div>
                    <p className="text-text/80 text-xs font-semibold">{title}</p>
                    <p className="text-muted/60 text-xs leading-snug">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-muted/40 text-[10px] mt-4 leading-relaxed">
              PocketScore is a personal budgeting signal, not a credit score.
              It has no connection to credit bureaus or lending decisions.
            </p>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
