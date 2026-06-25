import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import client from '../api/client';
import { useCountUp } from '../hooks/useCountUp';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const SPRING = { duration: 0.55, ease: [0.22, 1, 0.36, 1] };

// Parse "YYYY-MM-DD" as a LOCAL date (avoids UTC-midnight timezone drift)
function parseLocalDate(isoStr) {
  const [y, m, d] = isoStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function cycleDateLabel(start, end) {
  const s = parseLocalDate(start);
  const e = parseLocalDate(end);
  const opts = { day: 'numeric', month: 'short' };
  if (s.getFullYear() !== e.getFullYear())
    return `${s.toLocaleDateString('en-IN', { ...opts, year: 'numeric' })} – ${e.toLocaleDateString('en-IN', { ...opts, year: 'numeric' })}`;
  return `${s.toLocaleDateString('en-IN', opts)} – ${e.toLocaleDateString('en-IN', opts)}`;
}

/**
 * celebrateKey – bump to trigger streak-bump + glow animation.
 */
export default function StreakCalendar({ celebrateKey = 0 }) {
  const [data, setData] = useState(null);
  const [glowing, setGlowing] = useState(false);
  const numControls = useAnimationControls();
  const prevCelebKeyRef = useRef(0);

  useEffect(() => {
    client.get('/streak/calendar').then((r) => setData(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (celebrateKey === 0) return;
    if (celebrateKey === prevCelebKeyRef.current) return;
    if (!data || data.current_streak <= 0) return;
    prevCelebKeyRef.current = celebrateKey;
    numControls.start({ scale: [1, 1.45, 0.85, 1.15, 1], transition: { duration: 0.52, ease: 'easeOut' } });
    setGlowing(true);
    const t = setTimeout(() => setGlowing(false), 700);
    return () => clearTimeout(t);
  }, [celebrateKey, data, numControls]);

  const animStreak = useCountUp(data?.current_streak ?? 0, 800);

  if (!data) return null;

  // ── Build cycle grid ─────────────────────────────────────────────────────
  const cycleStart = parseLocalDate(data.cycle_start);
  const cycleEnd   = parseLocalDate(data.cycle_end);
  const todayLocal = new Date();
  todayLocal.setHours(0, 0, 0, 0);

  const totalDays = Math.round((cycleEnd - cycleStart) / 86400000) + 1;

  // Index API days by ISO date string
  const dayMap = {};
  (data.days || []).forEach((d) => { dayMap[d.date] = d; });

  const cycleCells = Array.from({ length: totalDays }, (_, i) => {
    const cellDate = addDays(cycleStart, i);
    const isoDate  = toISO(cellDate);
    const isFuture = cellDate > todayLocal;
    const dayNum   = cellDate.getDate();

    if (isFuture) return { dayNum, isoDate, future: true };
    const d = dayMap[isoDate];
    return {
      dayNum,
      isoDate,
      future: false,
      under_limit: d?.under_limit ?? false,
      is_today: d?.is_today ?? false,
    };
  });

  // Monday-first offset for the first column
  const startDow    = cycleStart.getDay(); // 0=Sun
  const startOffset = (startDow + 6) % 7;
  const gridCells   = [...Array(startOffset).fill(null), ...cycleCells];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.15 }}
    >
      {/* ── Streak headline ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-2 relative">
          <AnimatePresence>
            {glowing && (
              <motion.div
                key="glow-burst"
                className="absolute -inset-3 rounded-2xl pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.85, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.65, times: [0, 0.28, 1], ease: 'easeOut' }}
                style={{
                  background:
                    'radial-gradient(ellipse 80% 60% at 35% 55%, rgba(249,115,22,0.52) 0%, rgba(236,72,153,0.30) 45%, transparent 75%)',
                }}
              />
            )}
          </AnimatePresence>

          {data.current_streak > 0 ? (
            <>
              <motion.span
                className="text-2xl leading-none relative z-10"
                animate={{ scale: [1, 1.25, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
              >
                🔥
              </motion.span>
              <motion.span
                animate={numControls}
                className="font-display font-bold relative z-10"
                style={{
                  fontSize: 'clamp(1.9rem, 10vw, 2.4rem)',
                  letterSpacing: '-0.04em',
                  background: 'linear-gradient(135deg, #EC4899 0%, #F97316 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  display: 'inline-block',
                }}
              >
                {animStreak}
              </motion.span>
              <span className="text-muted text-sm font-medium relative z-10">-day streak</span>
            </>
          ) : (
            <>
              <span className="text-xl leading-none">💪</span>
              <span className="text-muted text-sm font-medium">Start your streak today!</span>
            </>
          )}
        </div>

        {/* Cycle date range label */}
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted/50">
          {cycleDateLabel(data.cycle_start, data.cycle_end)}
        </span>
      </div>

      {/* ── Calendar grid ────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-3"
        style={{
          background: 'rgba(13,18,37,0.85)',
          border: '1px solid rgba(30,45,78,0.55)',
        }}
      >
        <div className="grid grid-cols-7 gap-1 mb-1.5">
          {DAY_LABELS.map((l, i) => (
            <div key={i} className="flex items-center justify-center">
              <span className="text-[9px] font-bold uppercase text-muted/40 leading-none">{l}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {gridCells.map((cell, idx) => {
            if (!cell) return <div key={`pad-${idx}`} className="aspect-square" />;

            const { dayNum, isoDate, future, under_limit, is_today } = cell;

            let bg, numColor, shadow, ringStyle;

            if (future) {
              bg       = 'rgba(27,37,68,0.22)';
              numColor = 'rgba(122,139,173,0.12)';
            } else if (under_limit) {
              bg       = 'linear-gradient(135deg, #EC4899 0%, #F97316 100%)';
              numColor = 'rgba(255,255,255,0.92)';
              shadow   = '0 2px 8px rgba(236,72,153,0.45)';
            } else {
              bg       = '#141C35';
              numColor = 'rgba(122,139,173,0.38)';
            }

            if (is_today) {
              ringStyle = { outline: '2px solid rgba(255,255,255,0.55)', outlineOffset: '2px' };
            }

            return (
              <motion.div
                key={isoDate}
                className="aspect-square rounded-lg flex items-center justify-center"
                style={{ background: bg, boxShadow: shadow, ...ringStyle }}
                initial={!future ? { opacity: 0, scale: 0.6 } : false}
                animate={!future ? { opacity: 1, scale: 1 } : undefined}
                transition={{
                  duration: 0.25,
                  ease: 'backOut',
                  delay: !future ? 0.05 + idx * 0.008 : 0,
                }}
              >
                <span className="text-[9px] font-bold leading-none" style={{ color: numColor }}>
                  {dayNum}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Legend ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mt-2.5 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(135deg, #EC4899 0%, #F97316 100%)' }} />
          <span className="text-[10px] text-muted/60">Under limit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-surface-2" />
          <span className="text-[10px] text-muted/60">Over limit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(27,37,68,0.3)' }} />
          <span className="text-[10px] text-muted/60">Upcoming</span>
        </div>
      </div>
    </motion.div>
  );
}
