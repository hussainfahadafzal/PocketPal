import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import Spinner from '../components/Spinner';
import TopBar from '../components/TopBar';

const inr = (n) => Math.round(Math.abs(n)).toLocaleString('en-IN');

function todayMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function dayLabel(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === yesterday.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
}

function timeLabel(isoString) {
  return new Date(isoString).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function ChevronDown() {
  return (
    <svg className="w-4 h-4 text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center gap-3 pt-16 pb-8">
      <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center">
        <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-text text-sm font-medium">No expenses yet</p>
        <p className="text-muted text-xs mt-1">Nothing recorded for this period</p>
      </div>
      <button
        onClick={onAdd}
        className="text-primary text-sm font-medium hover:underline underline-offset-2 transition-colors active:opacity-70"
      >
        Add your first expense →
      </button>
    </div>
  );
}

export default function History() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [month, setMonth] = useState(todayMonth);
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    client.get('/categories').then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = { month };
    if (categoryId) params.category_id = parseInt(categoryId);
    client
      .get('/expenses', { params })
      .then((res) => setExpenses(res.data))
      .catch(() => setError('Could not load expenses.'))
      .finally(() => setLoading(false));
  }, [month, categoryId, retryCount]);

  const handleDelete = async (id) => {
    try {
      await client.delete(`/expenses/${id}`);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch {
    } finally {
      setPendingDelete(null);
    }
  };

  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));

  const grouped = expenses.reduce((acc, exp) => {
    const day = exp.created_at.split('T')[0];
    (acc[day] = acc[day] || []).push(exp);
    return acc;
  }, {});
  const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="min-h-screen bg-bg pb-28 page-enter">
      <TopBar showLogout />

      <div className="max-w-sm mx-auto px-4 pt-5">

        <h1 className="font-heading text-2xl font-semibold text-text mb-5">History</h1>

        {/* ── Filters ── */}
        <div className="flex gap-2 mb-4">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="flex-1 bg-surface border border-border rounded-xl px-3 py-3
              text-text text-base outline-none focus:border-primary transition-all duration-150
              [color-scheme:dark]"
          />
          <div className="relative flex-1">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-3 pr-8 py-3
                text-text text-base outline-none focus:border-primary transition-all duration-150
                appearance-none"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <ChevronDown />
            </div>
          </div>
        </div>

        {/* ── Total banner ── */}
        {!loading && !error && expenses.length > 0 && (
          <div className="flex items-center justify-between bg-surface border border-border rounded-2xl px-4 py-3 mb-5">
            <span className="text-muted text-sm">Total for period</span>
            <span className="font-heading text-lg font-bold text-text">₹{inr(total)}</span>
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <div className="flex justify-center pt-16">
            <Spinner size="md" />
          </div>

        ) : error ? (
          <div className="text-center pt-16">
            <p className="text-danger text-sm mb-3">{error}</p>
            <button
              onClick={() => setRetryCount((c) => c + 1)}
              className="text-primary text-sm font-medium underline underline-offset-2 active:opacity-70"
            >
              Tap to retry
            </button>
          </div>

        ) : expenses.length === 0 ? (
          <EmptyState onAdd={() => navigate('/add')} />

        ) : (
          <div className="flex flex-col gap-6">
            {sortedDays.map((day) => (
              <section key={day}>
                <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2 px-1">
                  {dayLabel(day)}
                </p>

                <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                  {grouped[day].map((exp, idx) => {
                    const cat = catById[exp.category_id];
                    const isLast = idx === grouped[day].length - 1;
                    const isPending = pendingDelete === exp.id;

                    return (
                      <div
                        key={exp.id}
                        className={`flex items-center gap-3 px-4 py-3.5 transition-colors duration-150
                          ${isPending ? 'bg-danger/5' : ''}
                          ${!isLast ? 'border-b border-border/40' : ''}`}
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0 mt-px"
                          style={{ backgroundColor: cat?.color ?? '#94A3B8' }}
                        />

                        <div className="flex-1 min-w-0">
                          <p className="text-text text-sm truncate">
                            {exp.note || cat?.name || 'Expense'}
                          </p>
                          <p className="text-muted text-xs mt-0.5">
                            {timeLabel(exp.created_at)}
                            {cat && <> · <span>{cat.name}</span></>}
                          </p>
                        </div>

                        <p className="font-heading font-semibold text-sm text-text shrink-0">
                          ₹{inr(exp.amount)}
                        </p>

                        {isPending ? (
                          <div className="flex items-center gap-1.5 shrink-0 ml-1">
                            <button
                              onClick={() => handleDelete(exp.id)}
                              className="text-danger text-xs font-semibold px-3 py-2 rounded-xl
                                bg-danger/10 hover:bg-danger/20 active:scale-95 transition-all duration-150 min-h-[36px]"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setPendingDelete(null)}
                              className="text-muted text-xs px-2 py-2 rounded-xl hover:text-text hover:bg-surface-2 transition-all duration-150 min-h-[36px]"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setPendingDelete(exp.id)}
                            className="text-muted/40 hover:text-danger shrink-0 ml-1 p-2.5 rounded-xl
                              hover:bg-danger/10 active:scale-95 transition-all duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center"
                            aria-label="Delete expense"
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
