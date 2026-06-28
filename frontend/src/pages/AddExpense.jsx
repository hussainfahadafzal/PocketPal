import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import client from '../api/client';
import Button from '../components/Button';

const UPI_LS_KEY = 'pocketpal_upi';

function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1;
}

// A valid VPA must have exactly one @ with non-empty parts on both sides
function isValidVpa(s) {
  return /^[^\s@]+@[^\s@]+$/.test(s.trim());
}

// Parse a UPI QR payload into { pa, am }
// Format: upi://pay?pa=VPA&pn=Name&cu=INR  (am not used in deep links — prefilled
// amounts to personal UPI IDs are blocked by UPI apps for security)
// Some QRs are just the raw VPA string
function parseUpiQr(raw) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const pa = url.searchParams.get('pa');
    const am = url.searchParams.get('am');
    if (pa && isValidVpa(pa)) {
      return { pa, am: am && parseFloat(am) > 0 ? am : null };
    }
  } catch {}
  if (isValidVpa(raw.trim())) return { pa: raw.trim(), am: null };
  return null;
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
    href: (pa, pn) =>
      `phonepe://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&cu=INR&mode=00&purpose=00`,
  },
  {
    id: 'gpay',
    label: 'GPay',
    color: '#1a73e8',
    abbr: 'G',
    href: (pa, pn) =>
      `tez://upi/pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&cu=INR`,
  },
  {
    id: 'paytm',
    label: 'Paytm',
    color: '#002970',
    abbr: 'Pt',
    href: (pa, pn) =>
      `paytmmp://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&cu=INR`,
  },
  {
    id: 'upi',
    label: 'Other',
    color: '#6366f1',
    abbr: '↗',
    href: (pa, pn) =>
      `upi://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&cu=INR`,
  },
];

// ── QR Scanner ──────────────────────────────────────────────────────────────
// Uses jsQR (pure JS, works on iOS Safari + all browsers) to decode
// QR codes from a live camera stream drawn to a hidden canvas each frame.
function QRScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [status, setStatus] = useState('starting'); // starting | scanning | error
  const [errorType, setErrorType] = useState('');

  useEffect(() => {
    let stream = null;
    let rafId = null;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
          audio: false,
        });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus('scanning');

        const tick = () => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (!video || !canvas) return;

          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width  = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });
            if (code?.data) {
              stop();
              onScan(code.data);
              return;
            }
          }
          rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
      } catch (err) {
        setStatus('error');
        setErrorType(err.name === 'NotAllowedError' ? 'permission' : 'camera');
      }
    };

    const stop = () => {
      if (rafId) cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
    };

    start();
    return stop;
  }, []);

  // Fallback: user picks an image, we decode it with jsQR via canvas
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code?.data) {
        onScan(code.data);
      } else {
        setStatus('error');
        setErrorType('not_found');
      }
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  };

  const errorText = {
    permission: 'Camera access denied. Allow camera in your browser settings and try again.',
    camera: 'Could not open camera. Try picking an image from your gallery instead.',
    not_found: 'No QR code found in that image. Try again with a clearer photo.',
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col"
      style={{ background: 'rgba(4,6,18,0.98)' }}
    >
      {/* Hidden canvas used for jsQR frame decoding — never shown */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', paddingBottom: '12px' }}
      >
        <span className="text-white font-semibold text-base">Scan UPI QR Code</span>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full active:opacity-60"
          style={{ background: 'rgba(255,255,255,0.1)' }}
          aria-label="Close scanner"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Viewfinder area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        {status === 'error' ? (
          <div className="flex flex-col items-center gap-5 text-center max-w-xs">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.07)' }}
            >
              <svg className="w-9 h-9" fill="none" stroke="rgba(255,255,255,0.35)" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">
              {errorText[errorType] || 'Something went wrong.'}
            </p>
            <label
              className="px-5 py-2.5 rounded-xl border border-white/20 text-white text-sm font-medium
                cursor-pointer active:opacity-60 transition-opacity"
            >
              Pick image from gallery
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
          </div>
        ) : (
          <>
            {/* Camera viewfinder */}
            <div className="relative w-64 h-64 rounded-2xl overflow-hidden bg-black/40">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
                autoPlay
              />
              {/* Corner markers */}
              {[
                'top-0 left-0 border-l-[3px] border-t-[3px] rounded-tl-2xl',
                'top-0 right-0 border-r-[3px] border-t-[3px] rounded-tr-2xl',
                'bottom-0 left-0 border-l-[3px] border-b-[3px] rounded-bl-2xl',
                'bottom-0 right-0 border-r-[3px] border-b-[3px] rounded-br-2xl',
              ].map((cls, i) => (
                <span key={i} className={`absolute w-7 h-7 border-primary ${cls}`} />
              ))}
              {/* Animated scan line */}
              {status === 'scanning' && (
                <div
                  className="absolute left-2 right-2 h-px"
                  style={{
                    background: 'linear-gradient(90deg, transparent, #3B6CFF, transparent)',
                    animation: 'scanline 1.8s ease-in-out infinite',
                    top: '30%',
                  }}
                />
              )}
            </div>

            <p className="text-white/40 text-sm text-center">
              {status === 'starting' ? 'Opening camera…' : 'Point at any UPI / merchant QR code'}
            </p>

            <label className="text-white/30 text-xs underline underline-offset-2 cursor-pointer active:opacity-60">
              Or pick a screenshot from gallery
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
          </>
        )}
      </div>

      <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }} />

      <style>{`
        @keyframes scanline {
          0%, 100% { top: 20%; opacity: 0.6; }
          50% { top: 75%; opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── UPI App Picker ───────────────────────────────────────────────────────────
function UpiPicker({ vpa, amount }) {
  const [copied, setCopied] = useState(false);
  const mobile = isMobile();

  const copyVpa = () => {
    navigator.clipboard.writeText(vpa).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {amount && parseFloat(amount) > 0 && (
        <p className="text-xs text-center text-muted leading-relaxed">
          Enter{' '}
          <span className="font-semibold text-text">
            ₹{parseFloat(amount).toLocaleString('en-IN')}
          </span>{' '}
          manually in your UPI app — amount is not pre-filled.
        </p>
      )}
      <div className="grid grid-cols-4 gap-2">
        {UPI_APPS.map((app) => (
          <a
            key={app.id}
            href={app.href(vpa, 'PocketPal')}
            className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl
              active:scale-95 transition-all duration-150 select-none"
            style={{ backgroundColor: app.color }}
          >
            <span className="text-white font-bold text-base leading-none">{app.abbr}</span>
            <span className="text-white/90 text-[10px] font-medium text-center leading-tight">
              {app.label}
            </span>
          </a>
        ))}
      </div>

      {!mobile && (
        <div className="flex flex-col gap-2 mt-1">
          <p className="text-muted text-xs text-center">
            UPI links open on mobile. On desktop, copy the UPI ID and paste it into your app.
          </p>
          <div className="flex gap-2 items-center">
            <div className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2
              font-mono text-xs text-muted break-all select-all">
              {vpa}
            </div>
            <button
              onClick={copyVpa}
              className="shrink-0 px-3 py-2 rounded-xl border border-border text-xs text-muted
                hover:text-text hover:border-muted transition-all duration-150"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Confirm Screen ───────────────────────────────────────────────────────────
function ConfirmScreen({ amount, savedExpense, vpa, onDone }) {
  const [showScanner, setShowScanner] = useState(false);
  const [activeVpa, setActiveVpa] = useState(vpa);

  const handleScan = (raw) => {
    setShowScanner(false);
    const parsed = parseUpiQr(raw);
    if (parsed?.pa) {
      setActiveVpa(parsed.pa);
      localStorage.setItem(UPI_LS_KEY, parsed.pa);
    } else {
      alert('Could not read a UPI ID from that QR code. Try again.');
    }
  };

  return (
    <>
      {showScanner && (
        <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

      <div className="min-h-screen bg-bg flex flex-col page-enter">
        <header
          className="border-b border-border/40"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <div className="h-14 flex items-center px-4">
            <span className="font-heading font-bold text-text text-base tracking-tight select-none">
              PocketPal
            </span>
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

            <div className="rounded-3xl p-5" style={{ background: 'rgba(13,18,37,0.85)', border: '1px solid rgba(30,45,78,0.6)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-text text-sm font-semibold">Pay via UPI</p>
                <button
                  onClick={() => setShowScanner(true)}
                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg
                    border border-border text-muted hover:text-text hover:border-muted
                    active:scale-95 transition-all duration-150"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5
                         c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125
                         1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125
                         1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504
                         1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 17.25h.75v.75h-.75v-.75zM17.25 6.75h.75v.75h-.75v-.75z
                         M13.5 13.5h.75v.75H13.5V13.5zM13.5 18.75h.75v.75H13.5v-.75zM18.75 13.5h.75v.75h-.75V13.5z
                         M18.75 18.75h.75v.75h-.75v-.75zM16.5 16.5h.75v.75H16.5V16.5z" />
                  </svg>
                  Scan QR
                </button>
              </div>

              {activeVpa ? (
                <>
                  <p className="text-muted text-xs mb-4">
                    Pay{' '}
                    <span className="font-semibold text-text">
                      ₹{parseFloat(amount).toLocaleString('en-IN')}
                    </span>{' '}
                    to{' '}
                    <span className="font-mono text-text">{activeVpa}</span>
                    {' '}— enter this amount manually in your UPI app.
                  </p>
                  <UpiPicker vpa={activeVpa} amount={amount} />
                </>
              ) : (
                <p className="text-muted text-xs">
                  Scan a payee QR code above, or go back and enter a UPI ID to pay.
                </p>
              )}
            </div>

            <Button
              variant="ghost"
              onClick={() =>
                onDone({
                  spare: savedExpense?.roundup_spare ?? 0,
                  doubled: savedExpense?.roundup_doubled ?? false,
                })
              }
            >
              Done — back to dashboard
            </Button>

          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Form ────────────────────────────────────────────────────────────────
export default function AddExpense() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ amount: '', categoryId: '', note: '' });
  const [upiInput, setUpiInput] = useState(() => localStorage.getItem(UPI_LS_KEY) || '');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedExpense, setSavedExpense] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

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
        amount: parseFloat(form.amount),
        category_id: form.categoryId ? parseInt(form.categoryId) : null,
        note: form.note.trim() || null,
      });
      setSavedExpense(res.data);
      const vpa = upiInput.trim();
      if (vpa) localStorage.setItem(UPI_LS_KEY, vpa);
      setSaved(true);
    } catch (err) {
      setErrors({ api: err.response?.data?.detail || 'Could not save. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (raw) => {
    setShowScanner(false);
    const parsed = parseUpiQr(raw);
    if (parsed?.pa) {
      setUpiInput(parsed.pa);
      localStorage.setItem(UPI_LS_KEY, parsed.pa);
      if (parsed.am && !form.amount) {
        setForm((f) => ({ ...f, amount: parsed.am }));
      }
    } else {
      alert('Could not read a UPI ID from that QR code. Try again.');
    }
  };

  if (saved) {
    return (
      <ConfirmScreen
        amount={form.amount}
        savedExpense={savedExpense}
        vpa={isValidVpa(upiInput.trim()) ? upiInput.trim() : ''}
        onDone={({ spare, doubled }) =>
          navigate('/dashboard', { state: { celebration: { spare, doubled } } })
        }
      />
    );
  }

  const selectedCat = categories.find((c) => c.id === parseInt(form.categoryId));
  const hasAmount = form.amount && parseFloat(form.amount) > 0;
  const trimmedUpi = upiInput.trim();
  const vpaValid = isValidVpa(trimmedUpi);
  const looksLikePhone = /^\+?[\d\s-]{7,15}$/.test(trimmedUpi) && !trimmedUpi.includes('@');

  return (
    <>
      {showScanner && (
        <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

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
          <div className="rounded-3xl p-5" style={{ background: 'rgba(13,18,37,0.85)', border: '1px solid rgba(30,45,78,0.6)' }}>
            <div className="flex flex-col gap-5">

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-heading text-xl text-muted
                    pointer-events-none select-none">
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
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  Category
                </label>
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
                  Note{' '}
                  <span className="normal-case tracking-normal font-normal">(optional)</span>
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
          </div>

          {hasAmount && (
            <div className="rounded-3xl p-5" style={{ background: 'rgba(13,18,37,0.85)', border: '1px solid rgba(30,45,78,0.6)' }}>
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-text text-sm font-semibold">Pay via UPI</p>
                  <p className="text-muted text-xs mt-0.5">
                    Optional. The expense is already logged above — pay whenever you want.
                  </p>
                </div>

                {/* UPI ID input + scan button */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                    Payee UPI ID{' '}
                    <span className="normal-case tracking-normal font-normal">(optional)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="name@ybl, name@okicici…"
                      value={upiInput}
                      onChange={(e) => setUpiInput(e.target.value)}
                      className="flex-1 min-w-0 bg-surface-2 border border-border rounded-xl px-4 py-3
                        text-text text-base outline-none focus:border-primary transition-all duration-150
                        placeholder:text-muted/40"
                    />
                    <button
                      onClick={() => setShowScanner(true)}
                      className="shrink-0 w-12 h-12 flex items-center justify-center rounded-xl
                        border border-border text-muted hover:text-primary hover:border-primary
                        active:scale-95 transition-all duration-150"
                      title="Scan QR code"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                          d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5
                             c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                          d="M3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5
                             c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                          d="M13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5
                             c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                          d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 17.25h.75v.75h-.75v-.75z
                             M17.25 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75H13.5V13.5z
                             M13.5 18.75h.75v.75H13.5v-.75zM18.75 13.5h.75v.75h-.75V13.5z
                             M18.75 18.75h.75v.75h-.75v-.75zM16.5 16.5h.75v.75H16.5V16.5z" />
                      </svg>
                    </button>
                  </div>

                  {/* Contextual hints */}
                  {looksLikePhone && (
                    <p className="text-xs text-amber-400/80 leading-relaxed">
                      Phone numbers alone won't work — UPI apps need the full ID like{' '}
                      <span className="font-mono">9876543210@ybl</span> or{' '}
                      <span className="font-mono">name@okicici</span>.
                      Find yours in your UPI app under Profile, or scan their QR code.
                    </p>
                  )}
                  {trimmedUpi && !vpaValid && !looksLikePhone && (
                    <p className="text-xs text-amber-400/80">
                      UPI ID must include @, e.g. <span className="font-mono">name@ybl</span>
                    </p>
                  )}
                  {vpaValid && (
                    <p className="text-xs text-save/80">
                      ✓ <span className="font-mono">{trimmedUpi}</span>
                    </p>
                  )}
                </div>

                {vpaValid ? (
                  <UpiPicker vpa={trimmedUpi} amount={form.amount} />
                ) : (
                  <button
                    onClick={() => setShowScanner(true)}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
                      border border-dashed border-border text-muted text-sm
                      hover:border-primary hover:text-primary active:scale-[0.98]
                      transition-all duration-150"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5
                           c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625
                           c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125
                           1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5
                           c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5
                           9.375v-4.5z" />
                    </svg>
                    Scan payee QR code
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
