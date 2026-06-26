import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import client from '../api/client';
import Button from '../components/Button';
import TopBar from '../components/TopBar';

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

function inr(n) {
  return Math.round(Math.abs(n)).toLocaleString('en-IN');
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

export default function Budgets() {
  const [categories, setCategories] = useState([]);
  const [catSpent,   setCatSpent]   = useState({});
  const [newCat, setNewCat]         = useState({ name: '', monthly_cap: '', color: PALETTE[0].hex });
  const [catAdding, setCatAdding]   = useState(false);
  const [catError,  setCatError]    = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    loadCategories();
    client.get('/categories/spending', { params: { month: currentMonth() } })
      .then((res) => setCatSpent(res.data))
      .catch(() => {});
  }, []);

  function loadCategories() {
    client.get('/categories').then((res) => setCategories(res.data)).catch(() => {});
  }

  async function addCategory() {
    if (!newCat.name.trim()) { setCatError('Category name is required'); return; }
    setCatError('');
    setCatAdding(true);
    try {
      await client.post('/categories', {
        name: newCat.name.trim(),
        monthly_cap: parseFloat(newCat.monthly_cap) || null,
        color: newCat.color,
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

      <div className="max-w-sm mx-auto px-4 pt-5 flex flex-col gap-5">
        <h1 className="font-heading text-2xl font-semibold text-text">Budgets</h1>

        {/* ── Add category ── */}
        <div
          className="rounded-3xl p-5"
          style={{
            background: 'rgba(13,18,37,0.85)',
            border: '1px solid rgba(30,45,78,0.6)',
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-4">
            Add category
          </p>

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
              <div className="w-[92px] relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm pointer-events-none select-none">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  placeholder="Cap"
                  value={newCat.monthly_cap}
                  onChange={(e) => setNewCat((c) => ({ ...c, monthly_cap: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded-xl pl-7 pr-2 py-3
                    text-text text-sm outline-none focus:border-primary transition-all duration-150
                    placeholder:text-muted/40"
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted mb-2.5">
                Colour
              </p>
              <div className="flex gap-2.5">
                {PALETTE.map(({ name, hex }) => (
                  <button
                    key={hex}
                    onClick={() => setNewCat((c) => ({ ...c, color: hex }))}
                    className="w-7 h-7 rounded-full transition-all duration-150 hover:scale-110 active:scale-95"
                    style={{
                      backgroundColor: hex,
                      boxShadow: newCat.color === hex
                        ? `0 0 0 2px #0D1225, 0 0 0 4px ${hex}`
                        : 'none',
                      transform: newCat.color === hex ? 'scale(1.15)' : undefined,
                    }}
                    aria-label={name}
                  />
                ))}
              </div>
            </div>

            {catError && <p className="text-danger text-xs">{catError}</p>}

            <Button onClick={addCategory} loading={catAdding}>
              Add category
            </Button>
          </div>
        </div>

        {/* ── Category list ── */}
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">🗂️</p>
            <p className="text-text text-sm font-medium">No categories yet</p>
            <p className="text-muted text-xs mt-1 leading-relaxed">
              Add a category above to start tracking spending by type.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-2">
            {categories.map((cat, i) => {
              const spent  = catSpent[cat.id] || 0;
              const hasCap = cat.monthly_cap != null;
              const pct    = hasCap ? Math.min((spent / cat.monthly_cap) * 100, 100) : 0;
              const isOver = hasCap && spent > cat.monthly_cap;
              const isNear = hasCap && !isOver && pct >= 80;
              const barColor = isOver ? '#EF4444' : isNear ? '#F59E0B' : (cat.color ?? '#3B6CFF');
              const delPending = pendingDelete === cat.id;

              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: i * 0.04 }}
                  className="rounded-2xl p-4 transition-colors duration-150"
                  style={{
                    background: delPending
                      ? 'rgba(239,68,68,0.06)'
                      : 'rgba(13,18,37,0.8)',
                    border: delPending
                      ? '1px solid rgba(239,68,68,0.25)'
                      : '1px solid rgba(30,45,78,0.55)',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
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
                          className="text-danger text-xs font-semibold px-2.5 py-1 rounded-lg
                            bg-danger/10 hover:bg-danger/20 active:scale-95 transition-all duration-150"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setPendingDelete(null)}
                          className="text-muted text-xs hover:text-text transition-colors px-1"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setPendingDelete(cat.id)}
                        className="text-muted/40 hover:text-danger shrink-0 p-1 rounded-lg
                          hover:bg-danger/10 active:scale-95 transition-all duration-150"
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
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
