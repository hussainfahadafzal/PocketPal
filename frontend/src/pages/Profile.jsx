import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import Toast from '../components/Toast';
import { fmtAmount } from '../utils/format';

export const AVATAR_KEY = 'pocketpal_avatar';

function getInitials(name = '') {
  return name.trim().split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase();
}

const AVATAR_GRADIENTS = [
  ['#3B6CFF', '#8B5CF6'],
  ['#10B981', '#06B6D4'],
  ['#EC4899', '#F97316'],
  ['#F59E0B', '#EF4444'],
];
function avatarColors(name = '') {
  return AVATAR_GRADIENTS[(name?.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length];
}

const SPRING = { duration: 0.45, ease: [0.22, 1, 0.36, 1] };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.055, delayChildren: 0.02 } } };
const fadeUp = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: SPRING } };

function MenuItem({ icon, grad, label, sub, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.975 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <span
        className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl text-base"
        style={{ background: grad ?? 'rgba(59,108,255,0.12)' }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text leading-tight">{label}</p>
        {sub && <p className="text-muted/45 text-xs mt-0.5 leading-tight">{sub}</p>}
      </div>
      <svg className="w-4 h-4 shrink-0 text-muted/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </motion.button>
  );
}

function MenuGroup({ label, children }) {
  return (
    <motion.div variants={fadeUp} className="flex flex-col gap-1">
      {label && (
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted/30 px-1 mb-0.5">{label}</p>
      )}
      <div className="rounded-3xl px-1 py-1.5 flex flex-col"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        {children}
      </div>
    </motion.div>
  );
}

function DeleteDialog({ onCancel, onConfirm, deleting }) {
  const [typed, setTyped] = useState('');
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(12px)', paddingBottom: 'max(1.5rem,env(safe-area-inset-bottom))' }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={SPRING}
        className="w-full max-w-sm mx-4 rounded-3xl p-6"
        style={{ background: 'rgba(10,14,30,0.99)', border: '1px solid rgba(239,68,68,0.25)' }}
      >
        <div className="text-3xl mb-3">⚠️</div>
        <h3 className="font-heading font-bold text-text text-lg mb-1">Delete your account?</h3>
        <p className="text-muted text-sm leading-relaxed mb-5">
          All your wallet, expenses, budgets, goals, and splits will be permanently erased. This cannot be undone.
        </p>
        <p className="text-xs text-muted/55 mb-2">
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
            className="flex-1 py-3 rounded-2xl text-white text-sm font-semibold disabled:opacity-30"
            style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)' }}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [avatarPhoto, setAvatarPhoto] = useState(() => localStorage.getItem(AVATAR_KEY));
  const [score,       setScore]       = useState(null);
  const [jar,         setJar]         = useState(null);
  const [streak,      setStreak]      = useState(null);
  const [copied,      setCopied]      = useState(false);
  const [toast,       setToast]       = useState(null);
  const [showDelete,  setShowDelete]  = useState(false);
  const [deleting,    setDeleting]    = useState(false);

  useEffect(() => {
    client.get('/pocketscore').then((r) => setScore(r.data.score)).catch(() => {});
    client.get('/wallet/jar').then((r) => setJar(r.data.savings_jar)).catch(() => {});
    client.get('/dashboard').then((r) => setStreak(r.data.streak_days)).catch(() => {});
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setToast({ message: 'Image too large (max 3 MB)', icon: '⚠️' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target.result;
      localStorage.setItem(AVATAR_KEY, dataUrl);
      setAvatarPhoto(dataUrl);
      window.dispatchEvent(new CustomEvent('avatar:update', { detail: dataUrl }));
      setToast({ message: 'Photo updated!', icon: '📸' });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

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

  const scoreLabel = score == null ? null : score >= 700 ? 'Excellent' : score >= 550 ? 'Good' : score >= 350 ? 'Fair' : 'Poor';
  const scoreFill  = score == null ? 0 : Math.min(100, (score / 850) * 100);
  const scoreColor = score == null ? '#7A8BAD' : score >= 700 ? '#8B5CF6' : score >= 550 ? '#3B6CFF' : score >= 350 ? '#F59E0B' : '#EF4444';

  const [ca, cb] = avatarColors(user?.name || '');
  const ringGrad = `linear-gradient(135deg, ${ca}, ${cb})`;

  return (
    <div className="min-h-screen bg-bg pb-36 page-enter" style={{ paddingTop: 'env(safe-area-inset-top,0px)' }}>
      {toast && <Toast message={toast.message} icon={toast.icon} onDismiss={() => setToast(null)} />}
      <AnimatePresence>{showDelete && <DeleteDialog onCancel={() => setShowDelete(false)} onConfirm={handleDelete} deleting={deleting} />}</AnimatePresence>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute -top-40 -right-20 w-72 h-72 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59,108,255,0.18) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute top-80 -left-24 w-60 h-60 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      {/* Minimal header — no border, just blur */}
      <div className="sticky top-0 z-40"
        style={{ background: 'rgba(7,9,26,0.75)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', paddingTop: 'env(safe-area-inset-top,0px)' }}
      >
        <div className="max-w-sm mx-auto px-5 h-12 flex items-center justify-between">
          <span className="font-display font-bold text-sm tracking-tight"
            style={{ background: 'linear-gradient(135deg,#3B6CFF,#8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          >PocketPal</span>
          <button onClick={() => navigate('/settings')}
            className="h-8 w-8 flex items-center justify-center rounded-xl text-muted/50 hover:text-muted transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      <motion.div className="relative z-10 max-w-sm mx-auto px-4 pt-4 flex flex-col gap-5" variants={container} initial="hidden" animate="show">

        {/* ── Identity hero ── */}
        <motion.div variants={fadeUp} className="flex flex-col items-center gap-3 py-3">
          {/* Avatar */}
          <div className="relative">
            {/* Glow behind */}
            <div className="absolute inset-0 rounded-full scale-125 opacity-30"
              style={{ background: ringGrad, filter: 'blur(20px)' }} />
            {/* Gradient ring */}
            <motion.div
              className="relative h-24 w-24 rounded-full p-[2.5px] cursor-pointer"
              style={{ background: ringGrad }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fileRef.current?.click()}
            >
              <div
                className="h-full w-full rounded-full overflow-hidden flex items-center justify-center text-white text-2xl font-bold select-none"
                style={{ background: avatarPhoto ? '#000' : `linear-gradient(135deg,${ca},${cb})` }}
              >
                {avatarPhoto
                  ? <img src={avatarPhoto} className="w-full h-full object-cover" alt="avatar" />
                  : getInitials(user?.name)}
              </div>
            </motion.div>
            {/* Camera button */}
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-0.5 -right-0.5 h-7 w-7 rounded-full flex items-center justify-center border-2 border-bg shadow-xl"
              style={{ background: 'linear-gradient(135deg,#3B6CFF,#8B5CF6)' }}
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          {/* Name + email */}
          <div className="text-center">
            <h1 className="font-heading font-black text-2xl text-text leading-none tracking-tight">{user?.name || '—'}</h1>
            <p className="text-muted/50 text-sm mt-1">{user?.email}</p>
          </div>

          {/* Invite code pill */}
          {user?.invite_code && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider transition-all duration-200"
              style={copied
                ? { background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#10B981' }
                : { background: 'rgba(59,108,255,0.10)', border: '1px solid rgba(59,108,255,0.22)', color: '#3B6CFF' }
              }
            >
              <span className="font-mono tracking-[0.15em]">{user.invite_code}</span>
              <span className="text-[10px]">{copied ? '✓' : '📋'}</span>
            </motion.button>
          )}
        </motion.div>

        {/* ── Stats bento ── */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-2">
          {[
            { icon: '💰', label: 'Saved',        value: jar   != null ? fmtAmount(jar)    : '—',  accent: '#10B981' },
            { icon: '🔥', label: 'Day streak',    value: streak != null ? `${streak}d`     : '—',  accent: '#EC4899' },
            { icon: '⭐', label: 'PocketScore',   value: score != null ? `${score}`        : '—',  suffix: '/850', accent: scoreColor, onClick: () => navigate('/score') },
            { icon: '📅', label: 'Member since',  value: memberSince,                               accent: '#8B5CF6' },
          ].map(({ icon, label, value, suffix, accent, onClick }) => (
            <motion.div
              key={label}
              whileTap={onClick ? { scale: 0.96 } : undefined}
              onClick={onClick}
              className={`rounded-2xl p-4 flex flex-col gap-2.5 ${onClick ? 'cursor-pointer' : ''}`}
              style={{ background: 'rgba(255,255,255,0.035)', border: `1px solid ${accent}15` }}
            >
              <span className="text-xl leading-none">{icon}</span>
              <div>
                <p className="font-black text-text text-xl leading-none tracking-tight">
                  {value}
                  {suffix && <span className="text-muted/40 text-xs font-normal ml-0.5">{suffix}</span>}
                </p>
                <p className="text-[9px] font-black uppercase tracking-[0.16em] mt-1.5" style={{ color: accent }}>{label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Score bar ── */}
        <motion.div variants={fadeUp}>
          <motion.button
            whileTap={{ scale: 0.985 }}
            onClick={() => navigate('/score')}
            className="w-full rounded-2xl px-4 py-3.5 flex items-center gap-3.5 text-left"
            style={{ background: `linear-gradient(135deg,${scoreColor}12,${scoreColor}06)`, border: `1px solid ${scoreColor}20` }}
          >
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-muted/50">PocketScore</span>
                {scoreLabel && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${scoreColor}18`, color: scoreColor }}>{scoreLabel}</span>
                )}
              </div>
              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <motion.div className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg,${scoreColor},${scoreColor}88)` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${scoreFill}%` }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
                />
              </div>
            </div>
            <span className="font-black text-text text-lg shrink-0 leading-none">{score ?? '—'}</span>
          </motion.button>
        </motion.div>

        {/* ── Menu ── */}
        <MenuGroup label="Account">
          <MenuItem icon="✏️" grad="rgba(59,108,255,0.14)" label="Edit Profile"    sub="Name, email, budget"         onClick={() => navigate('/profile/edit')} />
          <MenuItem icon="🎯" grad="rgba(16,185,129,0.14)" label="My Goals"         sub="Track savings targets"       onClick={() => navigate('/goals')} />
          <MenuItem icon="🫙" grad="rgba(16,185,129,0.14)" label="Savings Jar"      sub="Round-ups & jar goal"        onClick={() => navigate('/jar')} />
          <MenuItem icon="🔒" grad="rgba(139,92,246,0.14)" label="Change Password"                                    onClick={() => navigate('/profile/change-password')} />
        </MenuGroup>

        <MenuGroup label="Preferences">
          <MenuItem icon="🔔" grad="rgba(245,158,11,0.14)"  label="Notifications"  sub="Streak, budget & alerts"     onClick={() => navigate('/notifications')} />
          <MenuItem icon="⚙️" grad="rgba(107,114,128,0.14)" label="Settings"       sub="Currency, date format"       onClick={() => navigate('/settings')} />
        </MenuGroup>

        <MenuGroup label="Support">
          <MenuItem icon="❓" grad="rgba(59,108,255,0.12)"  label="Help & Support"  sub="FAQs and how-tos"           onClick={() => navigate('/help')} />
          <MenuItem icon="ℹ️" grad="rgba(59,108,255,0.12)"  label="About PocketPal" sub="v1.0"                       onClick={() => navigate('/about')} />
        </MenuGroup>

        {/* ── Sign out + delete ── */}
        <motion.div variants={fadeUp} className="flex flex-col items-center gap-3 pb-4 pt-1">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={logout}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-red-400"
            style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)' }}
          >
            Sign out
          </motion.button>
          <button
            onClick={() => setShowDelete(true)}
            className="text-xs text-muted/30 hover:text-muted/50 transition-colors"
          >
            Delete account
          </button>
        </motion.div>

      </motion.div>
    </div>
  );
}
