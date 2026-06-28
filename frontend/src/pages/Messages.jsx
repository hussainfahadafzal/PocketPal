import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../api/client';
import TopBar from '../components/TopBar';

const PALETTE = ['#3B6CFF','#8B5CF6','#10B981','#F59E0B','#EF4444','#06B6D4','#EC4899','#F97316'];
const avatarColor = (id) => PALETTE[(id || 0) % PALETTE.length];
const initials    = (name) => (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

const SPRING = { duration: 0.44, ease: [0.22, 1, 0.36, 1] };
const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.03 } } };
const rowVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: SPRING } };

function relativeTime(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7)   return `${d}d`;
  return new Date(isoString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function truncate(text, len = 38) {
  if (!text) return '';
  return text.length > len ? text.slice(0, len) + '…' : text;
}

export default function Messages() {
  const navigate = useNavigate();
  const [convos,   setConvos]  = useState([]);
  const [loading,  setLoading] = useState(true);
  const [search,   setSearch]  = useState('');

  const load = useCallback(async () => {
    const res = await client.get('/chat/conversations').catch(() => null);
    if (res) {
      setConvos(res.data);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [load]);

  const filtered = convos.filter((c) =>
    c.friend.name.toLowerCase().includes(search.toLowerCase()) ||
    c.friend.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-bg pb-28 page-enter">
      <TopBar />

      <div className="max-w-sm mx-auto px-4 pt-5 flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-text">Messages</h1>
            {!loading && convos.length > 0 && (
              <p className="text-muted/50 text-xs mt-0.5">{convos.length} conversation{convos.length !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search conversations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl text-text text-sm outline-none transition-all placeholder:text-muted/35"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1,2,3,4].map((i) => (
              <div key={i} className="h-[76px] rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>

        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}
            className="flex flex-col items-center gap-4 py-16 text-center">
            {convos.length === 0 ? (
              <>
                <span className="text-5xl">💬</span>
                <div>
                  <p className="text-text font-bold text-base">No conversations yet</p>
                  <p className="text-muted/60 text-sm mt-1.5 leading-relaxed max-w-[200px] mx-auto">
                    Add friends first — then message them here
                  </p>
                </div>
                <motion.button whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/friends')}
                  className="px-5 py-2.5 rounded-2xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#3B6CFF,#8B5CF6)' }}>
                  Add friends
                </motion.button>
              </>
            ) : (
              <>
                <span className="text-4xl">🔍</span>
                <p className="text-muted/60 text-sm">No matches for "{search}"</p>
              </>
            )}
          </motion.div>

        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-2">
            {filtered.map((c) => {
              const f        = c.friend;
              const color    = avatarColor(f.id);
              const hasNew   = c.unread_count > 0;
              const preview  = c.last_message
                ? (c.last_message_mine ? `You: ${truncate(c.last_message, 30)}` : truncate(c.last_message, 36))
                : 'Tap to start chatting';

              return (
                <motion.button
                  key={f.id}
                  variants={rowVariants}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/chat/${f.id}`, { state: { friendName: f.name } })}
                  className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-left w-full transition-all"
                  style={{
                    background: hasNew ? 'rgba(139,92,246,0.08)' : 'rgba(13,18,37,0.85)',
                    border: hasNew ? '1px solid rgba(139,92,246,0.25)' : '1px solid rgba(30,45,78,0.6)',
                  }}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-sm select-none"
                      style={{ background: `linear-gradient(135deg,${color},${color}bb)`, boxShadow: `0 3px 12px ${color}44` }}
                    >
                      {initials(f.name)}
                    </div>
                    {hasNew && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-bg"
                        style={{ background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)' }} />
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={`text-sm truncate ${hasNew ? 'text-text font-bold' : 'text-text/85 font-semibold'}`}>
                        {f.name}
                      </p>
                      {c.last_message_at && (
                        <span className={`text-[11px] shrink-0 ${hasNew ? 'text-purple-400' : 'text-muted/40'}`}>
                          {relativeTime(c.last_message_at)}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs truncate ${hasNew ? 'text-text/70 font-medium' : 'text-muted/45'}`}>
                      {preview}
                    </p>
                  </div>

                  {/* Badge or chevron */}
                  {hasNew ? (
                    <AnimatePresence>
                      <motion.span
                        initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        className="h-6 min-w-6 px-1.5 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0"
                        style={{ background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)', boxShadow: '0 2px 8px rgba(139,92,246,0.5)' }}>
                        {c.unread_count > 9 ? '9+' : c.unread_count}
                      </motion.span>
                    </AnimatePresence>
                  ) : (
                    <svg className="w-4 h-4 text-muted/25 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}

      </div>
    </div>
  );
}
