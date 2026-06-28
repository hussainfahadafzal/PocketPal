import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../api/client';
import Button from '../components/Button';
import Toast from '../components/Toast';
import { fmtFull, getCurrencySymbol } from '../utils/format';

const SPRING = { duration: 0.45, ease: [0.22, 1, 0.36, 1] };
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: SPRING } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } } };

const EMOJI_OPTIONS = ['🎯','💻','📱','✈️','🏠','🚗','🎓','💍','🎮','🏋️','🌴','💰','🎁','🏥','🛒','📚','🎸','👟','💄','🍕'];

const ACCENT_COLORS = ['#3B6CFF','#10B981','#EC4899','#F59E0B','#8B5CF6','#06B6D4','#EF4444','#84CC16'];
function goalAccent(id) { return ACCENT_COLORS[id % ACCENT_COLORS.length]; }

// ── Goal card ─────────────────────────────────────────────────────────────────

function GoalCard({ goal, onEdit }) {
  const accent = goalAccent(goal.id);
  const pct    = goal.progress_pct;
  const done   = pct >= 100;

  return (
    <motion.button
      layout
      variants={fadeUp}
      whileTap={{ scale: 0.98 }}
      onClick={() => onEdit(goal)}
      className="w-full text-left rounded-3xl p-4 flex flex-col gap-3"
      style={{ background: 'rgba(13,18,37,0.90)', border: `1px solid ${accent}28` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl leading-none">{goal.emoji || '🎯'}</span>
          <div>
            <p className="font-semibold text-text text-sm leading-tight">{goal.name}</p>
            <p className="text-muted/60 text-xs mt-0.5">{fmtFull(goal.saved_amount)} of {fmtFull(goal.target_amount)}</p>
          </div>
        </div>
        <span
          className="shrink-0 text-xs font-bold px-2 py-1 rounded-lg"
          style={{ color: done ? '#10B981' : accent, background: done ? 'rgba(16,185,129,0.12)' : `${accent}12` }}
        >
          {done ? '✓ Done' : `${pct}%`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: done ? '#10B981' : `linear-gradient(90deg, ${accent}, ${accent}88)` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {/* Remaining */}
      {!done && (
        <p className="text-[11px] text-muted/50">
          {fmtFull(Math.max(0, goal.target_amount - goal.saved_amount))} to go
        </p>
      )}
    </motion.button>
  );
}

// ── Goal modal (add / edit) ───────────────────────────────────────────────────

function GoalModal({ goal, onClose, onSaved, onDeleted }) {
  const isEdit = !!goal;
  const sym = getCurrencySymbol();

  const [name,    setName]    = useState(goal?.name    ?? '');
  const [emoji,   setEmoji]   = useState(goal?.emoji   ?? '🎯');
  const [target,  setTarget]  = useState(goal?.target_amount  != null ? String(goal.target_amount)  : '');
  const [saved,   setSaved]   = useState(goal?.saved_amount   != null ? String(goal.saved_amount)   : '');
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [deleting,setDeleting]= useState(false);

  const validate = () => {
    const e = {};
    if (!name.trim())          e.name   = 'Name is required';
    if (!target || Number(target) <= 0) e.target = 'Enter a positive target amount';
    if (saved !== '' && Number(saved) < 0) e.saved = 'Cannot be negative';
    return e;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      if (isEdit) {
        const r = await client.patch(`/goals/${goal.id}`, {
          name: name.trim(), emoji,
          target_amount: Number(target),
          saved_amount:  Number(saved || 0),
        });
        onSaved(r.data);
      } else {
        const r = await client.post('/goals', {
          name: name.trim(), emoji,
          target_amount: Number(target),
          saved_amount:  Number(saved || 0),
        });
        onSaved(r.data);
      }
    } catch {
      setErrors({ form: 'Could not save goal. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await client.delete(`/goals/${goal.id}`);
      onDeleted(goal.id);
    } catch {
      setErrors({ form: 'Could not delete goal.' });
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)', paddingBottom: 'max(1rem,env(safe-area-inset-bottom))' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={SPRING}
        className="w-full max-w-sm mx-4 rounded-3xl p-5 flex flex-col gap-4"
        style={{ background: 'rgba(10,14,30,0.99)', border: '1px solid rgba(30,45,78,0.7)' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-text text-base">{isEdit ? 'Edit Goal' : 'New Goal'}</h3>
          <button onClick={onClose} className="text-muted/60 hover:text-muted text-xl leading-none">✕</button>
        </div>

        {/* Emoji picker */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted/50 mb-2">Icon</p>
          <div className="flex flex-wrap gap-1.5">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e} type="button"
                onClick={() => setEmoji(e)}
                className="h-9 w-9 rounded-xl flex items-center justify-center text-lg transition-all duration-150"
                style={emoji === e
                  ? { background: 'linear-gradient(135deg,#3B6CFF,#8B5CF6)', boxShadow: '0 0 12px rgba(59,108,255,0.4)' }
                  : { background: 'rgba(255,255,255,0.05)' }
                }
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted/55">Goal name</label>
          <input
            type="text" value={name} onChange={(e) => { setName(e.target.value); setErrors((v) => ({ ...v, name: '' })); }}
            placeholder="e.g. New Laptop"
            className={`bg-surface-2 border ${errors.name ? 'border-danger' : 'border-border'} rounded-xl px-4 py-3 text-text text-sm outline-none focus:border-primary transition-colors`}
          />
          {errors.name && <p className="text-xs text-danger">{errors.name}</p>}
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted/55">Target ({sym})</label>
            <input
              type="number" min="1" step="any" value={target}
              onChange={(e) => { setTarget(e.target.value); setErrors((v) => ({ ...v, target: '' })); }}
              placeholder="50000"
              className={`bg-surface-2 border ${errors.target ? 'border-danger' : 'border-border'} rounded-xl px-4 py-3 text-text text-sm outline-none focus:border-primary transition-colors`}
            />
            {errors.target && <p className="text-xs text-danger">{errors.target}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted/55">Saved so far ({sym})</label>
            <input
              type="number" min="0" step="any" value={saved}
              onChange={(e) => { setSaved(e.target.value); setErrors((v) => ({ ...v, saved: '' })); }}
              placeholder="0"
              className={`bg-surface-2 border ${errors.saved ? 'border-danger' : 'border-border'} rounded-xl px-4 py-3 text-text text-sm outline-none focus:border-primary transition-colors`}
            />
            {errors.saved && <p className="text-xs text-danger">{errors.saved}</p>}
          </div>
        </div>

        {errors.form && <p className="text-xs text-danger text-center">{errors.form}</p>}

        <Button onClick={handleSave} loading={loading}>{isEdit ? 'Save changes' : 'Create goal'}</Button>

        {isEdit && (
          <button
            onClick={handleDelete} disabled={deleting}
            className="w-full py-2.5 text-sm text-red-400/80 font-medium hover:text-red-400 disabled:opacity-40 transition-colors"
          >
            {deleting ? 'Deleting…' : 'Delete goal'}
          </button>
        )}
      </motion.div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Goals() {
  const navigate = useNavigate();
  const [goals,   setGoals]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null); // null | 'new' | goal-object
  const [toast,   setToast]   = useState(null);

  useEffect(() => {
    client.get('/goals')
      .then((r) => setGoals(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSaved = (updatedGoal) => {
    setGoals((prev) => {
      const idx = prev.findIndex((g) => g.id === updatedGoal.id);
      return idx >= 0 ? prev.map((g) => (g.id === updatedGoal.id ? updatedGoal : g)) : [...prev, updatedGoal];
    });
    setModal(null);
    setToast({ message: modal?.id ? 'Goal updated!' : 'Goal created!', icon: '🎯' });
  };

  const handleDeleted = (id) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    setModal(null);
    setToast({ message: 'Goal deleted.', icon: '🗑️' });
  };

  const totalTarget = goals.reduce((s, g) => s + g.target_amount,  0);
  const totalSaved  = goals.reduce((s, g) => s + g.saved_amount,   0);
  const overallPct  = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  return (
    <div className="min-h-screen bg-bg pb-28 page-enter" style={{ paddingTop: 'env(safe-area-inset-top,0px)' }}>
      {toast && <Toast message={toast.message} icon={toast.icon} onDismiss={() => setToast(null)} />}
      <AnimatePresence>
        {modal !== null && (
          <GoalModal
            goal={modal === 'new' ? null : modal}
            onClose={() => setModal(null)}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
          />
        )}
      </AnimatePresence>

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
          <span className="font-heading font-semibold text-text text-base flex-1">My Goals</span>
          <motion.button whileTap={{ scale: 0.92 }} onClick={() => setModal('new')}
            className="h-8 w-8 flex items-center justify-center rounded-xl text-primary"
            style={{ background: 'rgba(59,108,255,0.12)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </motion.button>
        </div>
      </div>

      <motion.div className="max-w-sm mx-auto px-4 pt-5 flex flex-col gap-4" variants={container} initial="hidden" animate="show">

        {/* Summary banner (only when goals exist) */}
        {goals.length > 0 && (
          <motion.div variants={fadeUp}
            className="rounded-3xl p-4"
            style={{ background: 'linear-gradient(135deg,rgba(59,108,255,0.10) 0%,rgba(139,92,246,0.07) 100%)', border: '1px solid rgba(59,108,255,0.20)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted/60">Overall progress</p>
              <span className="text-sm font-bold text-primary">{overallPct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden mb-2">
              <motion.div className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg,#3B6CFF,#8B5CF6)' }}
                initial={{ width: 0 }} animate={{ width: `${overallPct}%` }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <p className="text-muted/60 text-xs">{fmtFull(totalSaved)} saved across {goals.length} goal{goals.length !== 1 ? 's' : ''}</p>
          </motion.div>
        )}

        {/* Goal list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          </div>
        ) : goals.length === 0 ? (
          <motion.div variants={fadeUp} className="flex flex-col items-center gap-4 py-16 text-center">
            <span className="text-5xl">🎯</span>
            <div>
              <p className="font-heading font-bold text-text text-lg">No goals yet</p>
              <p className="text-muted text-sm mt-1">Set a goal — laptop, trip, emergency fund — and track it here.</p>
            </div>
            <Button onClick={() => setModal('new')} className="mt-2 max-w-[200px]">Add first goal</Button>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {goals.map((g) => (
              <GoalCard key={g.id} goal={g} onEdit={(g) => setModal(g)} />
            ))}
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
}
