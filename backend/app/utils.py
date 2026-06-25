"""
Shared helpers used by multiple routers.
Centralised here so streak + limit logic stays consistent everywhere.
"""
import calendar
from collections import defaultdict
from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from .models import Expense, Wallet


def get_daily_totals_for_month(db: Session, user_id: int, year: int, month: int) -> dict:
    """Return {date: total_spent} for every day that had expenses in the given month."""
    last_day = calendar.monthrange(year, month)[1]
    rows = (
        db.query(Expense)
        .filter(
            Expense.user_id == user_id,
            Expense.created_at >= datetime(year, month, 1),
            Expense.created_at <= datetime(year, month, last_day, 23, 59, 59),
        )
        .all()
    )
    totals: dict[date, float] = defaultdict(float)
    for exp in rows:
        totals[exp.created_at.date()] += exp.amount
    return totals


def get_daily_spend_limit(wallet: Wallet, daily_totals: dict, today: date) -> float:
    """Compute the current daily spend limit from the wallet and month-to-date totals."""
    days_in_month = calendar.monthrange(today.year, today.month)[1]
    days_left = days_in_month - today.day + 1  # includes today; always >= 1
    spent_this_month = sum(daily_totals.values())
    balance_left = wallet.monthly_balance - spent_this_month
    raw = (balance_left - wallet.savings_goal) / days_left
    return round(max(0.0, raw) / 10) * 10


def compute_current_streak(daily_totals: dict, daily_limit: float, today: date) -> int:
    """
    Count consecutive days backwards from today (within the current month)
    where daily spend was at or under the limit.
    Days with no expenses count as 0 spend → always under-limit.
    """
    streak = 0
    check = today
    while check.month == today.month:
        if daily_totals.get(check, 0.0) <= daily_limit:
            streak += 1
            check -= timedelta(days=1)
        else:
            break
    return streak
