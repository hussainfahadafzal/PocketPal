import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import client from '../api/client';
import Card from '../components/Card';
import Spinner from '../components/Spinner';
import BottomNav from '../components/BottomNav';
import TopBar from '../components/TopBar';

const inr = (n) => Math.round(Math.abs(n)).toLocaleString('en-IN');

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm shadow-xl">
      <p className="text-muted text-xs mb-0.5">Day {label}</p>
      <p className="font-heading font-bold text-text">₹{inr(payload[0].value)}</p>
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-2 border border-border rounded-xl px-3 py-2 shadow-xl">
      <p className="text-text text-sm font-semibold">{payload[0].name}</p>
      <p className="text-muted text-xs">₹{inr(payload[0].value)}</p>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-[140px] flex flex-col items-center justify-center gap-2">
      <svg className="w-8 h-8 text-muted/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
      <p className="text-muted text-sm">No expenses for this period</p>
    </div>
  );
}

export default function Analysis() {
  const [month, setMonth] = useState(currentMonth);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [nudges, setNudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      client.get('/expenses', { params: { month } }),
      client.get('/categories'),
    ])
      .then(([expRes, catRes]) => {
        setExpenses(expRes.data);
        setCategories(catRes.data);
      })
      .catch(() => setError('Could not load analysis. Try refreshing.'))
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => {
    client.get('/pal/nudges').then((res) => setNudges(res.data)).catch(() => {});
  }, []);

  const catById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  const donutData = useMemo(() => {
    const totals = {};
    expenses.forEach((e) => {
      const key = e.category_id ?? 'none';
      totals[key] = (totals[key] || 0) + e.amount;
    });
    return Object.entries(totals)
      .map(([key, amount]) => {
        const cat = catById[parseInt(key)];
        return {
          name:  cat?.name  ?? 'Uncategorized',
          value: Math.round(amount),
          color: cat?.color ?? '#94A3B8',
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [expenses, catById]);

  const barData = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const today = new Date();
    const isCurrentMonth = y === today.getFullYear() && m === today.getMonth() + 1;
    const daysToShow = isCurrentMonth ? today.getDate() : new Date(y, m, 0).getDate();

    const daily = {};
    expenses.forEach((e) => {
      // Extract day directly from ISO string — no timezone shifting
      const day = parseInt(e.created_at.split('T')[0].split('-')[2], 10);
      daily[day] = (daily[day] || 0) + e.amount;
    });

    return Array.from({ length: daysToShow }, (_, i) => ({
      day:    i + 1,
      amount: Math.round(daily[i + 1] || 0),
    }));
  }, [expenses, month]);

  const totalSpent = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const hasData = expenses.length > 0;

  return (
    <div className="min-h-screen bg-bg pb-28 page-enter">
      <TopBar showLogout />

      <div className="max-w-sm mx-auto px-4 pt-5 flex flex-col gap-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-semibold text-text">Analysis</h1>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-surface border border-border rounded-xl px-3 py-1.5 text-text text-xs
              outline-none focus:border-primary transition-all duration-150 [color-scheme:dark]"
          />
        </div>

        {loading ? (
          <div className="flex justify-center pt-16">
            <Spinner size="lg" />
          </div>

        ) : error ? (
          <div className="text-center pt-16">
            <p className="text-danger text-sm mb-3">{error}</p>
            <button
              onClick={() => setMonth((m) => { /* force re-fetch */ return m; })}
              className="text-primary text-sm font-medium underline underline-offset-2 active:opacity-70"
            >
              Tap to retry
            </button>
          </div>

        ) : (
          <>
            {/* ── Donut: spending by category ── */}
            <Card>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-4">
                Spending by Category
              </p>

              {!hasData ? (
                <EmptyChart />
              ) : (
                <>
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={210}>
                      <PieChart>
                        <Pie
                          data={donutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {donutData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <ReTooltip content={<PieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="font-heading text-xl font-bold text-text leading-none">
                        ₹{inr(totalSpent)}
                      </p>
                      <p className="text-muted text-xs mt-1">total</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5 mt-2">
                    {donutData.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-muted text-sm">{item.name}</span>
                        </div>
                        <span className="font-heading text-sm font-semibold text-text">
                          ₹{inr(item.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>

            {/* ── Bar: daily spend trend ── */}
            <Card>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-4">
                Daily Spend
              </p>

              {!hasData ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart
                    data={barData}
                    margin={{ top: 4, right: 0, bottom: 0, left: -18 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      stroke="#26395C"
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: '#94A3B8', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      interval={4}
                    />
                    <YAxis
                      tick={{ fill: '#94A3B8', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `₹${v}`}
                    />
                    <ReTooltip
                      content={<BarTooltip />}
                      cursor={{ fill: 'rgba(59,108,255,0.07)' }}
                    />
                    <Bar
                      dataKey="amount"
                      fill="#3B6CFF"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={14}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* ── Financial Personality ── */}
            <Card>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-4">
                Financial Personality
              </p>

              {nudges.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <p className="text-text text-sm font-medium">Nothing yet</p>
                  <p className="text-muted text-xs text-center leading-relaxed">
                    Add more expenses this month and Pal will reveal your spending personality.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {nudges.map((nudge, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span
                        className="text-xl shrink-0 mt-0.5 leading-none"
                        role="img"
                        aria-label={nudge.type}
                      >
                        {nudge.icon}
                      </span>
                      <p className="text-text/85 text-sm leading-relaxed">{nudge.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
