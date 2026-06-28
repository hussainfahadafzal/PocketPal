import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import Toast from '../components/Toast';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const AVATAR_GRADIENTS = [
  ['#3B6CFF', '#8B5CF6'],
  ['#10B981', '#06B6D4'],
  ['#EC4899', '#F97316'],
  ['#F59E0B', '#EF4444'],
];

function avatarGradient(name = '') {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length;
  const [a, b] = AVATAR_GRADIENTS[idx];
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}

// ── Animation ─────────────────────────────────────────────────────────────────

const SPRING = { duration: 0.5, ease: [0.22, 1, 0.36, 1] };
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.03 } },
};
const item = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: SPRING } };

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }) {
  return (
    <div
      className="flex-1 rounded-2xl p-3 flex flex-col items-center gap-0.5"
      style={{ background: 'rgba(13,18,37,0.85)', border: '1px solid rgba(30,45,78,0.55)' }}
    >
      <p className="font-bold text-text text-base leading-none">{value}</p>
      {sub && <p className="text-muted text-[10px] leading-none">{sub}</p>}
      <p className="text-muted/55 text-[9px] uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}

function MenuRow({ icon, iconBg, label, sublabel, danger = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left active:opacity-60 transition-opacity duration-100"
    >
      <span
        className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl text-[17px]"
        style={{ background: iconBg ?? 'rgba(59,108,255,0.12)' }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-tight ${danger ? 'text-red-400' : 'text-text'}`}>
          {label}
        </p>
        {sublabel && <p className="text-muted text-xs mt-0.5 leading-tight">{sublabel}</p>}
      </div>
      {!danger && (
        <svg className="w-4 h-4 shrink-0 text-muted/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
}

function Section({ title, children }) {
  return (
    <motion.div variants={item} className="flex flex-col gap-1.5">
      {title && (
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted/45 px-1">
          {title}
        </p>
      )}
      <div
        className="rounded-3xl overflow-hidden divide-y"
        style={{
          background: 'rgba(13,18,37,0.85)',
          border: '1px solid rgba(30,45,78,0.55)',
          divideColor: 'rgba(30,45,78,0.4)',
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}

// ── Delete-account confirmation dialog ────────────────────────────────────────

function DeleteDialog({ onCancel, onConfirm, deleting }) {
  const [typed, setTyped] = useState('');
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 48, opacity: 0 }}
        transition={SPRING}
        className="w-full max-w-sm rounded-3xl p-6"
        style={{ background: 'rgba(13,18,37,0.98)', border: '1px solid rgba(239,68,68,0.28)' }}
      >
        <h3 className="font-heading font-bold text-text text-lg mb-1">Delete your account?</h3>
        <p className="text-muted text-sm leading-relaxed mb-5">
          This permanently removes your wallet, all expenses, budgets, and splits. It cannot be undone.
        </p>
        <p className="text-xs text-muted/60 mb-2">
          Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm
        </p>
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="DELETE"
          className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-text text-base outline-none focus:border-red-500 transition-colors duration-150 mb-4 font-mono"
        />
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl border border-border text-muted text-sm font-medium active:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm()}
            disabled={typed !== 'DELETE' || deleting}
            className="flex-1 py-3 rounded-2xl text-white text-sm font-semibold transition-opacity disabled:opacity-35"
            style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}
          >
            {deleting ? 'Deleting…' : 'Delete Account'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [score, setScore]   = useState(null);
  const [jar, setJar]       = useState(null);
  const [streak, setStreak] = useState(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast]   = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting]     = useState(false);

  useEffect(() => {
    client.get('/pocketscore').then((r) => setScore(r.data.score)).catch(() => {});
    client.get('/wallet/jar').then((r) => setJar(r.data.savings_jar)).catch(() => {});
    client.get('/dashboard').then((r) => setStreak(r.data.streak_days)).catch(() => {});
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(user?.invite_code ?? '').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await client.delete('/profile');
      logout();
    } catch {
      setToast({ message: 'Could not delete account. Try again.', icon: '⚠️' });
      setDeleting(false);
      setShowDelete(false);
    }
  };

  const fmt = (v) =>
    v == null ? '—' : v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`;

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '—';

  return (
    <div
      className="min-h-screen bg-bg pb-32 page-enter"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {toast && <Toast message={toast.message} icon={toast.icon} onDismiss={() => setToast(null)} />}
      {showDelete && (
        <DeleteDialog
          onCancel={() => setShowDelete(false)}
          onConfirm={handleDeleteAccount}
          deleting={deleting}
        />
      )}

      {/* Header */}
      <div
        className="sticky top-0 z-40 border-b border-border/30"
        style={{
          background: 'rgba(7,9,26,0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <div className="max-w-sm mx-auto px-4 h-14 flex items-center justify-between">
          <span
            className="font-display font-bold text-base tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #3B6CFF 0%, #8B5CF6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            PocketPal
          </span>
          <span className="text-muted text-sm font-medium">Profile</span>
        </div>
      </div>

      <motion.div
        className="max-w-sm mx-auto px-4 pt-6 flex flex-col gap-5"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* ── Avatar + identity ── */}
        <motion.div variants={item} className="flex flex-col items-center gap-3 pt-2">
          <div
            className="h-20 w-20 rounded-full flex items-center justify-center text-white text-2xl font-bold select-none shadow-lg"
            style={{ background: avatarGradient(user?.name) }}
          >
            {getInitials(user?.name)}
          </div>
          <div className="text-center">
            <p className="font-heading font-bold text-text text-xl leading-tight">{user?.name}</p>
            <p className="text-muted text-sm mt-0.5">{user?.email}</p>
          </div>
          {user?.invite_code && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-xl px-4 py-2 active:opacity-60 transition-opacity"
              style={{
                background: 'rgba(59,108,255,0.10)',
                border: '1px solid rgba(59,108,255,0.25)',
              }}
            >
              <span className="text-xs font-mono font-semibold text-primary tracking-widest">
                {user.invite_code}
              </span>
              <span className="text-[11px] text-muted/70">{copied ? '✓ Copied' : 'Copy'}</span>
            </button>
          )}
        </motion.div>

        {/* ── Stats row ── */}
        <motion.div variants={item} className="flex gap-2.5">
          <StatCard label="Saved" value={fmt(jar)} />
          <StatCard label="Streak" value={streak != null ? `${streak}d` : '—'} />
          <StatCard label="Score" value={score ?? '—'} sub="/ 850" />
          <StatCard label="Member" value={memberSince} />
        </motion.div>

        {/* ── Account ── */}
        <Section title="Account">
          <MenuRow
            icon="✏️"
            iconBg="rgba(59,108,255,0.12)"
            label="Edit Profile"
            sublabel="Name, email, budget settings"
            onClick={() => navigate('/profile/edit')}
          />
          <MenuRow
            icon="🔒"
            iconBg="rgba(139,92,246,0.12)"
            label="Change Password"
            onClick={() => navigate('/profile/change-password')}
          />
        </Section>

        {/* ── Preferences ── */}
        <Section title="Preferences">
          <MenuRow
            icon="🎯"
            iconBg="rgba(16,185,129,0.12)"
            label="My Goals"
            sublabel="Coming soon"
            onClick={() => {}}
          />
          <MenuRow
            icon="🔔"
            iconBg="rgba(245,158,11,0.12)"
            label="Notifications"
            sublabel="Coming soon"
            onClick={() => {}}
          />
          <MenuRow
            icon="⚙️"
            iconBg="rgba(107,114,128,0.12)"
            label="Settings"
            sublabel="Coming soon"
            onClick={() => {}}
          />
        </Section>

        {/* ── Support ── */}
        <Section title="Support">
          <MenuRow
            icon="❓"
            iconBg="rgba(59,108,255,0.10)"
            label="Help & Support"
            sublabel="Coming soon"
            onClick={() => {}}
          />
          <MenuRow
            icon="ℹ️"
            iconBg="rgba(59,108,255,0.10)"
            label="About PocketPal"
            sublabel="v1.0 · Spend Smart, Save Sharp."
            onClick={() => {}}
          />
        </Section>

        {/* ── Danger zone ── */}
        <Section>
          <MenuRow
            icon="🚪"
            iconBg="rgba(239,68,68,0.10)"
            label="Sign out"
            danger
            onClick={logout}
          />
          <MenuRow
            icon="🗑️"
            iconBg="rgba(239,68,68,0.10)"
            label="Delete Account"
            sublabel="Permanently remove all your data"
            danger
            onClick={() => setShowDelete(true)}
          />
        </Section>
      </motion.div>
    </div>
  );
}
