import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import Toast from '../components/Toast';
import { fmtAmount } from '../utils/format';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name = '') {
  return name.trim().split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase();
}

const AVATAR_GRADIENTS = [
  ['#3B6CFF', '#8B5CF6'],
  ['#10B981', '#06B6D4'],
  ['#EC4899', '#F97316'],
  ['#F59E0B', '#EF4444'],
];
function avatarGradient(name = '') {
  const [a, b] = AVATAR_GRADIENTS[(name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length];
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}

// ── Animation presets ────────────────────────────────────────────────────────

const SPRING = { duration: 0.45, ease: [0.22, 1, 0.36, 1] };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: SPRING } };

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, accent, onClick }) {
  const content = (
    <div
      className="flex-1 rounded-2xl p-4 flex flex-col gap-1.5"
      style={{ background: 'rgba(13,18,37,0.90)', border: `1px solid ${accent}28` }}
      onClick={onClick}
    >
      <span className="text-xl leading-none">{icon}</span>
      <div>
        <p className="font-bold text-text text-lg leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-muted/60 leading-none mt-0.5">{sub}</p>}
      </div>
      <p className="text-[10px] uppercase tracking-[0.12em] font-semibold" style={{ color: accent }}>{label}</p>
    </div>
  );
  return onClick ? (
    <motion.div whileTap={{ scale: 0.97 }} className="flex-1 cursor-pointer">{content}</motion.div>
  ) : (
    <div className="flex-1">{content}</div>
  );
}

// ── Menu row ─────────────────────────────────────────────────────────────────

function MenuRow({ icon, grad, label, sub, danger = false, chevron = true, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left"
    >
      <span
        className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl text-[17px]"
        style={{ background: danger ? 'rgba(239,68,68,0.12)' : grad ?? 'rgba(59,108,255,0.12)' }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-tight ${danger ? 'text-red-400' : 'text-text'}`}>{label}</p>
        {sub && <p className="text-muted/55 text-xs mt-0.5 leading-tight">{sub}</p>}
      </div>
      {chevron && !danger && (
        <svg className="w-4 h-4 shrink-0 text-muted/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </motion.button>
  );
}

function Section({ title, children }) {
  return (
    <motion.div variants={fadeUp} className="flex flex-col gap-1.5">
      {title && (
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted/40 px-1">{title}</p>
      )}
      <div
        className="rounded-3xl overflow-hidden divide-y"
        style={{ background: 'rgba(13,18,37,0.90)', border: '1px solid rgba(30,45,78,0.55)', divideColor: 'rgba(30,45,78,0.4)' }}
      >
        {children}
      </div>
    </motion.div>
  );
}

// ── Delete dialog ─────────────────────────────────────────────────────────────

function DeleteDialog({ onCancel, onConfirm, deleting }) {
  const [typed, setTyped] = useState('');
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', paddingBottom: 'max(1.5rem,env(safe-area-inset-bottom))' }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={SPRING}
        className="w-full max-w-sm mx-4 rounded-3xl p-6"
        style={{ background: 'rgba(10,14,30,0.99)', border: '1px solid rgba(239,68,68,0.3)' }}
      >
        <div className="text-3xl mb-3">⚠️</div>
        <h3 className="font-heading font-bold text-text text-lg mb-1">Delete your account?</h3>
        <p className="text-muted text-sm leading-relaxed mb-5">
          All your wallet, expenses, budgets, goals, and splits will be permanently erased. This cannot be undone.
        </p>
        <p className="text-xs text-muted/60 mb-2">
          Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm
        </p>
        <input
          type="text" value={typed} onChange={(e) => setTyped(e.target.value)}
          placeholder="DELETE"
          className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-text text-sm outline-none focus:border-red-500 transition-colors font-mono mb-4"
        />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-2xl border border-border text-muted text-sm font-medium">Cancel</button>
          <button
            onClick={onConfirm} disabled={typed !== 'DELETE' || deleting}
            className="flex-1 py-3 rounded-2xl text-white text-sm font-semibold disabled:opacity-35"
            style={{ background: 'linear-gradient(135deg,#EF4444 0%,#DC2626 100%)' }}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [score,  setScore]  = useState(null);
  const [jar,    setJar]    = useState(null);
  const [streak, setStreak] = useState(null);
  const [copied, setCopied] = useState(false);
  const [toast,  setToast]  = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting,   setDeleting]   = useState(false);

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

  const handleDelete = async () => {
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

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : '—';

  const scoreLabel = score == null ? '—' : score >= 700 ? 'Excellent' : score >= 550 ? 'Good' : score >= 350 ? 'Fair' : 'Poor';
  const scoreFill  = score == null ? 0 : Math.min(100, (score / 850) * 100);
  const scoreColor = score == null ? '#7A8BAD' : score >= 700 ? '#8B5CF6' : score >= 550 ? '#3B6CFF' : score >= 350 ? '#F59E0B' : '#EF4444';

  return (
    <div className="min-h-screen bg-bg pb-32 page-enter" style={{ paddingTop: 'env(safe-area-inset-top,0px)' }}>
      {toast && <Toast message={toast.message} icon={toast.icon} onDismiss={() => setToast(null)} />}
      <AnimatePresence>{showDelete && <DeleteDialog onCancel={() => setShowDelete(false)} onConfirm={handleDelete} deleting={deleting} />}</AnimatePresence>

      {/* ── Header ── */}
      <div className="sticky top-0 z-40 border-b border-border/30"
        style={{ background: 'rgba(7,9,26,0.90)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', paddingTop: 'env(safe-area-inset-top,0px)' }}
      >
        <div className="max-w-sm mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-display font-bold text-base tracking-tight"
            style={{ background: 'linear-gradient(135deg,#3B6CFF 0%,#8B5CF6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          >PocketPal</span>
          <span className="text-muted/60 text-sm font-medium tracking-wide">Profile</span>
        </div>
      </div>

      <motion.div className="max-w-sm mx-auto px-4 pt-5 flex flex-col gap-4" variants={container} initial="hidden" animate="show">

        {/* ── Hero card ── */}
        <motion.div variants={fadeUp}
          className="rounded-3xl p-5"
          style={{ background: 'linear-gradient(135deg,rgba(59,108,255,0.10) 0%,rgba(139,92,246,0.07) 100%)', border: '1px solid rgba(59,108,255,0.22)' }}
        >
          {/* Top line: accent */}
          <div className="absolute left-8 right-8 top-0 h-px rounded-full" style={{ background: 'linear-gradient(90deg,transparent,rgba(59,108,255,0.5),transparent)' }} />

          <div className="flex items-center gap-4">
            {/* Avatar with glow */}
            <div className="relative shrink-0">
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center text-white text-xl font-bold select-none"
                style={{ background: avatarGradient(user?.name) }}
              >
                {getInitials(user?.name)}
              </div>
              <div className="absolute inset-0 rounded-full -z-10"
                style={{ background: avatarGradient(user?.name), opacity: 0.35, filter: 'blur(10px)', transform: 'scale(1.3)' }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-heading font-bold text-text text-lg leading-tight truncate">{user?.name}</p>
              <p className="text-muted text-sm truncate">{user?.email}</p>
              <p className="text-muted/50 text-xs mt-1">Member since {memberSince}</p>
            </div>
          </div>

          {/* Invite code row */}
          {user?.invite_code && (
            <button
              onClick={handleCopy}
              className="mt-4 w-full flex items-center justify-between rounded-2xl px-4 py-3 active:opacity-60 transition-opacity"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
            >
              <div>
                <p className="text-[10px] text-muted/50 uppercase tracking-wider mb-0.5">Invite code</p>
                <p className="font-mono text-sm font-bold text-primary tracking-widest">{user.invite_code}</p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-all duration-200 ${copied ? 'text-emerald-400 bg-emerald-400/10' : 'text-muted/70 bg-white/5'}`}>
                {copied ? '✓ Copied' : 'Copy'}
              </span>
            </button>
          )}
        </motion.div>

        {/* ── Stats row ── */}
        <motion.div variants={fadeUp} className="flex gap-2.5">
          <StatCard icon="💰" label="Saved" value={jar != null ? fmtAmount(jar) : '—'} accent="#10B981" />
          <StatCard icon="🔥" label="Streak" value={streak != null ? `${streak}d` : '—'} accent="#EC4899" />
        </motion.div>

        {/* ── PocketScore banner ── */}
        <motion.div variants={fadeUp}>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/score')}
            className="w-full rounded-3xl p-4 flex items-center gap-4 text-left"
            style={{ background: 'rgba(13,18,37,0.90)', border: '1px solid rgba(30,45,78,0.55)' }}
          >
            <div className="h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center"
              style={{ background: `${scoreColor}18` }}>
              <span className="text-xl">⭐</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted/60">PocketScore</p>
                <span className="text-xs font-bold" style={{ color: scoreColor }}>{scoreLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <motion.div className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg,${scoreColor},${scoreColor}99)` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${scoreFill}%` }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                  />
                </div>
                <span className="text-sm font-bold text-text shrink-0">{score ?? '—'}<span className="text-muted/50 text-xs font-normal">/850</span></span>
              </div>
            </div>
            <svg className="w-4 h-4 shrink-0 text-muted/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>
        </motion.div>

        {/* ── Account ── */}
        <Section title="Account">
          <MenuRow icon="✏️" grad="rgba(59,108,255,0.12)"  label="Edit Profile"     sub="Name, email, budget settings" onClick={() => navigate('/profile/edit')} />
          <MenuRow icon="🎯" grad="rgba(16,185,129,0.12)"  label="My Goals"         sub="Track personal savings goals"  onClick={() => navigate('/goals')} />
          <MenuRow icon="🫙" grad="rgba(16,185,129,0.12)"  label="Savings Jar"      sub="Round-up savings & jar goal"   onClick={() => navigate('/jar')} />
          <MenuRow icon="🔒" grad="rgba(139,92,246,0.12)"  label="Change Password"                                     onClick={() => navigate('/profile/change-password')} />
        </Section>

        {/* ── Preferences ── */}
        <Section title="Preferences">
          <MenuRow icon="🔔" grad="rgba(245,158,11,0.12)"  label="Notifications"  sub="Streak, budget & weekly alerts"  onClick={() => navigate('/notifications')} />
          <MenuRow icon="⚙️" grad="rgba(107,114,128,0.12)" label="Settings"       sub="Currency, date format"           onClick={() => navigate('/settings')} />
        </Section>

        {/* ── Support ── */}
        <Section title="Support">
          <MenuRow icon="❓" grad="rgba(59,108,255,0.10)"  label="Help & Support"  sub="FAQs and how-tos"  onClick={() => navigate('/help')} />
          <MenuRow icon="ℹ️" grad="rgba(59,108,255,0.10)"  label="About PocketPal" sub="v1.0"              onClick={() => navigate('/about')} />
        </Section>

        {/* ── Danger ── */}
        <Section>
          <MenuRow icon="🚪" label="Sign out"        danger onClick={logout} />
          <MenuRow icon="🗑️" label="Delete Account"  sub="Permanently erase all data"  danger onClick={() => setShowDelete(true)} />
        </Section>
      </motion.div>
    </div>
  );
}
