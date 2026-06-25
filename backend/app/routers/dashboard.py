import calendar
from collections import defaultdict
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Expense, User, Wallet
from ..schemas import DashboardResponse

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _daily_totals_for_month(db: Session, user_id: int, year: int, month: int) -> dict:
    """Fetch all expenses for a given month and bucket them by day (date → float)."""
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


@router.get("", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    if not wallet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet not set up yet")

    today = date.today()
    days_in_month = calendar.monthrange(today.year, today.month)[1]
    # days_left includes today
    days_left = days_in_month - today.day + 1

    # Single query for all monthly expenses; compute per-day sums in Python
    daily = _daily_totals_for_month(db, current_user.id, today.year, today.month)

    spent_this_month = sum(daily.values())
    spent_today = daily.get(today, 0.0)
    spent_yesterday = daily.get(today - timedelta(days=1), 0.0)

    balance_left = wallet.monthly_balance - spent_this_month

    # Floor at 0, round to nearest 10
    raw_limit = (balance_left - wallet.savings_goal) / days_left
    daily_spend_limit = round(max(0.0, raw_limit) / 10) * 10

    # Positive = spent less today than yesterday (good)
    saved_vs_yesterday = spent_yesterday - spent_today

    # Consecutive days going back from today where spending <= daily_spend_limit
    streak_days = 0
    check = today
    while check.month == today.month:
        if daily.get(check, 0.0) <= daily_spend_limit:
            streak_days += 1
            check -= timedelta(days=1)
        else:
            break

    return DashboardResponse(
        daily_spend_limit=daily_spend_limit,
        spent_today=spent_today,
        spent_this_month=spent_this_month,
        balance_left=balance_left,
        days_left_in_month=days_left,
        saved_vs_yesterday=saved_vs_yesterday,
        streak_days=streak_days,
    )
