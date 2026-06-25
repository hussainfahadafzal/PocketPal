import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../api/client';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import BottomNav from '../components/BottomNav';
import TopBar from '../components/TopBar';
import SavingsJarCard from '../components/SavingsJarCard';

const inr = (n) => Math.round(Math.abs(n)).toLocaleString('en-IN');

const PALETTE = [
  { name: 'Blue',   hex: '#3B6CFF' },
  { name: 'Green',  hex: '#10B981' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Amber',  hex: '#F59E0B' },
  { name: 'Red',    hex: '#EF4444' },
  { name: 'Slate',  hex: '#94A3B8' },
];

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function fmtDate(isoStr) {
  return new Date(isoStr + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function computedEndFromDays(days) {
  if (!days || isNaN(days) || parseInt(days, 10) < 1) return null;
  const d = new Date();
  d.setDate(d.getDate() + parseInt(days, 10));
  return d.toISOString().split('T')[0];
}

// ── Small helpers ──────────────────────────────────────────────────────────────
function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function RupeeInput({ label, value, onChange, placeholder = '0', error }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{label}</label>
      )}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-heading pointer-events-none select-none">
          ₹
        </span>
        <input
          type="number" min="0" value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-surface-2 border ${error ? 'border-danger' : 'border-border'}
            rounded-xl pl-9 pr-4 py-3 text-text text-sm outline-none
            focus:border-primary transition-all duration-150 placeholder:text-muted/30`}
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-3">
      {children}
    </p>
  );
}

function Toggle({ enabled, onToggle, disabled }) {
  return (
    <motion.button
      onClick={onToggle}
      disabled={disabled}
      className="relative shrink-0 w-12 h-6 rounded-full transition-colors duration-300 disabled:opacity-50"
      style={{
        background: enabled
          ? 'linear-gradient(135deg, #3B6CFF 0%, #8B5CF6 100%)'
          : '#1E2D4E',
        boxShadow: enabled ? '0 2px 12px rgba(59,108,255,0.45)' : 'none',
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

// ── Cycle mode form (reused in reset) ─────────────────────────────────────────
function CycleModeForm({ mode, setMode, days, setDays, refillDate, setRefillDate, error }) {
  const previewEnd = mode === 'days' ? computedEndFromDays(days) : refillDate;
  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex rounded-xl overflow-hidden"
        style={{ border: '1px solid rgba(30,45,78,0.7)' }}
      >
        {[
          { key: 'days', label: 'Last me X days' },
          { key: 'date', label: 'Until a date' },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className="flex-1 py-2.5 text-xs font-semibold transition-all duration-200"
            style={mode === key ? {
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

      {mode === 'days' ? (
        <div>
          <input
            type="number" min="1" max="366"
            placeholder="e.g. 30"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className={`w-full bg-surface-2 border ${error ? 'border-danger' : 'border-border'}
              rounded-xl px-4 py-3 text-text text-sm outline-none
              focus:border-primary transition-all duration-150 placeholder:text-muted/30`}
          />
          {previewEnd && (
            <p className="text-muted text-xs mt-1.5">
              Budget lasts until <span className="text-text/70 font-medium">{fmtDate(previewEnd)}</span>
            </p>
          )}
        </div>
      ) : (
        <div>
          <input
            type="date"
            min={tomorrowISO()}
            value={refillDate}
            onChange={(e) => setRefillDate(e.target.value)}
            className={`w-full bg-surface-2 border ${error ? 'border-danger' : 'border-border'}
              rounded-xl px-4 py-3 text-text text-sm outline-none
              focus:border-primary transition-all duration-150`}
          />
          {refillDate && (
            <p className="text-muted text-xs mt-1.5">
              {Math.ceil((new Date(refillDate + 'T00:00:00') - new Date()) / 86400000)} days to go
            </p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

// ── Main Budgets page ─────────────────────────────────────────────────────────
export default function Budgets() {
  // ── wallet form ──────────────────────────────────────────────────────────
  const [wallet, setWallet]           = useState({ monthly_balance: '', savings_goal: '', goal_name: '' });
  const [walletSaving, setWalletSaving]   = useState(false);
  const [walletStatus, setWalletStatus]   = useState(null);
  const [walletErrors, setWalletErrors]   = useState({});

  // ── cycle info ───────────────────────────────────────────────────────────
  const [cycleInfo, setCycleInfo]       = useState(null);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetMode, setResetMode]       = useState('days');
  const [resetDays, setResetDays]       = useState('30');
  const [resetDate, setResetDate]       = useState('');
  const [resetBalance, setResetBalance] = useState('');
  const [resetSaving, setResetSaving]   = useState(false);
  const [resetStatus, setResetStatus]   = useState(null);
  const [resetError, setResetError]     = useState('');

  // ── round-up toggle ──────────────────────────────────────────────────────
  const [roundupEnabled, setRoundupEnabled] = useState(false);
  const [roundupToggling, setRoundupToggling] = useState(false);
  const [jarRefetchKey, setJarRefetchKey]   = useState(0);

  // ── jar goal form ────────────────────────────────────────────────────────
  const [jarGoalName,   setJarGoalName]   = useState('');
  const [jarGoalAmount, setJarGoalAmount] = useState('');
  const [jarGoalSaving, setJarGoalSaving] = useState(false);
  const [jarGoalStatus, setJarGoalStatus] = useState(null);
  const [jarGoalError,  setJarGoalError]  = useState('');

  // ── categories ───────────────────────────────────────────────────────────
  const [categories,   setCategories]  = useState([]);
  const [catSpent,     setCatSpent]    = useState({});
  const [newCat,       setNewCat]      = useState({ name: '', monthly_cap: '', color: PALETTE[0].hex });
  const [catAdding,    setCatAdding]   = useState(false);
  const [catError,     setCatError]    = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    client.get('/wallet')
      .then((res) => {
        setWallet({
          monthly_balance: res.data.monthly_balance ?? '',
          savings_goal:    res.data.savings_goal    ?? '',
          goal_name:       res.data.goal_name       ?? '',
        });
        setRoundupEnabled(res.data.roundup_enabled ?? false);
        setJarGoalName(res.data.jar_goal_name     ?? '');
        setJarGoalAmount(res.data.jar_goal_amount ? String(res.data.jar_goal_amount) : '');
        setCycleInfo({
          next_refill_date: res.data.next_refill_date ?? null,
          cycle_expired:    res.data.cycle_expired    ?? false,
          days_left:        res.data.days_left        ?? 0,
          budget_mode:      res.data.budget_mode      ?? null,
        });
        // Auto-open reset form if cycle is expired
        if (res.data.cycle_expired) setShowResetForm(true);
      })
      .catch(() => {});

    loadCategories();

    client.get('/expenses', { params: { month: currentMonth() } })
      .then((res) => {
        const spent = {};
        res.data.forEach((e) => {
          if (e.category_id) spent[e.category_id] = (spent[e.category_id] || 0) + e.amount;
        });
        setCatSpent(spent);
      })
      .catch(() => {});
  }, []);

  function loadCategories() {
    client.get('/categories').then((res) => setCategories(res.data)).catch(() => {});
  }

  // ── Wallet save (balance/goal update — does NOT reset cycle) ─────────────
  async function saveWallet() {
    const errs = {};
    const bal  = parseFloat(wallet.monthly_balance);
    const goal = parseFloat(wallet.savings_goal);
    if (!wallet.monthly_balance || isNaN(bal) || bal <= 0)
      errs.monthly_balance = 'Enter a positive amount';
    if (wallet.savings_goal && !isNaN(goal) && goal < 0)
      errs.savings_goal = 'Enter a valid amount';
    if (!isNaN(bal) && !isNaN(goal) && goal > bal)
      errs.savings_goal = 'Cannot exceed monthly budget';
    if (Object.keys(errs).length) { setWalletErrors(errs); return; }
    setWalletErrors({});
    setWalletSaving(true);
    setWalletStatus(null);
    try {
      await client.post('/wallet', {
        monthly_balance: bal,
        savings_goal:    parseFloat(wallet.savings_goal) || 0,
        goal_name:       wallet.goal_name.trim() || null,
      });
      setWalletStatus('ok');
      setTimeout(() => setWalletStatus(null), 2500);
    } catch {
      setWalletStatus('err');
    } finally {
      setWalletSaving(false);
    }
  }

  // ── Cycle reset ──────────────────────────────────────────────────────────
  async function resetCycle() {
    const bal = parseFloat(resetBalance) || parseFloat(wallet.monthly_balance);
    if (!bal || isNaN(bal) || bal <= 0) { setResetError('Enter your new balance'); return; }
    if (resetMode === 'days') {
      const d = parseInt(resetDays, 10);
      if (!resetDays || isNaN(d) || d < 1) { setResetError('Enter at least 1 day'); return; }
    } else {
      if (!resetDate) { setResetError('Pick a refill date'); return; }
    }
    setResetError('');
    setResetSaving(true);
    setResetStatus(null);
    try {
      const body = {
        monthly_balance: bal,
        savings_goal:    parseFloat(wallet.savings_goal) || 0,
        goal_name:       wallet.goal_name.trim() || null,
      };
      if (resetMode === 'days') {
        body.number_of_days = parseInt(resetDays, 10);
      } else {
        body.next_refill_date = resetDate;
      }
      const res = await client.post('/wallet', body);
      setWallet((w) => ({ ...w, monthly_balance: String(bal) }));
      setCycleInfo({
        next_refill_date: res.data.next_refill_date ?? null,
        cycle_expired:    false,
        days_left:        res.data.days_left ?? 0,
        budget_mode:      res.data.budget_mode ?? null,
      });
      setResetBalance('');
      setResetStatus('ok');
      setShowResetForm(false);
      setTimeout(() => setResetStatus(null), 2500);
    } catch (err) {
      setResetError(err.response?.data?.detail || 'Could not reset. Try again.');
    } finally {
      setResetSaving(false);
    }
  }

  // ── Round-up toggle ──────────────────────────────────────────────────────
  async function toggleRoundup() {
    setRoundupToggling(true);
    try {
      const res = await client.post('/wallet/roundup');
      setRoundupEnabled(res.data.roundup_enabled);
      setJarRefetchKey((k) => k + 1);
    } catch {
    } finally {
      setRoundupToggling(false);
    }
  }

  // ── Jar goal save ────────────────────────────────────────────────────────
  async function saveJarGoal() {
    const name   = jarGoalName.trim();
    const amount = parseFloat(jarGoalAmount);
    if (!name)               { setJarGoalError('Enter a goal name'); return; }
    if (!amount || amount <= 0) { setJarGoalError('Enter a positive amount'); return; }
    setJarGoalError('');
    setJarGoalSaving(true);
    setJarGoalStatus(null);
    try {
      await client.post('/wallet/jar-goal', { jar_goal_name: name, jar_goal_amount: amount });
      setJarGoalStatus('ok');
      setJarRefetchKey((k) => k + 1);
      setTimeout(() => setJarGoalStatus(null), 2500);
    } catch {
      setJarGoalStatus('err');
    } finally {
      setJarGoalSaving(false);
    }
  }

  // ── Categories ───────────────────────────────────────────────────────────
  async function addCategory() {
    if (!newCat.name.trim()) { setCatError('Category name is required'); return; }
    setCatError('');
    setCatAdding(true);
    try {
      await client.post('/categories', {
        name: newCat.name.trim(), monthly_cap: parseFloat(newCat.monthly_cap) || null, color: newCat.color,
      });
      setNewCat({ name: '', monthly_cap: '', color: PALETTE[0].hex });
      loadCategories();
    } catch {
      setCatError('Could not add category. Try again.');
    } finally {
      setCatAdding(false);
    }
  }

  async function deleteCategory(id) {
    try {
      await client.delete(`/categories/${id}`);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setCatSpent((prev) => { const n = { ...prev }; delete n[id]; return n; });
    } catch {
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <div className="min-h-screen bg-bg pb-28 page-enter">
      <TopBar showLogout />

      <div className="max-w-sm mx-auto px-4 pt-5 flex flex-col gap-6">

        <h1 className="font-heading text-2xl font-semibold text-text">Budgets</h1>

        {/* ── Budget Cycle ─────────────────────────────────────────────── */}
        <section>
          <SectionLabel>Budget Cycle</SectionLabel>

          <div
            className="rounded-3xl p-5"
            style={{
              background: cycleInfo?.cycle_expired
                ? 'linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(249,115,22,0.07) 100%)'
                : 'rgba(13,18,37,0.8)',
              border: cycleInfo?.cycle_expired
                ? '1px solid rgba(245,158,11,0.35)'
                : '1px solid rgba(30,45,78,0.6)',
              transition: 'background 0.3s ease, border-color 0.3s ease',
            }}
          >
            {cycleInfo?.next_refill_date ? (
              <>
                {cycleInfo.cycle_expired ? (
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl shrink-0">⏰</span>
                    <div>
                      <p className="text-warn text-sm font-semibold">Budget cycle ended</p>
                      <p className="text-muted text-xs mt-0.5">
                        New money in? Start a fresh cycle below.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-muted text-xs font-semibold uppercase tracking-[0.08em] mb-1">
                        Current cycle
                      </p>
                      <p className="text-text text-sm font-medium">
                        Ends {fmtDate(cycleInfo.next_refill_date)}
                      </p>
                      <p className="text-muted text-xs mt-0.5">
                        {cycleInfo.days_left} day{cycleInfo.days_left !== 1 ? 's' : ''} remaining
                      </p>
                    </div>
                    <div
                      className="rounded-2xl px-3 py-1.5 text-xs font-bold"
                      style={{
                        background: 'linear-gradient(135deg, rgba(59,108,255,0.15) 0%, rgba(139,92,246,0.12) 100%)',
                        border: '1px solid rgba(59,108,255,0.25)',
                        color: '#3B6CFF',
                      }}
                    >
                      {cycleInfo.days_left}d left
                    </div>
                  </div>
                )}

                {/* Reset button */}
                <button
                  onClick={() => setShowResetForm((s) => !s)}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95"
                  style={{
                    background: showResetForm
                      ? 'rgba(59,108,255,0.15)'
                      : 'rgba(30,45,78,0.5)',
                    border: '1px solid rgba(59,108,255,0.25)',
                    color: '#7A8BAD',
                  }}
                >
                  {showResetForm ? 'Cancel reset' : '💰 Got new money? Reset cycle'}
                </button>

                {resetStatus === 'ok' && (
                  <p className="text-success text-xs text-center mt-2">Cycle reset ✓</p>
                )}
              </>
            ) : (
              <div>
                <p className="text-muted text-sm mb-3">No budget cycle set yet.</p>
              </div>
            )}

            {/* ── Inline reset form ── */}
            <AnimatePresence>
              {showResetForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  style={{ overflow: 'hidden' }}
                >
                  <div
                    className="mt-4 pt-4 flex flex-col gap-4"
                    style={{ borderTop: '1px solid rgba(30,45,78,0.6)' }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
                      Start a new cycle
                    </p>
                    <RupeeInput
                      label="How much do you have now?"
                      value={resetBalance}
                      onChange={setResetBalance}
                      placeholder={String(wallet.monthly_balance || '0')}
                    />
                    <CycleModeForm
                      mode={resetMode}
                      setMode={setResetMode}
                      days={resetDays}
                      setDays={setResetDays}
                      refillDate={resetDate}
                      setRefillDate={setResetDate}
                      error={resetError}
                    />
                    <Button onClick={resetCycle} loading={resetSaving}>
                      Reset budget cycle
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ── Monthly wallet ───────────────────────────────────────────── */}
        <section>
          <SectionLabel>Wallet Settings</SectionLabel>
          <Card>
            <div className="flex flex-col gap-4">
              <RupeeInput
                label="Current budget"
                value={wallet.monthly_balance}
                onChange={(v) => setWallet((w) => ({ ...w, monthly_balance: v }))}
                error={walletErrors.monthly_balance}
              />
              <RupeeInput
                label="Savings goal"
                value={wallet.savings_goal}
                onChange={(v) => setWallet((w) => ({ ...w, savings_goal: v }))}
                error={walletErrors.savings_goal}
              />
              <Input
                label="Saving for (optional)"
                placeholder="e.g. New laptop, Spring trip"
                value={wallet.goal_name}
                onChange={(e) => setWallet((w) => ({ ...w, goal_name: e.target.value }))}
              />
              <Button onClick={saveWallet} loading={walletSaving}>
                {walletStatus === 'ok' ? 'Saved ✓' : 'Save settings'}
              </Button>
              {walletStatus === 'err' && (
                <p className="text-danger text-xs text-center">Could not save. Try again.</p>
              )}
            </div>
          </Card>
        </section>

        {/* ── Savings Jar ──────────────────────────────────────────────── */}
        <section>
          <SectionLabel>Savings Jar</SectionLabel>

          <div
            className="rounded-3xl p-5 mb-4"
            style={{
              background: roundupEnabled
                ? 'linear-gradient(135deg, rgba(59,108,255,0.12) 0%, rgba(139,92,246,0.10) 100%)'
                : 'rgba(13,18,37,0.8)',
              border: roundupEnabled
                ? '1px solid rgba(59,108,255,0.35)'
                : '1px solid rgba(30,45,78,0.6)',
              transition: 'background 0.35s ease, border-color 0.35s ease',
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-base leading-none">🪙</span>
                  <p className="text-text text-sm font-semibold">Round-up saving</p>
                </div>
                <p className="text-muted text-xs leading-relaxed">
                  We round each spend up to ₹10 and stash the spare in your jar.{' '}
                  <span style={{
                    background: 'linear-gradient(135deg, #EC4899 0%, #F97316 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontWeight: 600,
                  }}>
                    Hit a 7-day streak and every round-up doubles!
                  </span>
                </p>
              </div>
              <Toggle enabled={roundupEnabled} onToggle={toggleRoundup} disabled={roundupToggling} />
            </div>
          </div>

          <div className="mb-4">
            <SavingsJarCard alwaysShow refetchKey={jarRefetchKey} />
          </div>

          <Card>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-4">Set jar goal</p>
            <div className="flex flex-col gap-4">
              <Input
                label="Goal name"
                placeholder="e.g. Goa trip, New phone"
                value={jarGoalName}
                onChange={(e) => setJarGoalName(e.target.value)}
              />
              <RupeeInput
                label="Target amount"
                value={jarGoalAmount}
                onChange={setJarGoalAmount}
                placeholder="2000"
                error={jarGoalError}
              />
              <Button onClick={saveJarGoal} loading={jarGoalSaving}>
                {jarGoalStatus === 'ok' ? 'Goal saved ✓' : 'Save jar goal'}
              </Button>
              {jarGoalStatus === 'err' && (
                <p className="text-danger text-xs text-center">Could not save. Try again.</p>
              )}
            </div>
          </Card>
        </section>

        {/* ── Categories ───────────────────────────────────────────────── */}
        <section className="pb-2">
          <SectionLabel>Categories</SectionLabel>

          <Card className="mb-4">
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Category name"
                    value={newCat.name}
                    onChange={(e) => setNewCat((c) => ({ ...c, name: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                    className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3
                      text-text text-sm outline-none focus:border-primary transition-all duration-150
                      placeholder:text-muted/40"
                  />
                </div>
                <div className="w-[88px] relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm pointer-events-none select-none">₹</span>
                  <input
                    type="number" min="0" placeholder="Cap"
                    value={newCat.monthly_cap}
                    onChange={(e) => setNewCat((c) => ({ ...c, monthly_cap: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded-xl pl-7 pr-2 py-3
                      text-text text-sm outline-none focus:border-primary transition-all duration-150
                      placeholder:text-muted/40"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted mb-2.5">Color</p>
                <div className="flex gap-2.5">
                  {PALETTE.map(({ name, hex }) => (
                    <button
                      key={hex}
                      onClick={() => setNewCat((c) => ({ ...c, color: hex }))}
                      className="w-7 h-7 rounded-full transition-transform duration-150 hover:scale-110 active:scale-95"
                      style={{
                        backgroundColor: hex,
                        boxShadow: newCat.color === hex ? `0 0 0 2px #16233D, 0 0 0 4px ${hex}` : 'none',
                        transform: newCat.color === hex ? 'scale(1.15)' : undefined,
                      }}
                      aria-label={name}
                    />
                  ))}
                </div>
              </div>

              {catError && <p className="text-danger text-xs">{catError}</p>}
              <Button onClick={addCategory} loading={catAdding}>Add category</Button>
            </div>
          </Card>

          {categories.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-text text-sm font-medium">No categories yet</p>
              <p className="text-muted text-xs mt-1">Add one above to track spending by type</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {categories.map((cat) => {
                const spent  = catSpent[cat.id] || 0;
                const hasCap = cat.monthly_cap != null;
                const pct    = hasCap ? Math.min((spent / cat.monthly_cap) * 100, 100) : 0;
                const isOver = hasCap && spent > cat.monthly_cap;
                const isNear = hasCap && !isOver && pct >= 80;
                const barColor = isOver ? '#EF4444' : isNear ? '#F59E0B' : (cat.color ?? '#3B6CFF');
                const delPending = pendingDelete === cat.id;

                return (
                  <div
                    key={cat.id}
                    className={`border rounded-2xl p-4 transition-colors duration-150 ${
                      delPending ? 'bg-danger/5 border-danger/30' : 'bg-surface border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color ?? '#94A3B8' }} />
                        <span className="text-text text-sm font-medium truncate">{cat.name}</span>
                        {isOver && <span className="text-danger text-[10px] font-bold uppercase tracking-wide shrink-0">over</span>}
                      </div>
                      {delPending ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => deleteCategory(cat.id)} className="text-danger text-xs font-semibold px-2.5 py-1 rounded-lg bg-danger/10 hover:bg-danger/20 active:scale-95 transition-all duration-150">
                            Delete
                          </button>
                          <button onClick={() => setPendingDelete(null)} className="text-muted text-xs hover:text-text transition-colors">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setPendingDelete(cat.id)} className="text-muted/40 hover:text-danger p-1 rounded-lg hover:bg-danger/10 active:scale-95 transition-all duration-150 shrink-0" aria-label="Delete category">
                          <TrashIcon />
                        </button>
                      )}
                    </div>

                    {hasCap ? (
                      <>
                        <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden mb-2">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted text-xs">₹{inr(spent)} spent</span>
                          <span className={`text-xs ${isOver ? 'text-danger font-medium' : 'text-muted'}`}>of ₹{inr(cat.monthly_cap)}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted text-xs">₹{inr(spent)} spent · no cap set</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
      <BottomNav />
    </div>
  );
}
