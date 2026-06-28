import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const SPRING = { duration: 0.45, ease: [0.22, 1, 0.36, 1] };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.03 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: SPRING } };

const FEATURES = [
  { icon: '📊', label: 'Smart budgeting',    desc: 'Daily spend limits that adapt to your cycle' },
  { icon: '🔥', label: 'Streak tracking',     desc: 'Stay consistent and earn 2× savings bonuses' },
  { icon: '💰', label: 'Savings Jar',         desc: 'Auto round-up spare change into savings' },
  { icon: '🤝', label: 'Split expenses',      desc: 'Split bills fairly with friends and groups' },
  { icon: '⭐', label: 'PocketScore',         desc: 'Your personal financial health index, 0–850' },
  { icon: '🎯', label: 'Goals',               desc: 'Track savings targets side by side' },
];

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg pb-16 page-enter" style={{ paddingTop: 'env(safe-area-inset-top,0px)' }}>
      <div className="sticky top-0 z-40 border-b border-border/30"
        style={{ background: 'rgba(7,9,26,0.90)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', paddingTop: 'env(safe-area-inset-top,0px)' }}
      >
        <div className="max-w-sm mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/profile')}
            className="h-8 w-8 flex items-center justify-center rounded-xl text-muted hover:text-text transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-heading font-semibold text-text text-base flex-1">About PocketPal</span>
        </div>
      </div>

      <motion.div className="max-w-sm mx-auto px-4 pt-6 flex flex-col gap-5" variants={container} initial="hidden" animate="show">

        {/* Brand hero */}
        <motion.div variants={fadeUp} className="flex flex-col items-center gap-3 py-4">
          <div
            className="h-20 w-20 rounded-3xl flex items-center justify-center text-4xl shadow-lg"
            style={{ background: 'linear-gradient(135deg,#3B6CFF 0%,#8B5CF6 100%)', boxShadow: '0 16px 40px rgba(59,108,255,0.35)' }}
          >
            💸
          </div>
          <div className="text-center">
            <h1
              className="font-display font-bold text-3xl tracking-tight"
              style={{ background: 'linear-gradient(135deg,#3B6CFF,#8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
            >
              PocketPal
            </h1>
            <p className="text-muted text-sm mt-0.5">Spend Smart, Save Sharp.</p>
            <p
              className="text-xs font-semibold mt-2 px-3 py-1 rounded-full inline-block"
              style={{ background: 'rgba(59,108,255,0.12)', color: '#3B6CFF' }}
            >
              Version 1.0
            </p>
          </div>
        </motion.div>

        {/* About blurb */}
        <motion.div variants={fadeUp}
          className="rounded-3xl p-5"
          style={{ background: 'rgba(13,18,37,0.90)', border: '1px solid rgba(30,45,78,0.55)' }}
        >
          <p className="text-muted text-sm leading-relaxed">
            PocketPal is a personal finance companion built for students and young professionals in India. Track daily spending, build saving habits through streaks and goals, split bills with friends, and watch your PocketScore grow.
          </p>
        </motion.div>

        {/* Features */}
        <motion.div variants={fadeUp} className="flex flex-col gap-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted/40 px-1">What's inside</p>
          <div className="rounded-3xl overflow-hidden divide-y"
            style={{ background: 'rgba(13,18,37,0.90)', border: '1px solid rgba(30,45,78,0.55)', divideColor: 'rgba(30,45,78,0.4)' }}
          >
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-center gap-3.5 px-4 py-3.5">
                <span className="text-xl leading-none shrink-0">{f.icon}</span>
                <div>
                  <p className="text-sm font-medium text-text leading-tight">{f.label}</p>
                  <p className="text-xs text-muted/55 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Links */}
        <motion.div variants={fadeUp} className="flex flex-col gap-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted/40 px-1">Links</p>
          <div className="rounded-3xl overflow-hidden divide-y"
            style={{ background: 'rgba(13,18,37,0.90)', border: '1px solid rgba(30,45,78,0.55)', divideColor: 'rgba(30,45,78,0.4)' }}
          >
            {[
              { label: 'Report a bug', href: 'mailto:bugs@pocketpal.app', icon: '🐛' },
              { label: 'Privacy Policy', href: '#', icon: '🔐' },
              { label: 'Terms of Service', href: '#', icon: '📜' },
            ].map(({ label, href, icon }) => (
              <a key={label} href={href}
                className="flex items-center gap-3.5 px-4 py-3.5 active:opacity-60 transition-opacity"
              >
                <span className="text-base leading-none">{icon}</span>
                <span className="text-sm font-medium text-text flex-1">{label}</span>
                <svg className="w-4 h-4 text-muted/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            ))}
          </div>
        </motion.div>

        <motion.p variants={fadeUp} className="text-muted/35 text-xs text-center pb-4">
          © 2026 PocketPal · Made with ❤️ in India
        </motion.p>
      </motion.div>
    </div>
  );
}
