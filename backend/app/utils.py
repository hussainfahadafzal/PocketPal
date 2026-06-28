"""
Shared helpers used by multiple routers.
Centralised here so streak, limit, and cycle logic stays consistent everywhere.
"""
import calendar
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from .models import Expense, Wallet

# All stored datetimes are naive UTC (datetime.now() on a UTC cloud server).
# Convert to IST before any date comparison so "today" matches the user's clock.
_IST = timezone(timedelta(hours=5, minutes=30))


def today_ist() -> date:
    """Current date in IST — use everywhere instead of date.today()."""
    return datetime.now(_IST).date()


def _date_ist(naive_utc: datetime) -> date:
    """Convert a naive UTC datetime (as stored in DB) to an IST date."""
    return naive_utc.replace(tzinfo=timezone.utc).astimezone(_IST).date()


# ── Budget cycle helpers ──────────────────────────────────────────────────────

def get_cycle_context(wallet: Wallet, today: date) -> dict:
    """
    Derive timing information for the current budget cycle.

    Returns a dict with:
      cycle_start    – first day of the cycle (date)
      cycle_end      – last day of the cycle / next_refill_date (date)
      cycle_expired  – True when today is past cycle_end
      effective_today– min(today, cycle_end); caps queries for expired cycles
      days_left      – days remaining incl. today; 0 when cycle is expired

    Falls back to calendar-month behaviour for wallets that pre-date this
    feature (next_refill_date is NULL).
    """
    cycle_start = wallet.cycle_start_date or date(today.year, today.month, 1)

    if wallet.next_refill_date:
        cycle_end = wallet.next_refill_date
        delta = (cycle_end - today).days
        cycle_expired = delta < 0
        effective_today = cycle_end if cycle_expired else today
        days_left = 0 if cycle_expired else delta + 1
    else:
        # Legacy: use the remainder of the calendar month
        days_in_month = calendar.monthrange(today.year, today.month)[1]
        cycle_end = date(today.year, today.month, days_in_month)
        cycle_expired = False
        effective_today = today
        days_left = days_in_month - today.day + 1

    return {
        "cycle_start": cycle_start,
        "cycle_end": cycle_end,
        "cycle_expired": cycle_expired,
        "effective_today": effective_today,
        "days_left": days_left,
    }


def get_daily_totals_for_cycle(
    db: Session, user_id: int, cycle_start: date, through: date
) -> dict:
    """Return {IST-date: total_spent} for every day from cycle_start through `through` inclusive."""
    # Fetch a slightly wider window (±1 day) to catch UTC↔IST boundary expenses.
    fetch_start = datetime(cycle_start.year, cycle_start.month, cycle_start.day) - timedelta(hours=6)
    fetch_end   = datetime(through.year, through.month, through.day, 23, 59, 59) + timedelta(hours=6)
    rows = (
        db.query(Expense)
        .filter(
            Expense.user_id == user_id,
            Expense.created_at >= fetch_start,
            Expense.created_at <= fetch_end,
        )
        .all()
    )
    totals: dict[date, float] = defaultdict(float)
    for exp in rows:
        totals[_date_ist(exp.created_at)] += exp.amount
    return totals


def get_daily_totals_for_month(db: Session, user_id: int, year: int, month: int) -> dict:
    """Return {IST-date: total_spent} for a specific calendar month."""
    last_day = calendar.monthrange(year, month)[1]
    # Wider fetch window to capture IST boundary expenses stored as UTC.
    fetch_start = datetime(year, month, 1) - timedelta(hours=6)
    fetch_end   = datetime(year, month, last_day, 23, 59, 59) + timedelta(hours=6)
    rows = (
        db.query(Expense)
        .filter(
            Expense.user_id == user_id,
            Expense.created_at >= fetch_start,
            Expense.created_at <= fetch_end,
        )
        .all()
    )
    totals: dict[date, float] = defaultdict(float)
    for exp in rows:
        totals[_date_ist(exp.created_at)] += exp.amount
    return totals


def get_daily_spend_limit(wallet: Wallet, daily_totals: dict, today: date) -> float:
    """Compute the daily spend limit using the cycle's remaining days."""
    ctx = get_cycle_context(wallet, today)
    if ctx["cycle_expired"]:
        return 0.0
    days_left = max(1, ctx["days_left"])  # guard against zero
    spent = sum(daily_totals.values())
    balance_left = wallet.monthly_balance - spent
    raw = (balance_left - (wallet.savings_goal or 0.0)) / days_left
    return round(max(0.0, raw) / 10) * 10


def compute_current_streak(
    daily_totals: dict, daily_limit: float, today: date, cycle_start: date = None
) -> int:
    """
    Count consecutive under-limit days backwards from `today`, stopping at cycle_start.
    Days with no expenses count as ₹0 spend → always under-limit.
    """
    streak = 0
    check = today
    start = cycle_start or date(today.year, today.month, 1)
    while check >= start:
        if daily_totals.get(check, 0.0) <= daily_limit:
            streak += 1
            check -= timedelta(days=1)
        else:
            break
    return streak
