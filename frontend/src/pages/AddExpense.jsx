import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import Button from '../components/Button';
import Card from '../components/Card';

const UPI_LS_KEY = 'pocketpal_upi';

function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1;
}

// Normalise a phone number or VPA input into a UPI VPA string.
// 10-digit numbers (with or without +91 / 91 prefix) → digits@upi.
// Anything else is returned as-is (assumed to already be a VPA).
function toUpiId(input) {
  const s = input.trim();
  if (!s) return '';
  const withPrefix = s.match(/^\+?91(\d{10})$/);
  if (withPrefix) return withPrefix[1] + '@upi';
  if (/^\d{10}$/.test(s)) return s + '@upi';
  return s;
}

function ChevronDown() {
  return (
    <svg className="w-4 h-4 text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function CheckCircle() {
  return (
    <div className="w-16 h-16 rounded-full bg-save/15 border border-save/30 flex items-center justify-center mx-auto">
      <svg className="w-7 h-7 text-save" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}

const UPI_APPS = [
  {
    id: 'phonepe',
    label: 'PhonePe',
    color: '#5f259f',
    abbr: 'Ph',
    href: (pa, pn, am) => `phonepe://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR`,
  },
  {
    id: 'gpay',
    label: 'GPay',
    color: '#1a73e8',
    abbr: 'G',
    href: (pa, pn, am) => `tez://upi/pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR`,
  },
  {
    id: 'paytm',
    label: 'Paytm',
    color: '#002970',
    abbr: 'Pt',
    href: (pa, pn, am) => `paytmmp://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR`,
  },
  {
    id: 'upi',
    label: 'Other',
    color: '#6366f1',
    abbr: '↗',
    href: (pa, pn, am) => `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR`,
  },
];

function UpiPicker({ upiId, amount }) {
  const [copied, setCopied] = useState(false);
  const mobile = isMobile();

  const pa = encodeURIComponent(upiId);
  const pn = encodeURIComponent('PocketPal');
  const am = encodeURIComponent(amount);

  const copyId = () => {
    navigator.clipboard.writeText(upiId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-2">
        {UPI_APPS.map((app) => (
          <a
            key={app.id}
            href={app.href(pa, pn, am)}
            className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl active:scale-95 transition-all duration-150 select-none"
            style={{ backgroundColor: app.color }}
          >
            <span className="text-white font-bold text-base leading-none">{app.abbr}</span>
            <span className="text-white/90 text-[10px] font-medium text-center leading-tight">{app.label}</span>
          </a>
        ))}
      </div>

      {!mobile && (
        <div className="flex flex-col gap-2">
          <p className="text-muted text-xs text-center">
            UPI app links open on mobile. On desktop, copy the UPI ID and paste it into your UPI app.
          </p>
          <div className="flex gap-2 items-center">
            <div className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2 font-mono text-xs text-muted break-all select-all">
              {upiId}
            </div>
            <button
              onClick={copyId}
              className="shrink-0 px-3 py-2 rounded-xl border border-border text-xs text-muted hover:text-text hover:border-muted transition-all duration-150"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfirmScreen({ amount, savedExpense, upiId, onDone }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col page-enter">
      <header
        className="border-b border-border/40"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="h-14 flex items-center px-4">
          <span className="font-heading font-bold text-text text-base tracking-tight select-none">PocketPal</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-5 pb-28">
        <div className="w-full max-w-sm flex flex-col gap-5">

          <div className="text-center flex flex-col gap-3">
            <CheckCircle />
            <div>
              <h2 className="font-heading text-xl font-semibold text-text">Expense saved</h2>
              <p className="text-muted text-sm mt-1">
                ₹{parseFloat(amount).toLocaleString('en-IN')} recorded
              </p>
            </div>
          </div>

          <Card>
            <p className="text-text text-sm font-semibold mb-2">Pay via UPI</p>
            {upiId ? (
              <>
                <p className="text-muted text-xs mb-1">
                  PocketPal has logged the expense. Complete payment in your UPI app.
                </p>
                <p className="text-muted text-xs mb-4">
                  To:{' '}
                  <span className="font-mono text-text">{upiId}</span>
                  <span className="text-muted"> · ₹{parseFloat(amount).toLocaleString('en-IN')}</span>
                </p>
                <UpiPicker upiId={upiId} amount={amount} />
              </>
            ) : (
              <p className="text-muted text-xs">
                No payee UPI ID entered. Go back and add one to pay via app, or pay manually in your UPI app.
              </p>
            )}
          </Card>

          <Button
            variant="ghost"
            onClick={() =>
              onDone({
                spare:   savedExpense?.roundup_spare   ?? 0,
                doubled: savedExpense?.roundup_doubled ?? false,
              })
            }
          >
            Done — back to dashboard
          </Button>

        </div>
      </div>
    </div>
  );
}

export default function AddExpense() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ amount: '', categoryId: '', note: '' });
  const [upiInput, setUpiInput] = useState(() => localStorage.getItem(UPI_LS_KEY) || '');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedExpense, setSavedExpense] = useState(null);

  useEffect(() => {
    client.get('/categories').then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const e = {};
    const n = parseFloat(form.amount);
    if (!form.amount || isNaN(n) || n <= 0) e.amount = 'Enter a valid amount';
    return e;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const res = await client.post('/expenses', {
        amount:      parseFloat(form.amount),
        category_id: form.categoryId ? parseInt(form.categoryId) : null,
        note:        form.note.trim() || null,
      });
      setSavedExpense(res.data);
      if (upiInput.trim()) localStorage.setItem(UPI_LS_KEY, upiInput.trim());
      setSaved(true);
    } catch (err) {
      setErrors({ api: err.response?.data?.detail || 'Could not save. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (saved) {
    return (
      <ConfirmScreen
        amount={form.amount}
        savedExpense={savedExpense}
        upiId={toUpiId(upiInput)}
        onDone={({ spare, doubled }) =>
          navigate('/dashboard', {
            state: { celebration: { spare, doubled } },
          })
        }
      />
    );
  }

  const selectedCat = categories.find((c) => c.id === parseInt(form.categoryId));
  const hasAmount = form.amount && parseFloat(form.amount) > 0;
  const upiId = toUpiId(upiInput);

  return (
    <div className="min-h-screen bg-bg pb-28 page-enter">
      <header
        className="sticky top-0 z-40 border-b border-border/40"
        style={{
          background: 'rgba(10,14,30,0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <div className="max-w-sm mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-xl border border-border
              text-muted hover:text-text hover:border-muted active:scale-95
              transition-all duration-150 shrink-0"
            aria-label="Go back"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-heading text-base font-semibold text-text">Add expense</h1>
        </div>
      </header>

      <div className="max-w-sm mx-auto px-4 pt-5 flex flex-col gap-4">
        <Card>
          <div className="flex flex-col gap-5">

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-heading text-xl text-muted pointer-events-none select-none">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="decimal"
                  placeholder="0"
                  value={form.amount}
                  onChange={set('amount')}
                  autoFocus
                  className={`w-full bg-surface-2 border ${errors.amount ? 'border-danger' : 'border-border'}
                    rounded-xl pl-9 pr-4 py-3.5 font-heading text-3xl font-bold text-text
                    outline-none focus:border-primary transition-all duration-150
                    placeholder:text-muted/25`}
                />
              </div>
              {errors.amount && <p className="text-xs text-danger">{errors.amount}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Category</label>
              <div className="relative">
                {selectedCat?.color && (
                  <span
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full pointer-events-none"
                    style={{ backgroundColor: selectedCat.color }}
                  />
                )}
                <select
                  value={form.categoryId}
                  onChange={set('categoryId')}
                  className={`w-full bg-surface-2 border border-border rounded-xl
                    ${selectedCat?.color ? 'pl-9' : 'pl-4'} pr-9 py-3
                    text-text text-base outline-none focus:border-primary transition-all duration-150
                    appearance-none`}
                >
                  <option value="">No category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                Note <span className="normal-case tracking-normal font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="Coffee, groceries, rent…"
                value={form.note}
                onChange={set('note')}
                maxLength={120}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3
                  text-text text-base outline-none focus:border-primary transition-all duration-150
                  placeholder:text-muted/40"
              />
            </div>

            {errors.api && (
              <p className="text-danger text-xs text-center">{errors.api}</p>
            )}

            <Button onClick={handleSave} loading={loading}>
              Save expense
            </Button>

          </div>
        </Card>

        {hasAmount && (
          <Card>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-text text-sm font-semibold">Pay via UPI</p>
                <p className="text-muted text-xs mt-0.5">
                  Optional — pay before or after saving. PocketPal only tracks the expense; payment happens in your UPI app.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  Payee UPI ID or phone <span className="normal-case tracking-normal font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="name@upi  or  9876543210"
                  value={upiInput}
                  onChange={(e) => setUpiInput(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3
                    text-text text-base outline-none focus:border-primary transition-all duration-150
                    placeholder:text-muted/40"
                />
                {upiInput.trim() && upiId !== upiInput.trim() && (
                  <p className="text-xs text-muted">
                    Will use: <span className="font-mono text-text">{upiId}</span>
                  </p>
                )}
              </div>

              {upiId ? (
                <UpiPicker upiId={upiId} amount={form.amount} />
              ) : (
                <p className="text-muted/50 text-xs text-center">
                  Enter a UPI ID or phone number above to see payment options.
                </p>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
