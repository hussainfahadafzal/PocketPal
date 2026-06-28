import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import TopBar from '../components/TopBar';

const PALETTE = ['#3B6CFF','#8B5CF6','#10B981','#F59E0B','#EF4444','#06B6D4','#EC4899','#F97316'];
const avatarColor = (id) => PALETTE[(id || 0) % PALETTE.length];
const initials    = (name) => (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

const SPRING = { duration: 0.44, ease: [0.22, 1, 0.36, 1] };
const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.03 } } };
const rowVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: SPRING } };

export default function Messages() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [friends, setFriends]  = useState([]);
  const [loading, setLoading]  = useState(true);
  const [search,  setSearch]   = useState('');

  useEffect(() => {
    client.get('/friends')
      .then((r) => setFriends(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = friends.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-bg pb-28 page-enter">
      <TopBar />

      <div className="max-w-sm mx-auto px-4 pt-5 flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-semibold text-text">Messages</h1>
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
            placeholder="Search friends…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl text-text text-sm outline-none transition-all placeholder:text-muted/35"
            style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.07)' }}
          />
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1,2,3,4].map((i) => (
              <div key={i} className="h-[72px] rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={SPRING}
            className="flex flex-col items-center gap-4 py-16 text-center">
            {friends.length === 0 ? (
              <>
                <span className="text-5xl">💬</span>
                <div>
                  <p className="text-text font-bold text-base">No conversations yet</p>
                  <p className="text-muted/60 text-sm mt-1.5 leading-relaxed max-w-[200px] mx-auto">
                    Add friends first — then message them here
                  </p>
                </div>
                <motion.button whileTap={{ scale:0.95 }}
                  onClick={() => navigate('/friends')}
                  className="px-5 py-2.5 rounded-2xl text-sm font-bold text-white"
                  style={{ background:'linear-gradient(135deg,#3B6CFF,#8B5CF6)' }}>
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
            {filtered.map((f) => {
              const c = avatarColor(f.id);
              return (
                <motion.button key={f.id} variants={rowVariants}
                  whileTap={{ scale:0.98 }}
                  onClick={() => navigate(`/chat/${f.id}`, { state: { friendName: f.name } })}
                  className="flex items-center gap-4 p-4 rounded-2xl text-left w-full transition-all"
                  style={{ background:'rgba(13,18,37,0.85)', border:'1px solid rgba(30,45,78,0.6)' }}>

                  {/* Avatar with online-style ring */}
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-sm select-none"
                      style={{ background:`linear-gradient(135deg,${c},${c}bb)`, boxShadow:`0 3px 12px ${c}44` }}>
                      {initials(f.name)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-text font-semibold text-sm truncate">{f.name}</p>
                    <p className="text-muted/50 text-xs truncate mt-0.5">Tap to start chatting</p>
                  </div>

                  {/* Arrow */}
                  <svg className="w-4 h-4 text-muted/25 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.button>
              );
            })}
          </motion.div>
        )}

      </div>
    </div>
  );
}
