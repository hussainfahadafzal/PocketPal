import { useEffect, useState } from 'react';
import client from '../api/client';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import BottomNav from '../components/BottomNav';

const inr = (n) => Math.round(Math.abs(n)).toLocaleString('en-IN');

// These match the app's design-system token values exactly
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

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function RupeeInput({ label, value, onChange, placeholder = '0' }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-muted">{label}</label>}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-heading pointer-events-none">
          ₹
        </span>
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-surface-2 border border-border rounded-xl pl-9 pr-4 py-3
            text-text text-sm outline-none focus:border-primary transition-colors
            placeholder:text-muted/30"
        />
      </div>
    </div>
  );
}

export default function Budgets() {
  // ── wallet form ──
  const [wallet, setWallet] = useState({ monthly_balance: '', savings_goal: '', goal_name: '' });
  const [walletSaving, setWalletSaving] = useState(false);
  const [walletStatus, setWalletStatus] = useState(null); // 'ok' | 'err'

  const [walletErrors, setWalletErrors] = useState({});

  // ── categories ──
  const [categories, setCategories] = useState([]);
  const [catSpent, setCatSpent] = useState({}); // id → amount spent this month
  const [newCat, setNewCat] = useState({ name: '', monthly_cap: '', color: PALETTE[0].hex });
  const [catAdding, setCatAdding] = useState(false);
  const [catError, setCatError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    client.get('/wallet')
      .then((res) =>
        setWallet({
          monthly_balance: res.data.monthly_balance ?? '',
          savings_goal:    res.data.savings_goal    ?? '',
          goal_name:       res.data.goal_name       ?? '',
        })
      )
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

  async function saveWallet() {
    const errs = {};
    const bal = parseFloat(wallet.monthly_balance);
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
        goal_name:       wallet.goal_name.trim()         || null,
      });
      setWalletStatus('ok');
      setTimeout(() => setWalletStatus(null), 2500);
    } catch {
      setWalletStatus('err');
    } finally {
      setWalletSaving(false);
    }
  }

  async function addCategory() {
    if (!newCat.name.trim()) {
      setCatError('Category name is required');
      return;
    }
    setCatError('');
    setCatAdding(true);
    try {
      await client.post('/categories', {
        name:        newCat.name.trim(),
        monthly_cap: parseFloat(newCat.monthly_cap) || null,
        color:       newCat.color,
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
    <div className="min-h-screen bg-bg pb-28">
      <div className="max-w-sm mx-auto px-4 pt-8 flex flex-col gap-7">

        <h1 className="font-heading text-2xl font-semibold text-text">Budgets</h1>

        {/* ── Monthly wallet ── */}
        <section>
          <SectionLabel>Monthly Wallet</SectionLabel>
          <Card>
            <div className="flex flex-col gap-4">
              <div>
                <RupeeInput
                  label="Monthly budget"
                  value={wallet.monthly_balance}
                  onChange={(v) => setWallet((w) => ({ ...w, monthly_balance: v }))}
                />
                {walletErrors.monthly_balance && (
                  <p className="text-danger text-xs mt-1">{walletErrors.monthly_balance}</p>
                )}
              </div>
              <div>
                <RupeeInput
                  label="Savings goal"
                  value={wallet.savings_goal}
                  onChange={(v) => setWallet((w) => ({ ...w, savings_goal: v }))}
                />
                {walletErrors.savings_goal && (
                  <p className="text-danger text-xs mt-1">{walletErrors.savings_goal}</p>
                )}
              </div>
              <Input
                label="Saving for (optional)"
                placeholder="e.g. New laptop, Spring trip"
                value={wallet.goal_name}
                onChange={(e) => setWallet((w) => ({ ...w, goal_name: e.target.value }))}
              />
              <Button onClick={saveWallet} loading={walletSaving}>
                {walletStatus === 'ok' ? 'Saved ✓' : 'Save wallet'}
              </Button>
              {walletStatus === 'err' && (
                <p className="text-danger text-xs text-center">Could not save. Try again.</p>
              )}
            </div>
          </Card>
        </section>

        {/* ── Categories ── */}
        <section className="pb-2">
          <SectionLabel>Categories</SectionLabel>

          {/* Add form */}
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
                      text-text text-sm outline-none focus:border-primary transition-colors
                      placeholder:text-muted/40"
                  />
                </div>
                <div className="w-[90px] relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm pointer-events-none">₹</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Cap"
                    value={newCat.monthly_cap}
                    onChange={(e) => setNewCat((c) => ({ ...c, monthly_cap: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded-xl pl-7 pr-2 py-3
                      text-text text-sm outline-none focus:border-primary transition-colors
                      placeholder:text-muted/40"
                  />
                </div>
              </div>

              {/* Color swatches */}
              <div>
                <p className="text-muted text-xs mb-2.5">Color</p>
                <div className="flex gap-2.5">
                  {PALETTE.map(({ name, hex }) => (
                    <button
                      key={hex}
                      onClick={() => setNewCat((c) => ({ ...c, color: hex }))}
                      className="w-7 h-7 rounded-full transition-transform duration-150 hover:scale-110"
                      style={{
                        backgroundColor: hex,
                        // ring trick: inner ring = card bg, outer ring = swatch color
                        boxShadow: newCat.color === hex
                          ? `0 0 0 2px #16233D, 0 0 0 4px ${hex}`
                          : 'none',
                        transform: newCat.color === hex ? 'scale(1.15)' : undefined,
                      }}
                      aria-label={name}
                      aria-pressed={newCat.color === hex}
                    />
                  ))}
                </div>
              </div>

              {catError && (
                <p className="text-danger text-xs">{catError}</p>
              )}
              <Button onClick={addCategory} loading={catAdding}>
                Add category
              </Button>
            </div>
          </Card>

          {/* Category list */}
          {categories.length === 0 ? (
            <p className="text-muted text-sm text-center py-10">
              No categories yet. Add one above to track spending by type.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {categories.map((cat) => {
                const spent   = catSpent[cat.id] || 0;
                const hasCap  = cat.monthly_cap != null;
                const pct     = hasCap ? Math.min((spent / cat.monthly_cap) * 100, 100) : 0;
                const isOver  = hasCap && spent > cat.monthly_cap;
                const isNear  = hasCap && !isOver && pct >= 80;
                const barColor = isOver ? '#EF4444' : isNear ? '#F59E0B' : (cat.color ?? '#3B6CFF');
                const delPending = pendingDelete === cat.id;

                return (
                  <div
                    key={cat.id}
                    className={`border rounded-2xl p-4 transition-colors ${
                      delPending ? 'bg-danger/5 border-danger/30' : 'bg-surface border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color ?? '#94A3B8' }}
                        />
                        <span className="text-text text-sm font-medium truncate">{cat.name}</span>
                        {isOver && (
                          <span className="text-danger text-[10px] font-bold uppercase tracking-wide shrink-0">
                            over
                          </span>
                        )}
                      </div>

                      {delPending ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => deleteCategory(cat.id)}
                            className="text-danger text-xs font-semibold px-2.5 py-1 rounded-lg bg-danger/10 hover:bg-danger/20 transition-colors"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setPendingDelete(null)}
                            className="text-muted text-xs hover:text-text transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setPendingDelete(cat.id)}
                          className="text-muted/40 hover:text-danger p-1 rounded-lg hover:bg-danger/10 transition-colors shrink-0"
                          aria-label="Delete category"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>

                    {hasCap ? (
                      <>
                        <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: barColor }}
                          />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted text-xs">₹{inr(spent)} spent</span>
                          <span className={`text-xs ${isOver ? 'text-danger font-medium' : 'text-muted'}`}>
                            of ₹{inr(cat.monthly_cap)}
                          </span>
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

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-3">
      {children}
    </p>
  );
}
