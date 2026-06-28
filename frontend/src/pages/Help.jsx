import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const SPRING = { duration: 0.45, ease: [0.22, 1, 0.36, 1] };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: SPRING } };

const FAQ = [
  {
    q: 'How is my PocketScore calculated?',
    a: 'PocketScore (0–850) combines four signals: budget discipline (max 300 pts), saving behaviour (250 pts), streak length (200 pts), and staying within category caps (100 pts). It recalculates each time you open the Score tab.',
  },
  {
    q: 'How do I add an expense?',
    a: 'Tap the + button on any screen to open the Add Expense sheet. Pick a category, enter the amount, add an optional note, and tap Save. The dashboard updates instantly.',
  },
  {
    q: 'What is the Savings Jar?',
    a: 'The Savings Jar automatically collects round-up spare change from every expense (e.g. ₹47 rounds up to ₹50, saving ₹3). Enable round-ups in the Jar tab. When your streak hits 7+ days, round-ups are doubled.',
  },
  {
    q: 'How does the streak work?',
    a: 'You earn a streak day whenever total spending that day stays under your daily limit. Missing a day resets the streak to 0. A 7-day unbroken streak activates 2× round-up savings.',
  },
  {
    q: 'Can I change my budget cycle?',
    a: 'Yes — go to Profile → Edit Profile → Budget section. Pick a new refill date or set an N-day cycle. Changing the cycle resets it from today, so your daily limit is recalculated.',
  },
  {
    q: 'How do I split expenses with friends?',
    a: 'Open the Split tab. Create a group, add friends via invite code or email, then log a split expense. Choose equal shares or set custom amounts. PocketPal tracks who owes whom and lets you settle up with one tap.',
  },
  {
    q: 'What happens when I hit my savings goal?',
    a: "Once your Savings Jar reaches 100% of its goal, you'll see a completion banner. You can then set a new goal or keep saving. The jar amount isn't automatically spent — it's just a tracker.",
  },
  {
    q: 'Is my data private?',
    a: 'All your financial data is stored on secure servers and tied to your account only. We never share or sell your data. You can delete your entire account and all data from Profile → Delete Account.',
  },
];

function AccordionItem({ q, a, open, onToggle, index }) {
  return (
    <motion.div variants={fadeUp} className="border-b last:border-b-0" style={{ borderColor: 'rgba(30,45,78,0.4)' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <span className="text-sm font-medium text-text leading-snug">{q}</span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="shrink-0 text-muted/50 text-xl leading-none"
        >
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="text-muted text-sm leading-relaxed px-4 pb-4">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Help() {
  const navigate = useNavigate();
  const [openIdx, setOpenIdx] = useState(null);

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
          <span className="font-heading font-semibold text-text text-base flex-1">Help & Support</span>
        </div>
      </div>

      <motion.div className="max-w-sm mx-auto px-4 pt-6 flex flex-col gap-5" variants={container} initial="hidden" animate="show">
        <motion.div variants={fadeUp}>
          <p className="text-muted/55 text-sm mb-4 leading-relaxed">Answers to the most common questions about PocketPal.</p>
          <div className="rounded-3xl overflow-hidden"
            style={{ background: 'rgba(13,18,37,0.90)', border: '1px solid rgba(30,45,78,0.55)' }}
          >
            {FAQ.map((item, i) => (
              <AccordionItem
                key={i} index={i} q={item.q} a={item.a}
                open={openIdx === i}
                onToggle={() => setOpenIdx(openIdx === i ? null : i)}
              />
            ))}
          </div>
        </motion.div>

        <motion.div variants={fadeUp}
          className="rounded-3xl p-5 flex flex-col gap-3"
          style={{ background: 'linear-gradient(135deg,rgba(59,108,255,0.08) 0%,rgba(139,92,246,0.06) 100%)', border: '1px solid rgba(59,108,255,0.18)' }}
        >
          <p className="text-sm font-semibold text-text">Still need help?</p>
          <p className="text-muted/70 text-sm leading-relaxed">
            Drop us a message and we'll get back to you within 24 hours.
          </p>
          <a
            href="mailto:support@pocketpal.app"
            className="text-sm font-medium text-primary hover:underline"
          >
            support@pocketpal.app →
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
}
