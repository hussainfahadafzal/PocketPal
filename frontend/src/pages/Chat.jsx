import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../api/client';

const PALETTE = ['#3B6CFF','#8B5CF6','#10B981','#F59E0B','#EF4444','#06B6D4','#EC4899','#F97316'];
function friendColor(id) { return PALETTE[(id || 0) % PALETTE.length]; }
function getInitials(name = '') {
  return name.trim().split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase();
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function formatDate(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString())     return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function groupByDate(messages) {
  const groups = [];
  let lastDate = null;
  for (const m of messages) {
    const d = new Date(m.created_at).toDateString();
    if (d !== lastDate) { groups.push({ type: 'divider', label: formatDate(m.created_at), key: `div-${m.id}` }); lastDate = d; }
    groups.push({ type: 'message', data: m, key: m.id });
  }
  return groups;
}

export default function Chat() {
  const { friendId }  = useParams();
  const { state }     = useLocation();
  const navigate      = useNavigate();
  const friendName    = state?.friendName || 'Friend';
  const friendIdNum   = Number(friendId);
  const color         = friendColor(friendIdNum);

  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [sending,   setSending]   = useState(false);
  const [loading,   setLoading]   = useState(true);

  const lastIdRef   = useRef(0);
  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const intervalRef = useRef(null);

  const scrollToBottom = (smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  };

  const fetchNew = useCallback(async () => {
    try {
      const r = await client.get(`/chat/${friendId}?since_id=${lastIdRef.current}`);
      if (r.data.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const fresh = r.data.filter((m) => !existingIds.has(m.id));
          return fresh.length ? [...prev, ...fresh] : prev;
        });
        lastIdRef.current = r.data[r.data.length - 1].id;
      }
    } catch {}
  }, [friendId]);

  // Initial load
  useEffect(() => {
    client.get(`/chat/${friendId}`)
      .then((r) => {
        setMessages(r.data);
        if (r.data.length > 0) lastIdRef.current = r.data[r.data.length - 1].id;
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [friendId]);

  // Poll every 3s when visible
  useEffect(() => {
    intervalRef.current = setInterval(fetchNew, 3000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchNew();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchNew]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom(!loading);
  }, [messages, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);

    // Optimistic
    const tempId = -Date.now();
    const optimistic = {
      id: tempId, sender_id: -1, receiver_id: friendIdNum,
      sender_name: 'You', content: text, created_at: new Date().toISOString(), is_mine: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const r = await client.post(`/chat/${friendId}`, { content: text });
      // Replace optimistic with real
      setMessages((prev) => prev.map((m) => (m.id === tempId ? r.data : m)));
      lastIdRef.current = Math.max(lastIdRef.current, r.data.id);
    } catch {
      // Remove optimistic on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const items = groupByDate(messages);

  return (
    <div className="flex flex-col bg-bg" style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top,0px)' }}>

      {/* Header */}
      <div className="shrink-0 border-b border-white/5"
        style={{ background: 'rgba(7,9,26,0.95)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
      >
        <div className="max-w-sm mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/split', { state: { tab: 'friends' } })}
            className="h-8 w-8 flex items-center justify-center rounded-xl text-muted/60 hover:text-muted transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Friend avatar */}
          <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0 select-none"
            style={{ background: `linear-gradient(135deg,${color},${color}99)`, boxShadow: `0 2px 10px ${color}44` }}
          >
            {getInitials(friendName)}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-text text-sm leading-tight truncate">{friendName}</p>
            <p className="text-[10px] text-muted/40 leading-none mt-0.5">Direct message</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overscroll-contain" style={{ paddingBottom: '0.5rem' }}>
        <div className="max-w-sm mx-auto px-4 pt-4 flex flex-col gap-1">

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-7 h-7 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4 py-16 text-center"
            >
              <span className="text-5xl">👋</span>
              <div>
                <p className="font-bold text-text text-base">Say hi to start the conversation</p>
                <p className="text-muted/50 text-sm mt-1.5 leading-relaxed max-w-[200px] mx-auto">
                  No messages yet — kick things off!
                </p>
              </div>
            </motion.div>
          ) : (
            <AnimatePresence initial={false}>
              {items.map((item) =>
                item.type === 'divider' ? (
                  <div key={item.key} className="flex items-center gap-3 py-3">
                    <div className="flex-1 h-px bg-white/5" />
                    <span className="text-[10px] font-semibold text-muted/35 shrink-0">{item.label}</span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                ) : (
                  <motion.div
                    key={item.key}
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className={`flex ${item.data.is_mine ? 'justify-end' : 'justify-start'} mb-0.5`}
                  >
                    <div className="max-w-[76%]">
                      <div
                        className="px-3.5 py-2.5 rounded-2xl text-sm leading-snug"
                        style={item.data.is_mine
                          ? { background: 'linear-gradient(135deg,#3B6CFF,#8B5CF6)', color: '#fff',
                              borderBottomRightRadius: '6px', boxShadow: '0 2px 12px rgba(59,108,255,0.30)' }
                          : { background: 'rgba(255,255,255,0.06)', color: '#E8EAF0',
                              borderBottomLeftRadius: '6px' }
                        }
                      >
                        {item.data.content}
                      </div>
                      <p className={`text-[10px] text-muted/30 mt-1 ${item.data.is_mine ? 'text-right' : 'text-left'} px-1`}>
                        {formatTime(item.data.created_at)}
                      </p>
                    </div>
                  </motion.div>
                )
              )}
            </AnimatePresence>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-white/5"
        style={{
          background: 'rgba(10,14,30,0.97)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          paddingBottom: 'max(1rem,env(safe-area-inset-bottom,0px))',
        }}
      >
        <div className="max-w-sm mx-auto px-4 py-3 flex items-end gap-3">
          <div className="flex-1 rounded-2xl px-4 py-3 min-h-[48px] flex items-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="Message…"
              className="w-full bg-transparent outline-none text-text text-sm resize-none placeholder:text-muted/35 leading-snug"
              style={{ maxHeight: '120px', overflowY: 'auto' }}
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="h-12 w-12 rounded-2xl shrink-0 flex items-center justify-center disabled:opacity-35 transition-opacity"
            style={{ background: 'linear-gradient(135deg,#3B6CFF,#8B5CF6)', boxShadow: input.trim() ? '0 4px 16px rgba(59,108,255,0.4)' : 'none' }}
          >
            {sending ? (
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <svg className="w-5 h-5 text-white translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
