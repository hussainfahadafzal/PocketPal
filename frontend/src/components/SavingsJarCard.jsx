import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import client from '../api/client';
import { useCountUp } from '../hooks/useCountUp';

const SPRING = { duration: 0.55, ease: [0.22, 1, 0.36, 1] };

const GRAD_TEXT = {
  background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

/**
 * alwaysShow – show even when jar is empty (Budgets page context).
 *              Default false: hide on Dashboard until there's something in the jar.
 * refetchKey  – bump this number to force a data refresh (e.g. after toggling roundup).
 * spareFly    – the roundup spare (₹) just added; triggers a "+₹X" float animation.
 */
export default function SavingsJarCard({ alwaysShow = false, refetchKey = 0, spareFly = 0 }) {
  const [data, setData] = useState(null);
  // flyKey increments each time a new spare arrives, remounting the fly element.
  const [flyKey, setFlyKey] = useState(0);
  const prevSpareRef = useRef(0);

  useEffect(() => {
    client.get('/wallet/jar').then((r) => setData(r.data)).catch(() => {});
  }, [refetchKey]);

  useEffect(() => {
    if (spareFly > 0 && spareFly !== prevSpareRef.current) {
      prevSpareRef.current = spareFly;
      setFlyKey((k) => k + 1);
    }
  }, [spareFly]);

  const animJar = useCountUp(data?.savings_jar ?? 0, 1000);

  if (!data) return null;
  if (!alwaysShow && data.savings_jar === 0 && data.jar_goal_amount === 0) return null;

  const hasGoal = data.jar_goal_amount > 0;
  const spareDisplay =
    spareFly % 1 !== 0 ? spareFly.toFixed(2) : String(Math.round(spareFly));

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.2 }}
      className="rounded-3xl p-5 relative"
      style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.13) 0%, rgba(6,182,212,0.10) 100%)',
        border: '1px solid rgba(16,185,129,0.28)',
      }}
    >
      {/* Top accent shimmer */}
      <div
        className="absolute top-0 left-8 right-8 h-px rounded-full"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.65), transparent)' }}
      />

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none" role="img" aria-label="Savings jar">🫙</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted/70">
            Savings Jar
          </span>
        </div>

        {data.double_active && (
          <motion.div
            animate={{ scale: [1, 1.07, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(236,72,153,0.22) 0%, rgba(249,115,22,0.18) 100%)',
              border: '1px solid rgba(236,72,153,0.45)',
              boxShadow: '0 0 12px rgba(236,72,153,0.25)',
            }}
          >
            <span className="text-[10px] leading-none">🔥</span>
            <span className="text-[10px] font-bold" style={GRAD_TEXT}>
              2× round-up active!
            </span>
          </motion.div>
        )}
      </div>

      {/* ── Jar total + float animation ───────────────────────────────── */}
      <div className="relative">
        <p
          className="font-display font-bold leading-none mb-1"
          style={{
            fontSize: 'clamp(2rem, 11vw, 2.8rem)',
            letterSpacing: '-0.03em',
            ...GRAD_TEXT,
          }}
        >
          ₹{animJar.toLocaleString('en-IN')}
        </p>

        {/* +₹X float-up — keyed so each new spare remounts and replays */}
        <AnimatePresence>
          {flyKey > 0 && (
            <motion.div
              key={`fly-${flyKey}`}
              className="absolute left-0 top-0 pointer-events-none select-none"
              initial={{ y: 0, opacity: 1 }}
              animate={{ y: -52, opacity: 0 }}
              exit={{}}
              transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="font-display font-bold text-xl" style={GRAD_TEXT}>
                +₹{spareDisplay}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {hasGoal ? (
        <>
          <p className="text-muted/70 text-xs mb-3 leading-snug">
            <span className="text-text/70 font-medium">{data.jar_goal_name || 'Goal'}</span>
            {' '}·{' '}
            ₹{Math.round(data.jar_goal_amount).toLocaleString('en-IN')} target
          </p>

          {/* ── Progress bar ──────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #10B981 0%, #06B6D4 100%)' }}
                initial={{ width: '0%' }}
                animate={{ width: `${Math.min(data.progress_pct, 100)}%` }}
                transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
              />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted/60 text-[10px]">
                {data.progress_pct >= 100 ? '🎉 Goal reached!' : `${data.progress_pct.toFixed(1)}% there`}
              </span>
              <span className="text-muted/50 text-[10px]">
                ₹{Math.round(data.jar_goal_amount - data.savings_jar).toLocaleString('en-IN')} to go
              </span>
            </div>
          </div>
        </>
      ) : (
        <p className="text-muted/55 text-xs leading-relaxed mt-1">
          Set a jar goal in Budgets to track your progress here.
        </p>
      )}
    </motion.div>
  );
}
