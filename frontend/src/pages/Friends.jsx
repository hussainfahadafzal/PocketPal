import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import TopBar from '../components/TopBar';
import Toast from '../components/Toast';

const PALETTE = ['#3B6CFF','#8B5CF6','#10B981','#F59E0B','#EF4444','#06B6D4','#EC4899','#F97316'];
const avatarColor = (id) => PALETTE[(id || 0) % PALETTE.length];
const initials    = (name) => (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

function Avatar({ name, id, size = 'md' }) {
  const c  = avatarColor(id);
  const sz = size === 'lg' ? 'w-12 h-12 text-base' : size === 'sm' ? 'w-7 h-7 text-[11px]' : 'w-10 h-10 text-sm';
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-bold text-white shrink-0 select-none`}
      style={{ background: `linear-gradient(135deg,${c},${c}bb)`, boxShadow: `0 2px 8px ${c}55` }}>
      {initials(name)}
    </div>
  );
}

const SPRING = { duration: 0.48, ease: [0.22, 1, 0.36, 1] };
const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.03 } } };
const cardVariants = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: SPRING } };

export default function Friends() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [friends,      setFriends]      = useState([]);
  const [requests,     setRequests]     = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [toast,        setToast]        = useState(null);
  const [mode,         setMode]         = useState('email');
  const [input,        setInput]        = useState('');
  const [adding,       setAdding]       = useState(false);
  const [addError,     setAddError]     = useState('');
  const [responding,   setResponding]   = useState(null);
  const [cancelling,   setCancelling]   = useState(null);
  const [copied,       setCopied]       = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [fRes, rRes, srRes] = await Promise.all([
        client.get('/friends'),
        client.get('/friends/requests'),
        client.get('/friends/requests/sent'),
      ]);
      setFriends(fRes.data);
      setRequests(rRes.data);
      setSentRequests(srRes.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const id = setInterval(loadAll, 12000);
    const onVisible = () => { if (document.visibilityState === 'visible') loadAll(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [loadAll]);

  async function sendRequest() {
    if (!input.trim()) return;
    setAdding(true); setAddError('');
    try {
      const res = await client.post('/friends/request',
        mode === 'email' ? { email: input.trim() } : { invite_code: input.trim().toUpperCase() }
      );
      const name = res.data?.addressee?.name || input.trim();
      setToast({ message: `Request sent to ${name} 👋`, icon: '' });
      setInput('');
      loadAll();
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
      if (action === 'accept') setToast({ message: `You're now friends with ${req.requester.name}! 🎉`, icon: '' });
      loadAll();
    } catch {}
    finally { setResponding(null); }
  }

  async function cancelRequest(req) {
    setCancelling(req.id);
    try { await client.post(`/friends/cancel/${req.id}`); loadAll(); } catch {}
    finally { setCancelling(null); }
  }

  function copyCode() {
    if (!user?.invite_code) return;
    navigator.clipboard.writeText(user.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg pb-28">
        <TopBar />
        <div className="max-w-sm mx-auto px-4 pt-5 flex flex-col gap-4">
          <div className="h-8 w-20 rounded-xl bg-white/5 animate-pulse" />
          <div className="h-28 rounded-3xl bg-white/5 animate-pulse" />
          <div className="h-36 rounded-3xl bg-white/5 animate-pulse" />
          <div className="h-20 rounded-2xl bg-white/5 animate-pulse" />
          <div className="h-20 rounded-2xl bg-white/5 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-28 page-enter">
      {toast && <Toast key={toast.message} message={toast.message} icon={toast.icon} onDismiss={() => setToast(null)} />}
      <TopBar />

      <div className="max-w-sm mx-auto px-4 pt-5 flex flex-col gap-5">
        <h1 className="font-heading text-2xl font-semibold text-text">Friends</h1>

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-5">

          {/* Your invite code */}
          {user?.invite_code && (
            <motion.div variants={cardVariants} className="rounded-3xl p-5"
              style={{ background:'rgba(13,18,37,0.85)', border:'1px solid rgba(59,108,255,0.2)' }}>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted mb-3">Your invite code</p>
              <div className="flex items-center justify-between">
                <p className="font-mono font-black text-3xl tracking-wider"
                  style={{ background:'linear-gradient(135deg,#3B6CFF,#8B5CF6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                  {user.invite_code}
                </p>
                <motion.button whileTap={{ scale:0.92 }} onClick={copyCode}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                  style={{ background: copied ? 'rgba(16,185,129,0.18)' : 'rgba(59,108,255,0.14)', color: copied ? '#10B981' : '#3B6CFF' }}>
                  {copied ? 'Copied!' : 'Copy'}
                </motion.button>
              </div>
              <p className="text-muted/60 text-xs mt-2">Share this so friends can add you</p>
            </motion.div>
          )}

          {/* Add friend */}
          <motion.div variants={cardVariants} className="rounded-3xl p-5"
            style={{ background:'rgba(13,18,37,0.85)', border:'1px solid rgba(30,45,78,0.6)' }}>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted mb-4">Add a friend</p>
            <div className="flex gap-2 mb-4">
              {[{ id:'email', label:'Email' }, { id:'code', label:'Invite Code' }].map((m) => (
                <button key={m.id} onClick={() => { setMode(m.id); setInput(''); setAddError(''); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${mode === m.id ? 'text-white' : 'text-muted'}`}
                  style={mode === m.id ? { background:'linear-gradient(135deg,#3B6CFF,#8B5CF6)' } : { background:'rgba(30,45,78,0.55)' }}>
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
              <motion.button whileTap={{ scale:0.93 }} onClick={sendRequest}
                disabled={adding || !input.trim()}
                className="px-5 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-40 min-h-[48px] min-w-[56px]"
                style={{ background:'linear-gradient(135deg,#3B6CFF,#8B5CF6)' }}>
                {adding ? '…' : 'Add'}
              </motion.button>
            </div>
            <AnimatePresence>
              {addError && (
                <motion.p key="e" initial={{ opacity:0,y:-4 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}
                  className="text-danger text-xs mt-2">{addError}</motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Incoming friend requests */}
          {requests.length > 0 && (
            <motion.div variants={cardVariants} className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <p className="text-xs font-black uppercase tracking-[0.14em]" style={{ color:'#F97316' }}>
                  Friend Requests
                </p>
                <span className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                  style={{ background:'linear-gradient(135deg,#F97316,#EF4444)' }}>
                  {requests.length}
                </span>
              </div>
              {requests.map((req) => (
                <motion.div key={req.id}
                  initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }}
                  className="rounded-2xl p-3.5 flex items-center gap-3 min-h-[64px]"
                  style={{ background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.22)' }}>
                  <Avatar name={req.requester.name} id={req.requester.id} />
                  <div className="flex-1 min-w-0">
                    <p className="text-text font-semibold text-sm truncate">{req.requester.name}</p>
                    <p className="text-muted text-xs truncate">{req.requester.email}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <motion.button whileTap={{ scale:0.92 }} onClick={() => respond(req,'accept')} disabled={responding === req.id}
                      className="px-3.5 min-h-[44px] rounded-xl flex items-center gap-1.5 text-xs font-bold"
                      style={{ background:'rgba(16,185,129,0.2)', color:'#10B981' }}>
                      {responding === req.id ? '…' : '✓ Accept'}
                    </motion.button>
                    <motion.button whileTap={{ scale:0.92 }} onClick={() => respond(req,'reject')} disabled={responding === req.id}
                      className="w-11 min-h-[44px] rounded-xl flex items-center justify-center text-sm"
                      style={{ background:'rgba(239,68,68,0.12)', color:'#EF4444' }}>✕</motion.button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Sent requests */}
          {sentRequests.length > 0 && (
            <motion.div variants={cardVariants} className="flex flex-col gap-2.5">
              <p className="text-xs font-black uppercase tracking-[0.14em]" style={{ color:'#8B5CF6' }}>
                Sent Requests · {sentRequests.length}
              </p>
              {sentRequests.map((req) => (
                <motion.div key={req.id}
                  initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }}
                  className="rounded-2xl p-3.5 flex items-center gap-3 min-h-[64px]"
                  style={{ background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.22)' }}>
                  <Avatar name={req.addressee.name} id={req.addressee.id} />
                  <div className="flex-1 min-w-0">
                    <p className="text-text font-semibold text-sm truncate">{req.addressee.name}</p>
                    <p className="text-muted text-xs truncate">{req.addressee.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg"
                      style={{ background:'rgba(139,92,246,0.18)', color:'#A78BFA' }}>
                      Pending
                    </span>
                    <motion.button whileTap={{ scale:0.92 }} onClick={() => cancelRequest(req)} disabled={cancelling === req.id}
                      className="text-xs font-semibold px-3 py-2 min-h-[36px] rounded-lg"
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
                  initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }} transition={{ delay: i * 0.05 }}
                  className="rounded-2xl p-3.5 flex items-center gap-3 min-h-[64px]"
                  style={{ background:'rgba(13,18,37,0.85)', border:'1px solid rgba(30,45,78,0.6)' }}>
                  <Avatar name={f.name} id={f.id} />
                  <div className="flex-1 min-w-0">
                    <p className="text-text font-semibold text-sm truncate">{f.name}</p>
                    <p className="text-muted text-xs truncate">{f.email}</p>
                  </div>
                  <motion.button
                    whileTap={{ scale:0.9 }}
                    onClick={() => navigate(`/chat/${f.id}`, { state: { friendName: f.name } })}
                    className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background:'rgba(139,92,246,0.15)', color:'#8B5CF6' }}>
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
      </div>
    </div>
  );
}
