import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import Card from '../components/Card';
import Spinner from '../components/Spinner';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

// Formats a number as a compact currency string (no cents on whole numbers)
function fmt(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function StatCard({ label, value, valueClass = 'text-text' }) {
  return (
    <Card className="!p-4">
      <p className="text-muted text-xs mb-1">{label}</p>
      <p className={`font-heading text-xl font-bold ${valueClass}`}>{value}</p>
    </Card>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    client
      .get('/dashboard')
      .then((res) => setStats(res.data))
      .catch(() => setError('Could not load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <p className="text-danger text-sm text-center">{error}</p>
      </div>
    );
  }

  const savedSign = stats.saved_vs_yesterday >= 0 ? '+' : '';

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-sm mx-auto px-4 pt-6 pb-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <p className="text-muted text-xs uppercase tracking-widest">
              Good {greeting()}
            </p>
            <h1 className="font-heading text-2xl font-semibold text-text mt-0.5">
              {user?.name}
            </h1>
          </div>
          <button
            onClick={logout}
            className="text-muted text-xs hover:text-text transition-colors px-3 py-1.5 rounded-lg border border-border"
          >
            Sign out
          </button>
        </div>

        {/* Hero — daily spend limit */}
        <Card className="mb-4 text-center">
          <p className="text-muted text-sm mb-2">Today's spend limit</p>
          <p className="font-heading text-6xl font-bold text-primary tracking-tight">
            {fmt(stats.daily_spend_limit)}
          </p>
          <p className="text-muted text-xs mt-3">
            {stats.days_left_in_month} day{stats.days_left_in_month !== 1 ? 's' : ''} left in the month
          </p>
        </Card>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatCard
            label="Spent today"
            value={fmt(stats.spent_today)}
          />
          <StatCard
            label="This month"
            value={fmt(stats.spent_this_month)}
          />
          <StatCard
            label="Balance left"
            value={fmt(stats.balance_left)}
            valueClass={stats.balance_left >= 0 ? 'text-save' : 'text-danger'}
          />
          <StatCard
            label="vs Yesterday"
            value={`${savedSign}${fmt(stats.saved_vs_yesterday)}`}
            valueClass={stats.saved_vs_yesterday >= 0 ? 'text-save' : 'text-danger'}
          />
        </div>

        {/* Streak */}
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-muted text-xs mb-0.5">Under-budget streak</p>
            <p className="font-heading text-3xl font-bold text-streak">
              {stats.streak_days}{' '}
              <span className="text-lg font-medium">day{stats.streak_days !== 1 ? 's' : ''}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {[...Array(Math.min(stats.streak_days, 5))].map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-streak opacity-80" />
            ))}
          </div>
        </Card>

      </div>
    </div>
  );
}
