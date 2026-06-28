import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import TopBar from '../components/TopBar';
import Button from '../components/Button';
import Toast from '../components/Toast';
import { useCountUp } from '../hooks/useCountUp';

// ── Motion constants ──────────────────────────────────────────────────────────
const SPRING  = { duration: 0.48, ease: [0.22, 1, 0.36, 1] };
const SPRING2 = { type: 'spring', stiffness: 380, damping: 22 };

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: SPRING },
};

// ── Colour helpers ────────────────────────────────────────────────────────────
const PALETTE = ['#3B6CFF','#8B5CF6','#10B981','#F59E0B','#EF4444','#06B6D4','#EC4899','#F97316'];
const avatarColor = (id) => PALETTE[(id || 0) % PALETTE.length];
const initials    = (name) => (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const inr         = (n)    => Math.round(Math.abs(n || 0)).toLocaleString('en-IN');

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, id, size = 'md' }) {
  const c  = avatarColor(id);
  const sz = size === 'lg' ? 'w-12 h-12 text-base'
           : size === 'sm' ? 'w-7 h-7 text-[11px]'
           : 'w-9 h-9 text-sm';
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-bold text-white shrink-0 select-none`}
      style={{ background: `linear-gradient(135deg, ${c} 0%, ${c}bb 100%)`, boxShadow: `0 2px 8px ${c}55` }}>
      {initials(name)}
    </div>
  );
}

// ── Sub-tab bar ───────────────────────────────────────────────────────────────
const TABS = [
  { id: 'balances', label: 'Balances'  },
  { id: 'groups',   label: 'Groups'    },
  { id: 'new',      label: 'New Split' },
  { id: 'history',  label: 'History'   },
];

function SubTabBar({ active, onChange, settleCount }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
      {TABS.map((tab) => {
        const on    = active === tab.id;
        const badge = tab.id === 'balances' ? settleCount : 0;
        return (
          <motion.button key={tab.id} onClick={() => onChange(tab.id)} whileTap={{ scale: 0.93 }}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${on ? 'text-white' : 'text-muted hover:text-text/70'}`}
            style={on ? { background: 'linear-gradient(135deg, #3B6CFF 0%, #8B5CF6 100%)', boxShadow: '0 2px 14px rgba(59,108,255,0.45)' } : { background: 'rgba(30,45,78,0.55)' }}>
            {tab.label}
            {badge > 0 && (
              <span className="h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-black"
                style={{ background: on ? 'rgba(255,255,255,0.3)' : 'linear-gradient(135deg,#F59E0B,#F97316)', color: 'white' }}>
                {badge}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

// ── Celebration burst ─────────────────────────────────────────────────────────
const BURST_COLORS = ['#3B6CFF','#8B5CF6','#10B981','#F59E0B','#EF4444','#06B6D4','#EC4899','#F97316'];
const BURST_COUNT  = 18;

function ConfettiBurst({ onDone }) {
  const particles = useRef(
    Array.from({ length: BURST_COUNT }, (_, i) => {
      const angle    = (360 / BURST_COUNT) * i + Math.random() * 10;
      const distance = 55 + Math.random() * 45;
      return { id: i, color: BURST_COLORS[i % BURST_COLORS.length], angle, distance };
    })
  ).current;

  return (
    <motion.div className="relative flex items-center justify-center h-28 pointer-events-none select-none"
      initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      {particles.map((p) => (
        <motion.div key={p.id}
          className="absolute rounded-full"
          style={{ backgroundColor: p.color, width: p.id % 3 === 0 ? 10 : 7, height: p.id % 3 === 0 ? 10 : 7 }}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          animate={{
            x: Math.cos((p.angle * Math.PI) / 180) * p.distance,
            y: Math.sin((p.angle * Math.PI) / 180) * p.distance,
            scale: 0,
            opacity: 0,
          }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: p.id * 0.012 }}
          onAnimationComplete={() => p.id === BURST_COUNT - 1 && onDone && onDone()}
        />
      ))}
      <motion.span className="text-5xl z-10"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={SPRING2}>
        🎉
      </motion.span>
    </motion.div>
  );
}

// ── Balance row (mutual settlement flow) ──────────────────────────────────────
function BalanceRow({ balance, dir, pendingRequest, onSettleRequest, onCancelSettle, delay }) {
  const [confirm,    setConfirm]    = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [sent,       setSent]       = useState(false);

  const green  = dir === 'back';
  const amount = green ? balance.they_owe : balance.you_owe;
  const anim   = useCountUp(amount, 900);

  async function handleRequest() {
    setRequesting(true);
    try {
      await onSettleRequest(balance.friend.id);
      setSent(true);
      setTimeout(() => setSent(false), 1200);
    } catch {}
    finally { setRequesting(false); setConfirm(false); }
  }

  async function handleCancel() {
    await onCancelSettle(pendingRequest.id);
  }

  const isPending = !!pendingRequest;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: green ? -16 : 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: -8, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } }}
      transition={{ ...SPRING, delay }}
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: green ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',
        border:     green ? '1px solid rgba(16,185,129,0.22)' : '1px solid rgba(239,68,68,0.22)',
      }}
    >
      <div className="p-4 flex items-center gap-3">
        <Avatar name={balance.friend.name} id={balance.friend.id} />
        <div className="flex-1 min-w-0">
          <p className="text-text font-semibold text-sm truncate">{balance.friend.name}</p>
          <p className="text-muted text-xs truncate">{balance.friend.email}</p>
        </div>
        <div className="text-right shrink-0 flex flex-col items-end gap-1">
          <p className="font-black text-[17px] leading-none" style={{ color: green ? '#10B981' : '#EF4444' }}>
            ₹{anim.toLocaleString('en-IN')}
          </p>
          <AnimatePresence mode="wait">
            {isPending ? (
              <motion.div key="awaiting"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-end gap-1">
                <span className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg"
                  style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                  ⏳ Awaiting
                </span>
                <motion.button whileTap={{ scale: 0.92 }} onClick={handleCancel}
                  className="text-[10px] font-semibold px-2.5 py-1.5 rounded-lg"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171' }}>
                  Cancel
                </motion.button>
              </motion.div>
            ) : sent ? (
              <motion.div key="sent"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="text-xs font-bold px-3 py-2 rounded-xl min-h-[36px] flex items-center gap-1"
                style={{ background: 'rgba(16,185,129,0.18)', color: '#10B981' }}>
                ✓ Requested
              </motion.div>
            ) : requesting ? (
              <motion.div key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-xs font-bold px-3 py-2 rounded-xl min-h-[36px] flex items-center"
                style={{ background: 'rgba(255,255,255,0.07)', color: '#7A8BAD' }}>
                …
              </motion.div>
            ) : !confirm ? (
              <motion.button key="settle-btn"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setConfirm(true)}
                className="text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all min-h-[44px]"
                style={{ background: green ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)', color: green ? '#10B981' : '#EF4444' }}>
                Settle up
              </motion.button>
            ) : (
              <motion.div key="confirm"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-end gap-1.5">
                <p className="text-[10px] text-muted/50 text-right leading-tight max-w-[100px]">
                  Send a request — they confirm
                </p>
                <div className="flex gap-1.5">
                  <motion.button whileTap={{ scale: 0.92 }} onClick={handleRequest} disabled={requesting}
                    className="text-xs font-black px-3.5 py-2.5 rounded-xl min-h-[44px]"
                    style={{ background: 'rgba(16,185,129,0.2)', color: '#10B981' }}>
                    Request
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.92 }} onClick={() => setConfirm(false)}
                    className="text-xs font-bold px-3.5 py-2.5 rounded-xl min-h-[44px]"
                    style={{ background: 'rgba(255,255,255,0.07)', color: '#7A8BAD' }}>
                    No
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ── Balances view ─────────────────────────────────────────────────────────────
function BalancesView({ balances, settleRequests, sentSettles, onSettleRequest, onCancelSettle, onApproveSettle, onRejectSettle }) {
  const gettingBack = balances.filter((b) => b.they_owe > 0);
  const iOwe        = balances.filter((b) => b.you_owe  > 0);
  const totalBack   = gettingBack.reduce((s, b) => s + b.they_owe, 0);
  const totalOwe    = iOwe.reduce((s, b) => s + b.you_owe, 0);
  const net         = totalBack - totalOwe;
  const [burst, setBurst] = useState(false);
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  const prevLenRef = useRef(balances.length);
  useEffect(() => {
    if (prevLenRef.current > 0 && balances.length === 0) setBurst(true);
    prevLenRef.current = balances.length;
  }, [balances.length]);

  const animNet  = useCountUp(Math.abs(net));
  const animBack = useCountUp(totalBack);
  const animOwe  = useCountUp(totalOwe);

  async function handleApprove(id) {
    setApproving(id);
    try { await onApproveSettle(id); } catch {} finally { setApproving(null); }
  }
  async function handleReject(id) {
    setRejecting(id);
    try { await onRejectSettle(id); } catch {} finally { setRejecting(null); }
  }

  // Build a map: friendId → sentSettle request (for awaiting state on balance rows)
  const sentMap = {};
  sentSettles.forEach((r) => { sentMap[r.target.id] = r; });

  if (balances.length === 0 && settleRequests.length === 0) {
    return (
      <motion.div key="empty-balances"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING}
        className="flex flex-col items-center py-16 gap-2">
        <AnimatePresence>
          {burst && <ConfettiBurst onDone={() => setBurst(false)} />}
        </AnimatePresence>
        {!burst && <div className="text-6xl mb-2">✅</div>}
        <p className="text-text font-black text-xl mt-1">All settled up!</p>
        <p className="text-muted text-sm mt-0.5 text-center max-w-xs leading-relaxed">
          No outstanding balances — you're square with everyone
        </p>
        <p className="text-muted/50 text-xs mt-3 text-center">
          Add a split to start tracking shared expenses
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-4">

      {/* ── Incoming settle requests ── */}
      {settleRequests.length > 0 && (
        <motion.div variants={cardVariants} className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <p className="text-xs font-black uppercase tracking-[0.14em]" style={{ color: '#F59E0B' }}>
              Settle Requests
            </p>
            <span className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
              style={{ background: 'linear-gradient(135deg,#F59E0B,#F97316)' }}>
              {settleRequests.length}
            </span>
          </div>
          {settleRequests.map((req) => (
            <motion.div key={req.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-3.5 flex items-center gap-3 min-h-[64px]"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)' }}>
              <Avatar name={req.requester.name} id={req.requester.id} />
              <div className="flex-1 min-w-0">
                <p className="text-text font-semibold text-sm truncate">{req.requester.name}</p>
                <p className="text-muted text-xs">wants to settle up with you</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <motion.button whileTap={{ scale: 0.92 }} onClick={() => handleApprove(req.id)} disabled={approving === req.id}
                  className="px-3.5 min-h-[44px] rounded-xl flex items-center gap-1.5 text-xs font-bold"
                  style={{ background: 'rgba(16,185,129,0.2)', color: '#10B981' }}>
                  {approving === req.id ? '…' : '✓ Confirm'}
                </motion.button>
                <motion.button whileTap={{ scale: 0.92 }} onClick={() => handleReject(req.id)} disabled={rejecting === req.id}
                  className="w-11 min-h-[44px] rounded-xl flex items-center justify-center text-sm"
                  style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>
                  {rejecting === req.id ? '…' : '✕'}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ── Simplified-balance label ── */}
      {balances.length > 0 && (
        <motion.div variants={cardVariants}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl self-start"
          style={{ background: 'rgba(59,108,255,0.1)', border: '1px solid rgba(59,108,255,0.2)' }}>
          <svg className="w-3 h-3 shrink-0" style={{ color: '#3B6CFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p className="text-[10px] font-bold" style={{ color: '#3B6CFF' }}>
            Simplified · minimum payments shown
          </p>
        </motion.div>
      )}

      {/* ── Hero net card ── */}
      {balances.length > 0 && (
        <motion.div variants={cardVariants} className="rounded-3xl p-6 relative overflow-hidden"
          style={{
            background: net >= 0
              ? 'linear-gradient(140deg, #059669 0%, #10B981 55%, #06B6D4 100%)'
              : 'linear-gradient(140deg, #DC2626 0%, #EF4444 55%, #F97316 100%)',
            boxShadow: net >= 0
              ? '0 24px 64px -12px rgba(16,185,129,0.55), 0 8px 28px -8px rgba(6,182,212,0.35)'
              : '0 24px 64px -12px rgba(239,68,68,0.55), 0 8px 28px -8px rgba(249,115,22,0.35)',
          }}>
          <div className="absolute -top-12 -right-12 w-52 h-52 rounded-full opacity-25 pointer-events-none"
            style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)', filter: 'blur(28px)' }} />
          <p className="text-white/70 text-[11px] font-bold uppercase tracking-[0.18em] mb-1">
            {net >= 0 ? "Overall you're owed" : 'Overall you owe'}
          </p>
          <p className="text-white font-black text-[42px] leading-none tracking-tight">
            ₹{animNet.toLocaleString('en-IN')}
          </p>
          <div className="flex gap-5 mt-4 pt-4 border-t border-white/20">
            <div>
              <p className="text-white/55 text-[10px] font-semibold uppercase tracking-wider">Getting back</p>
              <p className="text-white font-bold text-base mt-0.5">₹{animBack.toLocaleString('en-IN')}</p>
            </div>
            <div className="w-px bg-white/20" />
            <div>
              <p className="text-white/55 text-[10px] font-semibold uppercase tracking-wider">You owe</p>
              <p className="text-white font-bold text-base mt-0.5">₹{animOwe.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── You'll get back ── */}
      {gettingBack.length > 0 && (
        <motion.div variants={cardVariants} className="flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: '#10B981' }}>
            You'll get back
          </p>
          <AnimatePresence mode="popLayout">
            {gettingBack.map((b, i) => (
              <BalanceRow key={b.friend.id} balance={b} dir="back"
                pendingRequest={sentMap[b.friend.id] || null}
                onSettleRequest={onSettleRequest}
                onCancelSettle={onCancelSettle}
                delay={i * 0.05} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── You owe ── */}
      {iOwe.length > 0 && (
        <motion.div variants={cardVariants} className="flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: '#EF4444' }}>
            You owe
          </p>
          <AnimatePresence mode="popLayout">
            {iOwe.map((b, i) => (
              <BalanceRow key={b.friend.id} balance={b} dir="owe"
                pendingRequest={sentMap[b.friend.id] || null}
                onSettleRequest={onSettleRequest}
                onCancelSettle={onCancelSettle}
                delay={i * 0.05} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Friends view (kept for Split internal use — standalone page is /friends) ──
function FriendsView({ friends, requests, sentRequests, currentUser, onRefresh, navigate, onToast }) {
  const [mode,       setMode]       = useState('email');
  const [input,      setInput]      = useState('');
  const [adding,     setAdding]     = useState(false);
  const [addError,   setAddError]   = useState('');
  const [responding, setResponding] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [copied,     setCopied]     = useState(false);

  async function sendRequest() {
    if (!input.trim()) return;
    setAdding(true); setAddError('');
    try {
      const res = await client.post('/friends/request',
        mode === 'email' ? { email: input.trim() } : { invite_code: input.trim().toUpperCase() }
      );
      const targetName = res.data?.addressee?.name || input.trim();
      onToast?.(`Request sent to ${targetName}`, '👋');
      setInput('');
      onRefresh();
    } catch (err) {
      setAddError(err.response?.data?.detail || 'Could not send request');
    } finally {
      setAdding(false);
    }
  }

  async function respond(req, action) {
    setResponding(req.id);
    try {
      await client.post(`/friends/${action}/${req.id}`);
      if (action === 'accept') onToast?.(`You're now friends with ${req.requester.name}!`, '🎉');
      onRefresh();
    } catch {}
    finally { setResponding(null); }
  }

  async function cancelRequest(req) {
    setCancelling(req.id);
    try { await client.post(`/friends/cancel/${req.id}`); onRefresh(); } catch {}
    finally { setCancelling(null); }
  }

  function copyCode() {
    if (!currentUser?.invite_code) return;
    navigator.clipboard.writeText(currentUser.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-5">

      {/* Your invite code */}
      {currentUser?.invite_code && (
        <motion.div variants={cardVariants} className="rounded-3xl p-5"
          style={{ background: 'rgba(13,18,37,0.85)', border: '1px solid rgba(59,108,255,0.2)' }}>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted mb-3">Your invite code</p>
          <div className="flex items-center justify-between">
            <p className="font-mono font-black text-3xl tracking-wider"
              style={{ background: 'linear-gradient(135deg, #3B6CFF 0%, #8B5CF6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {currentUser.invite_code}
            </p>
            <motion.button whileTap={{ scale: 0.92 }} onClick={copyCode}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all duration-200"
              style={{ background: copied ? 'rgba(16,185,129,0.18)' : 'rgba(59,108,255,0.14)', color: copied ? '#10B981' : '#3B6CFF' }}>
              {copied ? 'Copied!' : 'Copy'}
            </motion.button>
          </div>
          <p className="text-muted/60 text-xs mt-2">Share this so friends can add you</p>
        </motion.div>
      )}

      {/* Add friend */}
      <motion.div variants={cardVariants} className="rounded-3xl p-5"
        style={{ background: 'rgba(13,18,37,0.85)', border: '1px solid rgba(30,45,78,0.6)' }}>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted mb-4">Add a friend</p>
        <div className="flex gap-2 mb-4">
          {[{ id: 'email', label: 'Email' }, { id: 'code', label: 'Invite Code' }].map((m) => (
            <button key={m.id} onClick={() => { setMode(m.id); setInput(''); setAddError(''); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${mode === m.id ? 'text-white' : 'text-muted'}`}
              style={mode === m.id ? { background: 'linear-gradient(135deg, #3B6CFF 0%, #8B5CF6 100%)' } : { background: 'rgba(30,45,78,0.55)' }}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input type={mode === 'email' ? 'email' : 'text'}
            placeholder={mode === 'email' ? 'friend@example.com' : 'PKT-XXXXX'}
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendRequest()}
            className="flex-1 bg-surface-2 border border-border rounded-xl px-4 py-3 text-text text-base outline-none focus:border-primary transition-all placeholder:text-muted/40 min-h-[48px]" />
          <motion.button whileTap={{ scale: 0.93 }} onClick={sendRequest}
            disabled={adding || !input.trim()}
            className="px-5 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-40 transition-all min-h-[48px] min-w-[56px]"
            style={{ background: 'linear-gradient(135deg, #3B6CFF 0%, #8B5CF6 100%)' }}>
            {adding ? '…' : 'Add'}
          </motion.button>
        </div>
        <AnimatePresence>
          {addError && <motion.p key="e" initial={{ opacity:0,y:-4 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }} className="text-danger text-xs mt-2">{addError}</motion.p>}
        </AnimatePresence>
      </motion.div>

      {/* Incoming friend requests */}
      {requests.length > 0 && (
        <motion.div variants={cardVariants} className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <p className="text-xs font-black uppercase tracking-[0.14em]" style={{ color: '#F97316' }}>
              Friend Requests
            </p>
            <span className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
              style={{ background: 'linear-gradient(135deg,#F97316,#EF4444)' }}>
              {requests.length}
            </span>
          </div>
          {requests.map((req) => (
            <motion.div key={req.id}
              initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
              className="rounded-2xl p-3.5 flex items-center gap-3 min-h-[64px]"
              style={{ background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.22)' }}>
              <Avatar name={req.requester.name} id={req.requester.id} />
              <div className="flex-1 min-w-0">
                <p className="text-text font-semibold text-sm truncate">{req.requester.name}</p>
                <p className="text-muted text-xs truncate">{req.requester.email}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <motion.button whileTap={{ scale:0.92 }} onClick={() => respond(req, 'accept')} disabled={responding === req.id}
                  className="px-3.5 min-h-[44px] rounded-xl flex items-center gap-1.5 text-xs font-bold"
                  style={{ background:'rgba(16,185,129,0.2)', color:'#10B981' }}>
                  ✓ Accept
                </motion.button>
                <motion.button whileTap={{ scale:0.92 }} onClick={() => respond(req, 'reject')} disabled={responding === req.id}
                  className="w-11 min-h-[44px] rounded-xl flex items-center justify-center text-sm"
                  style={{ background:'rgba(239,68,68,0.12)', color:'#EF4444' }}>✕</motion.button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Sent / pending requests */}
      {sentRequests.length > 0 && (
        <motion.div variants={cardVariants} className="flex flex-col gap-2.5">
          <p className="text-xs font-black uppercase tracking-[0.14em]" style={{ color: '#8B5CF6' }}>
            Sent Requests · {sentRequests.length}
          </p>
          {sentRequests.map((req) => (
            <motion.div key={req.id}
              initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
              className="rounded-2xl p-3.5 flex items-center gap-3 min-h-[64px]"
              style={{ background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.22)' }}>
              <Avatar name={req.addressee.name} id={req.addressee.id} />
              <div className="flex-1 min-w-0">
                <p className="text-text font-semibold text-sm truncate">{req.addressee.name}</p>
                <p className="text-muted text-xs truncate">{req.addressee.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg leading-none"
                  style={{ background:'rgba(139,92,246,0.18)', color:'#A78BFA' }}>
                  Pending
                </span>
                <motion.button whileTap={{ scale:0.92 }}
                  onClick={() => { setCancelling(req.id); client.post(`/friends/cancel/${req.id}`).then(() => onRefresh()).finally(() => setCancelling(null)); }}
                  disabled={cancelling === req.id}
                  className="text-xs font-semibold px-3 py-2 min-h-[36px] rounded-lg transition-all"
                  style={{ background:'rgba(239,68,68,0.1)', color:'#F87171' }}>
                  {cancelling === req.id ? '…' : 'Cancel'}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Friends list */}
      <motion.div variants={cardVariants} className="flex flex-col gap-2.5">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-muted/60">
          Friends · {friends.length}
        </p>
        {friends.length === 0 ? (
          <div className="rounded-2xl p-8 flex flex-col items-center gap-3 text-center"
            style={{ background:'rgba(13,18,37,0.6)', border:'1px dashed rgba(59,108,255,0.2)' }}>
            <div className="text-4xl">👥</div>
            <div>
              <p className="text-text font-semibold text-sm">No friends yet</p>
              <p className="text-muted text-xs mt-1 leading-relaxed">
                Add someone above — once they accept, split away 🤝
              </p>
            </div>
          </div>
        ) : (
          friends.map((f, i) => (
            <motion.div key={f.id}
              initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl p-3.5 flex items-center gap-3 min-h-[64px]"
              style={{ background:'rgba(13,18,37,0.85)', border:'1px solid rgba(30,45,78,0.6)' }}>
              <Avatar name={f.name} id={f.id} />
              <div className="flex-1 min-w-0">
                <p className="text-text font-semibold text-sm truncate">{f.name}</p>
                <p className="text-muted text-xs truncate">{f.email}</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(`/chat/${f.id}`, { state: { friendName: f.name } })}
                className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(59,108,255,0.15)', color: '#3B6CFF' }}>
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </motion.button>
            </motion.div>
          ))
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Group expense form ────────────────────────────────────────────────────────
function GroupExpenseForm({ group, currentUser, onSuccess, onToast }) {
  const members  = group.members.map((m) => m.user);
  const [desc,   setDesc]   = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(currentUser?.id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]   = useState('');

  async function submit() {
    if (!desc.trim())              { setError('Add a description'); return; }
    if (!parseFloat(amount) > 0)   { setError('Enter an amount'); return; }
    setError(''); setSubmitting(true);
    try {
      await client.post('/splits', {
        description: desc.trim(),
        total_amount: parseFloat(amount),
        paid_by: paidBy,
        group_id: group.id,
        equal_split: true,
        participants: members.map((m) => m.id),
      });
      onToast?.(`₹${amount} split equally among ${members.length} members ✓`, '');
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not add expense');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={SPRING}
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ background:'rgba(13,18,37,0.85)', border:'1px solid rgba(30,45,78,0.6)' }}>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">New group expense</p>
      <input type="text" placeholder="What's it for?" value={desc} onChange={(e) => setDesc(e.target.value)}
        className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-text text-sm outline-none focus:border-primary transition-all placeholder:text-muted/40 min-h-[44px]" />
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm pointer-events-none">₹</span>
        <input type="number" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-surface-2 border border-border rounded-xl pl-8 pr-4 py-3 text-text text-sm outline-none focus:border-primary transition-all placeholder:text-muted/40 min-h-[44px]" />
      </div>
      <div>
        <p className="text-[10px] text-muted/60 mb-2">Who paid?</p>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <motion.button key={m.id} whileTap={{ scale:0.93 }} onClick={() => setPaidBy(m.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={paidBy === m.id
                ? { background:'linear-gradient(135deg,#3B6CFF,#8B5CF6)', color:'white' }
                : { background:'rgba(30,45,78,0.55)', color:'#7A8BAD' }}>
              <Avatar name={m.name} id={m.id} size="sm" />
              {m.id === currentUser?.id ? 'You' : m.name.split(' ')[0]}
            </motion.button>
          ))}
        </div>
      </div>
      <p className="text-[10px] text-muted/50">Split equally among all {members.length} members</p>
      {error && <p className="text-danger text-xs">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={submit} loading={submitting} className="flex-1">Add expense</Button>
      </div>
    </motion.div>
  );
}

// ── Group detail view ─────────────────────────────────────────────────────────
function GroupDetailView({ group, currentUser, onBack, onToast }) {
  const [balances,    setBalances]    = useState([]);
  const [splits,      setSplits]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showExpense, setShowExpense] = useState(false);

  const fetchGroup = useCallback(async () => {
    try {
      const [bRes, sRes] = await Promise.all([
        client.get(`/groups/${group.id}/balances`),
        client.get(`/splits?group_id=${group.id}`),
      ]);
      setBalances(bRes.data);
      setSplits(sRes.data);
    } catch {}
    finally { setLoading(false); }
  }, [group.id]);

  useEffect(() => { fetchGroup(); }, [fetchGroup]);

  const members = group.members.map((m) => m.user);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-4">

      {/* Back */}
      <motion.div variants={cardVariants} className="flex items-center gap-3">
        <motion.button whileTap={{ scale:0.92 }} onClick={onBack}
          className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background:'rgba(30,45,78,0.55)', color:'#7A8BAD' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </motion.button>
        <h2 className="font-heading text-xl font-bold text-text">{group.name}</h2>
      </motion.div>

      {/* Members */}
      <motion.div variants={cardVariants} className="rounded-2xl p-4"
        style={{ background:'rgba(13,18,37,0.85)', border:'1px solid rgba(30,45,78,0.6)' }}>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted mb-3">
          Members · {members.length}
        </p>
        <div className="flex flex-wrap gap-3">
          {members.map((m) => (
            <div key={m.id} className="flex flex-col items-center gap-1">
              <Avatar name={m.name} id={m.id} size="md" />
              <p className="text-[10px] text-muted/70 font-medium">
                {m.id === currentUser?.id ? 'You' : m.name.split(' ')[0]}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Group balances */}
      <motion.div variants={cardVariants} className="flex flex-col gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted/60">Balances</p>
        {loading ? (
          <div className="h-16 rounded-2xl bg-white/5 animate-pulse" />
        ) : balances.length === 0 ? (
          <div className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background:'rgba(16,185,129,0.07)', border:'1px solid rgba(16,185,129,0.18)' }}>
            <span className="text-2xl">✅</span>
            <p className="text-sm font-semibold" style={{ color:'#10B981' }}>All settled up within the group!</p>
          </div>
        ) : (
          balances.map((b, i) => {
            const isMyDebt   = b.debtor.id   === currentUser?.id;
            const isMyCredit = b.creditor.id === currentUser?.id;
            const highlight  = isMyDebt || isMyCredit;
            return (
              <motion.div key={i}
                initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * 0.05 }}
                className="rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{
                  background: isMyDebt ? 'rgba(239,68,68,0.07)' : isMyCredit ? 'rgba(16,185,129,0.07)' : 'rgba(13,18,37,0.85)',
                  border: isMyDebt ? '1px solid rgba(239,68,68,0.18)' : isMyCredit ? '1px solid rgba(16,185,129,0.18)' : '1px solid rgba(30,45,78,0.5)',
                }}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm font-semibold text-text truncate">
                    {b.debtor.id === currentUser?.id ? 'You' : b.debtor.name.split(' ')[0]}
                  </span>
                  <svg className="w-3.5 h-3.5 text-muted/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-sm font-semibold text-text truncate">
                    {b.creditor.id === currentUser?.id ? 'You' : b.creditor.name.split(' ')[0]}
                  </span>
                </div>
                <span className="font-black text-sm shrink-0"
                  style={{ color: isMyDebt ? '#EF4444' : isMyCredit ? '#10B981' : '#E8EAF0' }}>
                  ₹{inr(b.amount)}
                </span>
              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* Add expense */}
      <motion.div variants={cardVariants}>
        <motion.button whileTap={{ scale:0.97 }} onClick={() => setShowExpense((v) => !v)}
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2"
          style={{ background:'linear-gradient(135deg,#3B6CFF,#8B5CF6)', boxShadow:'0 4px 16px rgba(59,108,255,0.35)' }}>
          {showExpense ? '✕ Cancel' : '+ Add group expense'}
        </motion.button>
        <AnimatePresence>
          {showExpense && (
            <motion.div key="expense-form" initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
              className="overflow-hidden mt-3">
              <GroupExpenseForm
                group={group}
                currentUser={currentUser}
                onToast={onToast}
                onSuccess={() => { setShowExpense(false); fetchGroup(); }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Expense history */}
      <motion.div variants={cardVariants} className="flex flex-col gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted/60">
          Expenses · {splits.length}
        </p>
        {loading ? (
          <>
            <div className="h-16 rounded-2xl bg-white/5 animate-pulse" />
            <div className="h-16 rounded-2xl bg-white/5 animate-pulse" />
          </>
        ) : splits.length === 0 ? (
          <div className="rounded-2xl p-6 flex flex-col items-center gap-2 text-center"
            style={{ background:'rgba(13,18,37,0.6)', border:'1px dashed rgba(30,45,78,0.5)' }}>
            <span className="text-3xl">🧾</span>
            <p className="text-text font-semibold text-sm">No expenses yet</p>
            <p className="text-muted text-xs">Add the first one above</p>
          </div>
        ) : splits.map((split) => {
          const iPaid = split.paid_by_user_id === currentUser?.id;
          const date  = new Date(split.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' });
          return (
            <div key={split.id} className="rounded-2xl p-4"
              style={{ background:'rgba(13,18,37,0.8)', border:'1px solid rgba(30,45,78,0.55)' }}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-text font-bold text-sm truncate">{split.description}</p>
                  <p className="text-muted text-xs mt-0.5">
                    {iPaid ? 'You paid' : `${split.paid_by.name.split(' ')[0]} paid`} · {date}
                  </p>
                </div>
                <p className="text-text font-black text-base shrink-0">₹{inr(split.total_amount)}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {split.shares.map((sh) => (
                  <div key={sh.id}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
                    style={sh.settled
                      ? { background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', color:'#10B981' }
                      : { background:'rgba(30,45,78,0.6)', color:'#7A8BAD' }}>
                    {sh.user_id === currentUser?.id ? 'You' : sh.user.name.split(' ')[0]}
                    <span className="opacity-60">₹{inr(sh.share_amount)}</span>
                    {sh.settled && <span className="text-[9px]">✓</span>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}

// ── Groups view ───────────────────────────────────────────────────────────────
function GroupsView({ groups, friends, currentUser, onRefresh, onToast }) {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showCreate,    setShowCreate]    = useState(false);
  const [createName,    setCreateName]    = useState('');
  const [createMembers, setCreateMembers] = useState([]);
  const [creating,      setCreating]      = useState(false);
  const [createError,   setCreateError]   = useState('');

  if (selectedGroup) {
    return (
      <GroupDetailView
        group={selectedGroup}
        currentUser={currentUser}
        onBack={() => { setSelectedGroup(null); onRefresh(); }}
        onToast={onToast}
      />
    );
  }

  function toggleMember(id) {
    setCreateMembers((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleCreate() {
    if (!createName.trim()) { setCreateError('Give your group a name'); return; }
    setCreating(true); setCreateError('');
    try {
      await client.post('/groups', {
        name: createName.trim(),
        member_user_ids: createMembers,
      });
      onToast?.(`${createName} created! 🎉`, '');
      setCreateName(''); setCreateMembers([]); setShowCreate(false);
      onRefresh();
    } catch (err) {
      setCreateError(err.response?.data?.detail || 'Could not create group');
    } finally {
      setCreating(false);
    }
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-4">

      {/* Create group */}
      <motion.div variants={cardVariants}>
        <motion.button whileTap={{ scale:0.97 }} onClick={() => setShowCreate((v) => !v)}
          className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
          style={{
            background: showCreate ? 'rgba(255,255,255,0.05)' : 'rgba(59,108,255,0.12)',
            border: `1px solid ${showCreate ? 'rgba(255,255,255,0.1)' : 'rgba(59,108,255,0.25)'}`,
            color: showCreate ? '#7A8BAD' : '#3B6CFF',
          }}>
          {showCreate ? '✕ Cancel' : '+ Create a group'}
        </motion.button>

        <AnimatePresence>
          {showCreate && (
            <motion.div key="create-form"
              initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
              className="overflow-hidden mt-3">
              <div className="rounded-2xl p-4 flex flex-col gap-3"
                style={{ background:'rgba(13,18,37,0.85)', border:'1px solid rgba(30,45,78,0.6)' }}>
                <input type="text" placeholder="Group name (Flat 404, Goa Trip…)"
                  value={createName} onChange={(e) => setCreateName(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-text text-sm outline-none focus:border-primary transition-all placeholder:text-muted/40 min-h-[44px]" />
                {friends.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted/60 mb-2">Add friends to the group</p>
                    <div className="flex flex-wrap gap-2">
                      {friends.map((f) => {
                        const on = createMembers.includes(f.id);
                        return (
                          <motion.button key={f.id} whileTap={{ scale:0.93 }} onClick={() => toggleMember(f.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                            style={on
                              ? { background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', color:'#10B981' }
                              : { background:'rgba(30,45,78,0.55)', color:'#7A8BAD', border:'1px solid transparent' }}>
                            <Avatar name={f.name} id={f.id} size="sm" />
                            {f.name.split(' ')[0]}
                            {on && <span className="text-[10px]">✓</span>}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {friends.length === 0 && (
                  <p className="text-muted/50 text-xs">Add friends first — they can be added to the group</p>
                )}
                {createError && <p className="text-danger text-xs">{createError}</p>}
                <Button onClick={handleCreate} loading={creating}>Create group</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Groups list */}
      {groups.length === 0 ? (
        <motion.div variants={cardVariants}
          className="rounded-2xl p-8 flex flex-col items-center gap-3 text-center"
          style={{ background:'rgba(13,18,37,0.6)', border:'1px dashed rgba(59,108,255,0.2)' }}>
          <span className="text-4xl">🏠</span>
          <div>
            <p className="text-text font-semibold text-sm">No groups yet</p>
            <p className="text-muted text-xs mt-1 leading-relaxed max-w-[200px] mx-auto">
              Create one for your flat, upcoming trip, or any shared crew
            </p>
          </div>
        </motion.div>
      ) : (
        <>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted/60">
            Your groups · {groups.length}
          </p>
          {groups.map((g) => {
            const memberNames = g.members.slice(0, 3).map((m) =>
              m.user.id === currentUser?.id ? 'You' : m.user.name.split(' ')[0]
            ).join(', ');
            const extra = g.members.length > 3 ? ` +${g.members.length - 3}` : '';
            return (
              <motion.div key={g.id} variants={cardVariants}
                className="rounded-2xl p-4 cursor-pointer"
                style={{ background:'rgba(13,18,37,0.85)', border:'1px solid rgba(30,45,78,0.6)' }}
                onClick={() => setSelectedGroup(g)}
                whileTap={{ scale:0.98 }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-text font-bold text-base">{g.name}</p>
                  <svg className="w-4 h-4 text-muted/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {g.members.slice(0, 4).map((m) => (
                      <div key={m.user_id} className="ring-2 rounded-full" style={{ '--tw-ring-color': 'rgba(13,18,37,0.9)' }}>
                        <Avatar name={m.user.name} id={m.user_id} size="sm" />
                      </div>
                    ))}
                  </div>
                  <p className="text-muted/50 text-xs">{memberNames}{extra}</p>
                </div>
              </motion.div>
            );
          })}
        </>
      )}
    </motion.div>
  );
}

// ── New Split view ────────────────────────────────────────────────────────────
function NewSplitView({ friends, currentUser, onCreated }) {
  const selfEntry = { id: currentUser.id, name: 'You', email: currentUser.email };
  const all       = [selfEntry, ...friends];

  const [desc,         setDesc]         = useState('');
  const [total,        setTotal]        = useState('');
  const [paidBy,       setPaidBy]       = useState(currentUser.id);
  const [splitWith,    setSplitWith]    = useState([]);
  const [splitMode,    setSplitMode]    = useState('equal');
  const [customShares, setCustomShares] = useState({});
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState(false);

  const totalNum     = parseFloat(total) || 0;
  const participants = [...new Set([paidBy, ...splitWith])];
  const equalShare   = participants.length > 0 ? totalNum / participants.length : 0;
  const customSum    = participants.reduce((s, uid) => s + (parseFloat(customShares[uid] || 0)), 0);
  const customValid  = Math.abs(customSum - totalNum) < 0.01;

  function toggleWith(uid) {
    setSplitWith((p) => p.includes(uid) ? p.filter((x) => x !== uid) : [...p, uid]);
  }

  async function submit() {
    if (!desc.trim())            { setError('Add a description'); return; }
    if (totalNum <= 0)           { setError('Enter the total amount'); return; }
    if (participants.length < 2) { setError('Select at least one person to split with'); return; }
    if (splitMode === 'custom' && !customValid) {
      setError(`Shares must add up to ₹${inr(totalNum)}`);
      return;
    }
    setError(''); setSubmitting(true);
    try {
      await client.post('/splits', {
        description: desc.trim(),
        total_amount: totalNum,
        paid_by: paidBy,
        equal_split: splitMode === 'equal',
        ...(splitMode === 'equal'
          ? { participants }
          : { shares: participants.map((uid) => ({ user_id: uid, share_amount: parseFloat(customShares[uid] || 0) })) }),
      });
      setSuccess(true);
      setDesc(''); setTotal(''); setSplitWith([]); setCustomShares({});
      setTimeout(() => { setSuccess(false); onCreated(); }, 1400);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create split');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-4">

      <motion.div variants={cardVariants} className="rounded-3xl p-5"
        style={{ background:'rgba(13,18,37,0.85)', border:'1px solid rgba(30,45,78,0.6)' }}>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted text-center mb-3">Total bill</p>
        <div className="flex items-center justify-center gap-1 mb-4">
          <span className="text-3xl text-muted font-light select-none">₹</span>
          <input type="number" inputMode="decimal" min="0" placeholder="0" value={total}
            onChange={(e) => setTotal(e.target.value)}
            className="w-36 text-center text-[44px] font-black text-text bg-transparent outline-none placeholder:text-muted/25"
            style={{ WebkitAppearance:'none', MozAppearance:'textfield' }} />
        </div>
        <input type="text" placeholder="What's it for? (e.g. Dinner at Karim's)"
          value={desc} onChange={(e) => setDesc(e.target.value)}
          className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-text text-base outline-none focus:border-primary transition-all placeholder:text-muted/40" />
      </motion.div>

      <motion.div variants={cardVariants} className="rounded-3xl p-5"
        style={{ background:'rgba(13,18,37,0.85)', border:'1px solid rgba(30,45,78,0.6)' }}>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted mb-3">Who paid?</p>
        <div className="flex flex-wrap gap-2">
          {all.map((person) => {
            const on = paidBy === person.id;
            return (
              <motion.button key={person.id} whileTap={{ scale:0.93 }} onClick={() => setPaidBy(person.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
                style={on ? { background:'linear-gradient(135deg, #3B6CFF 0%, #8B5CF6 100%)', boxShadow:'0 2px 14px rgba(59,108,255,0.4)', color:'white' }
                          : { background:'rgba(30,45,78,0.55)', color:'#7A8BAD' }}>
                <Avatar name={person.name} id={person.id} size="sm" />
                {person.name}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      <motion.div variants={cardVariants} className="rounded-3xl p-5"
        style={{ background:'rgba(13,18,37,0.85)', border:'1px solid rgba(30,45,78,0.6)' }}>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted mb-3">Split with</p>
        {friends.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-5 text-center">
            <div className="text-3xl">👥</div>
            <p className="text-muted text-sm font-semibold">No friends yet</p>
            <p className="text-muted/50 text-xs leading-relaxed">Head to the Friends tab and add someone — then split away</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {all.map((person) => {
              const isPayer = person.id === paidBy;
              const on      = splitWith.includes(person.id) || isPayer;
              return (
                <motion.button key={person.id} whileTap={!isPayer ? { scale:0.93 } : undefined}
                  onClick={() => !isPayer && toggleWith(person.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${isPayer ? 'cursor-default' : 'cursor-pointer'}`}
                  style={on
                    ? { background: isPayer ? 'rgba(59,108,255,0.15)' : 'rgba(16,185,129,0.15)',
                        border: isPayer ? '1px solid rgba(59,108,255,0.35)' : '1px solid rgba(16,185,129,0.35)',
                        color:  isPayer ? '#3B6CFF' : '#10B981' }
                    : { background:'rgba(30,45,78,0.55)', color:'#7A8BAD', border:'1px solid transparent' }}>
                  <Avatar name={person.name} id={person.id} size="sm" />
                  {person.name}
                  {isPayer && <span className="text-[10px] opacity-60">paid</span>}
                  {on && !isPayer && <span className="text-[11px]">✓</span>}
                </motion.button>
              );
            })}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {participants.length >= 2 && totalNum > 0 && (
          <motion.div key="shares" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:8 }} transition={SPRING}
            className="rounded-3xl p-5"
            style={{ background:'rgba(13,18,37,0.85)', border:'1px solid rgba(30,45,78,0.6)' }}>
            <div className="flex gap-2 mb-4">
              {[{ id:'equal', label:'Equal split' }, { id:'custom', label:'Custom' }].map((m) => (
                <button key={m.id} onClick={() => setSplitMode(m.id)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${splitMode === m.id ? 'text-white' : 'text-muted'}`}
                  style={splitMode === m.id ? { background:'linear-gradient(135deg, #3B6CFF 0%, #8B5CF6 100%)' } : { background:'rgba(30,45,78,0.55)' }}>
                  {m.label}
                </button>
              ))}
            </div>
            {splitMode === 'equal' ? (
              <div className="flex flex-col gap-2.5">
                {participants.map((uid) => {
                  const p = all.find((x) => x.id === uid);
                  if (!p) return null;
                  return (
                    <div key={uid} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={p.name} id={uid} size="sm" />
                        <span className="text-text text-sm font-medium">{p.name}</span>
                      </div>
                      <span className="font-bold text-sm" style={{ color:'#10B981' }}>₹{inr(equalShare)}</span>
                    </div>
                  );
                })}
                <div className="pt-2 mt-1 border-t border-border/40 flex justify-between">
                  <span className="text-muted text-xs">Total</span>
                  <span className="text-text text-xs font-bold">₹{inr(totalNum)}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {participants.map((uid) => {
                  const p = all.find((x) => x.id === uid);
                  if (!p) return null;
                  return (
                    <div key={uid} className="flex items-center gap-3">
                      <Avatar name={p.name} id={uid} size="sm" />
                      <span className="text-text text-sm flex-1">{p.name}</span>
                      <div className="relative w-28">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm pointer-events-none">₹</span>
                        <input type="number" inputMode="decimal" min="0" placeholder="0"
                          value={customShares[uid] || ''}
                          onChange={(e) => setCustomShares((prev) => ({ ...prev, [uid]: e.target.value }))}
                          className="w-full bg-surface-2 border border-border rounded-xl pl-7 pr-2 py-2.5 text-text text-base text-right outline-none focus:border-primary transition-all" />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-border/40 flex justify-between items-center">
                  <span className="text-muted text-xs">Sum / Total</span>
                  <span className="text-sm font-black" style={{ color: customValid ? '#10B981' : '#EF4444' }}>
                    ₹{inr(customSum)} / ₹{inr(totalNum)}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error   && <motion.p key="e" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="text-danger text-sm text-center -mt-1">{error}</motion.p>}
        {success && (
          <motion.div key="s" initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
            className="flex flex-col items-center gap-1">
            <div className="text-3xl">🎉</div>
            <p className="text-center font-bold text-sm" style={{ color:'#10B981' }}>Split created!</p>
          </motion.div>
        )}
      </AnimatePresence>

      <Button onClick={submit} loading={submitting}
        disabled={participants.length < 2 || totalNum <= 0 || !desc.trim()}>
        Create split
      </Button>
    </motion.div>
  );
}

// ── History view ──────────────────────────────────────────────────────────────
function HistoryView({ splits, currentUser }) {
  if (splits.length === 0) {
    return (
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={SPRING}
        className="flex flex-col items-center py-16 gap-4 text-center">
        <div className="text-6xl">🧾</div>
        <div>
          <p className="text-text font-bold text-lg">No splits yet</p>
          <p className="text-muted text-sm mt-1.5 leading-relaxed max-w-xs">
            Add one and start settling up — every shared bill lands here 🤝
          </p>
        </div>
        <div className="mt-2 px-4 py-3 rounded-2xl text-xs text-muted/70 leading-relaxed max-w-xs text-center"
          style={{ background:'rgba(59,108,255,0.06)', border:'1px solid rgba(59,108,255,0.15)' }}>
          💡 Each person's share is automatically tracked in their budget
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-3">
      {splits.map((split) => {
        const myShare = split.shares.find((s) => s.user_id === currentUser.id);
        const iPaid   = split.paid_by_user_id === currentUser.id;
        const settled = split.shares.every((s) => s.settled);
        const date    = new Date(split.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' });

        return (
          <motion.div key={split.id} variants={cardVariants}
            className="rounded-2xl p-4"
            style={{ background:'rgba(13,18,37,0.8)', border:'1px solid rgba(30,45,78,0.55)' }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-text font-bold text-sm truncate">{split.description}</p>
                <p className="text-muted text-xs mt-0.5">
                  {iPaid ? 'You paid' : `${split.paid_by.name} paid`} · {date}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-text font-black text-base">₹{inr(split.total_amount)}</p>
                {myShare && (
                  <p className="text-xs mt-0.5 font-semibold" style={{ color: iPaid ? '#10B981' : '#F59E0B' }}>
                    your share ₹{inr(myShare.share_amount)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {split.shares.map((sh) => (
                <div key={sh.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={sh.settled
                    ? { background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', color:'#10B981' }
                    : { background:'rgba(30,45,78,0.6)', color:'#7A8BAD' }}>
                  <span>{sh.user.name.split(' ')[0]}</span>
                  <span className="opacity-70">₹{inr(sh.share_amount)}</span>
                  {sh.settled && <span className="text-[10px]">✓</span>}
                </div>
              ))}
              {settled && (
                <div className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider"
                  style={{ background:'rgba(16,185,129,0.12)', color:'#10B981' }}>
                  Settled
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ── Main Split page ───────────────────────────────────────────────────────────
export default function Split() {
  const { user } = useAuth();
  const navigate = useNavigate(); // used by GroupsView → GroupDetailView navigate(chat)
  const [activeTab,   setActiveTab]   = useState('balances');
  const [balances,    setBalances]    = useState([]);
  const [friends,     setFriends]     = useState([]);
  const [groups,      setGroups]      = useState([]);
  const [splits,      setSplits]      = useState([]);
  const [settleReqs,  setSettleReqs]  = useState([]);
  const [sentSettles, setSentSettles] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState(null);

  const loadAll = useCallback(async () => {
    try {
      const [bRes, fRes, gRes, sRes, siRes, ssRes] = await Promise.all([
        client.get('/splits/balances'),
        client.get('/friends'),
        client.get('/groups'),
        client.get('/splits'),
        client.get('/splits/settle/incoming'),
        client.get('/splits/settle/sent'),
      ]);
      setBalances(bRes.data);
      setFriends(fRes.data);
      setGroups(gRes.data);
      setSplits(sRes.data);
      setSettleReqs(siRes.data);
      setSentSettles(ssRes.data);
    } catch {
      // individual views show their own empty states
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Poll settle requests when Balances tab is open
  useEffect(() => {
    if (activeTab !== 'balances') return;
    const id = setInterval(() => {
      Promise.all([
        client.get('/splits/balances'),
        client.get('/splits/settle/incoming'),
        client.get('/splits/settle/sent'),
      ]).then(([bRes, siRes, ssRes]) => {
        setBalances(bRes.data);
        setSettleReqs(siRes.data);
        setSentSettles(ssRes.data);
      }).catch(() => {});
    }, 12000);
    return () => clearInterval(id);
  }, [activeTab]);

  // Refetch when tab regains focus
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') loadAll(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadAll]);

  // ── Settlement handlers ───────────────────────────────────────────────────
  async function handleSettleRequest(friendId) {
    await client.post('/splits/settle/request', { friend_user_id: friendId });
    await loadAll();
  }

  async function handleCancelSettle(requestId) {
    await client.delete(`/splits/settle/cancel/${requestId}`);
    await loadAll();
  }

  async function handleApproveSettle(requestId) {
    await client.post(`/splits/settle/approve/${requestId}`);
    await loadAll();
  }

  async function handleRejectSettle(requestId) {
    await client.post(`/splits/settle/reject/${requestId}`);
    await loadAll();
  }

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-bg pb-28">
        <TopBar showLogout />
        <div className="max-w-sm mx-auto px-4 pt-5 flex flex-col gap-5">
          <div className="h-8 w-14 rounded-xl bg-white/5 animate-pulse" />
          <div className="flex gap-2">
            {[80, 64, 72, 88, 68].map((w, i) => (
              <div key={i} style={{ width: w }} className="h-9 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
          <div className="h-44 rounded-3xl bg-white/5 animate-pulse" />
          <div className="h-20 rounded-3xl bg-white/5 animate-pulse" />
          <div className="h-20 rounded-3xl bg-white/5 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-28 page-enter">
      {toast && (
        <Toast
          key={toast.message}
          message={toast.message}
          icon={toast.icon}
          onDismiss={() => setToast(null)}
        />
      )}

      <TopBar showLogout />

      <div className="max-w-sm mx-auto px-4 pt-5 flex flex-col gap-5">
        <h1 className="font-heading text-2xl font-semibold text-text">Split</h1>

        <SubTabBar
          active={activeTab}
          onChange={setActiveTab}
          settleCount={settleReqs.length}
        />

        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
            transition={{ duration: 0.18 }}>
            {activeTab === 'balances' && (
              <BalancesView
                balances={balances}
                settleRequests={settleReqs}
                sentSettles={sentSettles}
                onSettleRequest={handleSettleRequest}
                onCancelSettle={handleCancelSettle}
                onApproveSettle={handleApproveSettle}
                onRejectSettle={handleRejectSettle}
              />
            )}
            {activeTab === 'groups' && (
              <GroupsView
                groups={groups}
                friends={friends}
                currentUser={user}
                onRefresh={loadAll}
                onToast={(message, icon) => setToast({ message, icon })}
              />
            )}
            {activeTab === 'new' && (
              <NewSplitView friends={friends} currentUser={user}
                onCreated={() => { loadAll(); setActiveTab('balances'); }} />
            )}
            {activeTab === 'history' && (
              <HistoryView splits={splits} currentUser={user} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
