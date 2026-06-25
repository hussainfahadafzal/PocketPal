from datetime import date, timedelta

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

    today = date.today()
    ctx = get_cycle_context(wallet, today)

    # Fetch expenses for the current cycle only
    daily = get_daily_totals_for_cycle(
        db, current_user.id, ctx["cycle_start"], ctx["effective_today"]
    )

    spent_this_cycle = sum(daily.values())
    spent_today = daily.get(today, 0.0)
    spent_yesterday = daily.get(today - timedelta(days=1), 0.0)
    balance_left = wallet.monthly_balance - spent_this_cycle
    daily_spend_limit = get_daily_spend_limit(wallet, daily, today)
    saved_vs_yesterday = spent_yesterday - spent_today

    streak_days = compute_current_streak(
        daily, daily_spend_limit, ctx["effective_today"], ctx["cycle_start"]
    )

    return DashboardResponse(
        daily_spend_limit=daily_spend_limit,
        spent_today=spent_today,
        spent_this_month=spent_this_cycle,
        balance_left=balance_left,
        days_left_in_month=ctx["days_left"],
        saved_vs_yesterday=saved_vs_yesterday,
        streak_days=streak_days,
        next_refill_date=(
            wallet.next_refill_date.isoformat() if wallet.next_refill_date else None
        ),
        cycle_expired=ctx["cycle_expired"],
    )
