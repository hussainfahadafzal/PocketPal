import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

export default function TopBar() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [friendBadge,  setFriendBadge]  = useState(0);
  const [settleBadge,  setSettleBadge]  = useState(0);
  const [msgBadge,     setMsgBadge]     = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function fetchBadges() {
      const [fRes, sRes, mRes] = await Promise.allSettled([
        client.get('/friends/requests'),
        client.get('/splits/settle/incoming'),
        client.get('/chat/unread-count'),
      ]);
      if (!cancelled) {
        if (fRes.status === 'fulfilled') setFriendBadge(fRes.value.data.length);
        if (sRes.status === 'fulfilled') setSettleBadge(sRes.value.data.length);
        if (mRes.status === 'fulfilled') setMsgBadge(mRes.value.data.count ?? 0);
      }
    }

    fetchBadges();
    const id = setInterval(fetchBadges, 30000);
    const onVisible = () => { if (document.visibilityState === 'visible') fetchBadges(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user]);

  const totalBadge = friendBadge + settleBadge;
  const onFriends  = location.pathname === '/friends';
  const onMessages = location.pathname === '/messages';

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: 'rgba(7,9,26,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div className="max-w-sm mx-auto px-4 h-14 flex items-center justify-between">

        {/* Gradient wordmark */}
        <button onClick={() => navigate('/dashboard')}
          className="font-display font-black text-[17px] tracking-tight select-none"
          style={{
            background: 'linear-gradient(135deg, #3B6CFF 0%, #8B5CF6 60%, #06B6D4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
          PocketPal
        </button>

        {user && (
          <div className="flex items-center gap-1">

            {/* Friends icon */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => navigate('/friends')}
              className="relative h-10 w-10 rounded-2xl flex items-center justify-center transition-colors duration-150"
              style={{
                background: onFriends ? 'rgba(59,108,255,0.18)' : 'transparent',
                color: onFriends ? '#3B6CFF' : '#7A8BAD',
              }}
            >
              <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor"
                strokeWidth={onFriends ? 2.4 : 1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              {totalBadge > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 h-[18px] min-w-[18px] px-1 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                  style={{ background: 'linear-gradient(135deg,#F97316,#EF4444)', boxShadow: '0 2px 6px rgba(249,115,22,0.5)' }}>
                  {totalBadge > 9 ? '9+' : totalBadge}
                </motion.span>
              )}
            </motion.button>

            {/* Messages / Chat icon */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => navigate('/messages')}
              className="relative h-10 w-10 rounded-2xl flex items-center justify-center transition-colors duration-150"
              style={{
                background: onMessages ? 'rgba(139,92,246,0.18)' : 'transparent',
                color: onMessages ? '#8B5CF6' : '#7A8BAD',
              }}
            >
              <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor"
                strokeWidth={onMessages ? 2.4 : 1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {msgBadge > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 h-[18px] min-w-[18px] px-1 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                  style={{ background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)', boxShadow: '0 2px 6px rgba(139,92,246,0.55)' }}>
                  {msgBadge > 9 ? '9+' : msgBadge}
                </motion.span>
              )}
            </motion.button>

          </div>
        )}
      </div>
    </header>
  );
}
