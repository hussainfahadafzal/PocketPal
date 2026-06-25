import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import Button from '../components/Button';
import Card from '../components/Card';
import BottomNav from '../components/BottomNav';

const MERCHANT_VPA = 'merchant@upi';

function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1;
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

function ConfirmScreen({ amount, onDone }) {
  const [copied, setCopied] = useState(false);
  const mobile = isMobile();
  const upiLink = `upi://pay?pa=${MERCHANT_VPA}&pn=PocketPal&am=${amount}&cu=INR`;

  const copyLink = () => {
    navigator.clipboard.writeText(upiLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col page-enter">
      {/* Minimal header */}
      <header className="h-14 flex items-center px-4 border-b border-border/40">
        <span className="font-heading font-bold text-text text-base tracking-tight select-none">PocketPal</span>
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
            <p className="text-text text-sm font-semibold mb-1">Pay via UPI</p>
            <p className="text-muted text-xs mb-4">
              {mobile
                ? 'Tap below to open your UPI app and complete the payment.'
                : 'On your phone, open any UPI app and paste the link below.'}
            </p>

            {mobile ? (
              <a
                href={upiLink}
                className="block w-full text-center py-3 px-4 rounded-xl bg-primary
                  hover:bg-primary/90 active:scale-[0.97] text-white font-semibold text-sm
                  transition-all duration-150"
              >
                Open UPI App — ₹{parseFloat(amount).toLocaleString('en-IN')}
              </a>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="bg-surface-2 border border-border rounded-xl p-3 font-mono text-xs text-muted break-all select-all">
                  {upiLink}
                </div>
                <Button variant="ghost" onClick={copyLink}>
                  {copied ? 'Copied!' : 'Copy UPI link'}
                </Button>
              </div>
            )}
          </Card>

          <Button variant="ghost" onClick={onDone}>
            Done — back to dashboard
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

export default function AddExpense() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ amount: '', categoryId: '', note: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

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
      await client.post('/expenses', {
        amount:      parseFloat(form.amount),
        category_id: form.categoryId ? parseInt(form.categoryId) : null,
        note:        form.note.trim() || null,
      });
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
        onDone={() => navigate('/dashboard')}
      />
    );
  }

  const selectedCat = categories.find((c) => c.id === parseInt(form.categoryId));
  const hasAmount = form.amount && parseFloat(form.amount) > 0;
  const upiPreviewLink = `upi://pay?pa=${MERCHANT_VPA}&pn=PocketPal&am=${form.amount}&cu=INR`;

  return (
    <div className="min-h-screen bg-bg pb-28 page-enter">
      {/* Page header with back button */}
      <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur-sm border-b border-border/40">
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

      <div className="max-w-sm mx-auto px-4 pt-5">
        <Card>
          <div className="flex flex-col gap-5">

            {/* Amount — the main field */}
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

            {/* Category */}
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
                    text-text text-sm outline-none focus:border-primary transition-all duration-150
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

            {/* Note */}
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
                  text-text text-sm outline-none focus:border-primary transition-all duration-150
                  placeholder:text-muted/40"
              />
            </div>

            {errors.api && (
              <p className="text-danger text-xs text-center">{errors.api}</p>
            )}

            <Button onClick={handleSave} loading={loading}>
              Save expense
            </Button>

            {/* UPI quick-pay shown once user has typed an amount */}
            {hasAmount && (
              <div className="border-t border-border pt-4 flex flex-col gap-2">
                <p className="text-muted text-xs text-center">or pay first, then save</p>
                {isMobile() ? (
                  <a
                    href={upiPreviewLink}
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl
                      border border-primary/40 text-primary text-sm font-medium
                      hover:bg-primary/8 active:scale-[0.97] transition-all duration-150"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Pay ₹{parseFloat(form.amount).toLocaleString('en-IN')} via UPI
                  </a>
                ) : (
                  <p className="text-center text-muted/60 text-xs">
                    UPI deep link available on mobile
                  </p>
                )}
              </div>
            )}

          </div>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
