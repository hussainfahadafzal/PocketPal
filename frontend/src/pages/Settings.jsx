import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CURRENCY_KEY, DATE_FORMAT_KEY } from '../utils/format';

const SPRING = { duration: 0.45, ease: [0.22, 1, 0.36, 1] };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.03 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: SPRING } };

const CURRENCIES = [
  { symbol: '₹', label: 'Indian Rupee', sublabel: 'INR · ₹' },
  { symbol: '$', label: 'US Dollar',    sublabel: 'USD · $' },
  { symbol: '£', label: 'British Pound',sublabel: 'GBP · £' },
  { symbol: '€', label: 'Euro',         sublabel: 'EUR · €' },
  { symbol: '¥', label: 'Japanese Yen', sublabel: 'JPY · ¥' },
  { symbol: 'AED', label: 'UAE Dirham', sublabel: 'AED' },
];

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', example: '28/06/2026' },
  { value: 'MM/DD/YYYY', example: '06/28/2026' },
  { value: 'YYYY-MM-DD', example: '2026-06-28' },
  { value: 'D MMM YYYY', example: '28 Jun 2026' },
];

function OptionRow({ selected, onSelect, children }) {
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center justify-between px-4 py-3.5 text-left active:opacity-70 transition-opacity"
    >
      {children}
      <span
        className="h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-150"
        style={selected
          ? { borderColor: '#3B6CFF', background: 'linear-gradient(135deg,#3B6CFF,#8B5CF6)' }
          : { borderColor: 'rgba(255,255,255,0.15)', background: 'transparent' }
        }
      >
        {selected && <span className="h-2 w-2 rounded-full bg-white" />}
      </span>
    </button>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const [currency,   setCurrencyState]   = useState(() => localStorage.getItem(CURRENCY_KEY)    || '₹');
  const [dateFormat, setDateFormatState] = useState(() => localStorage.getItem(DATE_FORMAT_KEY) || 'DD/MM/YYYY');

  const setCurrency = (sym) => {
    setCurrencyState(sym);
    localStorage.setItem(CURRENCY_KEY, sym);
  };

  const setDateFormat = (fmt) => {
    setDateFormatState(fmt);
    localStorage.setItem(DATE_FORMAT_KEY, fmt);
  };

  return (
    <div className="min-h-screen bg-bg pb-16 page-enter" style={{ paddingTop: 'env(safe-area-inset-top,0px)' }}>
      {/* Header */}
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
          <span className="font-heading font-semibold text-text text-base flex-1">Settings</span>
        </div>
      </div>

      <motion.div className="max-w-sm mx-auto px-4 pt-6 flex flex-col gap-5" variants={container} initial="hidden" animate="show">

        {/* Currency */}
        <motion.div variants={fadeUp} className="flex flex-col gap-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted/40 px-1">Currency</p>
          <div className="rounded-3xl overflow-hidden divide-y"
            style={{ background: 'rgba(13,18,37,0.90)', border: '1px solid rgba(30,45,78,0.55)', divideColor: 'rgba(30,45,78,0.4)' }}
          >
            {CURRENCIES.map((c) => (
              <OptionRow key={c.symbol} selected={currency === c.symbol} onSelect={() => setCurrency(c.symbol)}>
                <div>
                  <p className="text-sm font-medium text-text">{c.label}</p>
                  <p className="text-xs text-muted/55 mt-0.5">{c.sublabel}</p>
                </div>
              </OptionRow>
            ))}
          </div>
        </motion.div>

        {/* Date format */}
        <motion.div variants={fadeUp} className="flex flex-col gap-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted/40 px-1">Date format</p>
          <div className="rounded-3xl overflow-hidden divide-y"
            style={{ background: 'rgba(13,18,37,0.90)', border: '1px solid rgba(30,45,78,0.55)', divideColor: 'rgba(30,45,78,0.4)' }}
          >
            {DATE_FORMATS.map((d) => (
              <OptionRow key={d.value} selected={dateFormat === d.value} onSelect={() => setDateFormat(d.value)}>
                <div>
                  <p className="text-sm font-medium text-text">{d.value}</p>
                  <p className="text-xs text-muted/55 mt-0.5">e.g. {d.example}</p>
                </div>
              </OptionRow>
            ))}
          </div>
        </motion.div>

        <motion.p variants={fadeUp} className="text-muted/40 text-xs text-center leading-relaxed px-4">
          Settings are saved on this device. Changing currency only affects how amounts are displayed — it does not convert your existing data.
        </motion.p>
      </motion.div>
    </div>
  );
}
