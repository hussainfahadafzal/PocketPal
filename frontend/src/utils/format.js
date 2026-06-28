export const CURRENCY_KEY    = 'pocketpal_currency';
export const DATE_FORMAT_KEY = 'pocketpal_dateformat';

export function getCurrencySymbol() {
  return localStorage.getItem(CURRENCY_KEY) || '₹';
}

// Compact Indian notation: ₹1.5k / ₹2.5L / ₹1.2Cr
export function fmtAmount(value, { compact = true } = {}) {
  const sym = getCurrencySymbol();
  const n   = Number(value) || 0;
  if (compact) {
    if (n >= 10_000_000) return `${sym}${(n / 10_000_000).toFixed(1)}Cr`;
    if (n >= 100_000)    return `${sym}${(n / 100_000).toFixed(1)}L`;
    if (n >= 1_000)      return `${sym}${(n / 1_000).toFixed(1)}k`;
  }
  return `${sym}${n.toLocaleString('en-IN')}`;
}

// Full amount with commas, no compact (for forms / detail views)
export function fmtFull(value) {
  return fmtAmount(value, { compact: false });
}
