from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import User, Wallet
from ..schemas import DashboardResponse
from ..utils import (
    compute_current_streak,
    get_cycle_context,
    get_daily_spend_limit,
    get_daily_totals_for_cycle,
    get_daily_totals_for_month,
    today_ist,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    if not wallet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet not set up yet")

    today = today_ist()
    ctx = get_cycle_context(wallet, today)

    # Calendar-month totals: source of truth for balance, limit, spent_today.
    # This ensures pre-cycle spending in the same month is accounted for.
    month_daily = get_daily_totals_for_month(db, current_user.id, today.year, today.month)
    spent_this_month = sum(month_daily.values())
    spent_today      = month_daily.get(today, 0.0)
    spent_yesterday  = month_daily.get(today - timedelta(days=1), 0.0)
    balance_left     = wallet.monthly_balance - spent_this_month

    # Daily limit uses month-based balance so pre-cycle spending lowers it correctly
    daily_spend_limit = get_daily_spend_limit(wallet, month_daily, today)
    saved_vs_yesterday = spent_yesterday - spent_today

    # Streak uses cycle-based totals (streak counts from cycle start, not month start)
    daily = get_daily_totals_for_cycle(
        db, current_user.id, ctx["cycle_start"], ctx["effective_today"]
    )
    streak_days = compute_current_streak(
        daily, daily_spend_limit, ctx["effective_today"], ctx["cycle_start"]
    )

    return DashboardResponse(
        daily_spend_limit=daily_spend_limit,
        spent_today=spent_today,
        spent_this_month=spent_this_month,
        balance_left=balance_left,
        days_left_in_month=ctx["days_left"],
        saved_vs_yesterday=saved_vs_yesterday,
        streak_days=streak_days,
        next_refill_date=(
            wallet.next_refill_date.isoformat() if wallet.next_refill_date else None
        ),
        cycle_expired=ctx["cycle_expired"],
    )
