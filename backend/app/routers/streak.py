from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import User, Wallet
from ..schemas import StreakCalendarResponse, StreakDay
from ..utils import (
    compute_current_streak,
    get_cycle_context,
    get_daily_spend_limit,
    get_daily_totals_for_cycle,
    today_ist,
)

router = APIRouter(prefix="/streak", tags=["streak"])


@router.get("/calendar", response_model=StreakCalendarResponse)
def get_streak_calendar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return every day so far in the current budget cycle with under_limit status,
    plus the current consecutive streak count.

    The response includes cycle_start and cycle_end so the frontend can render
    the full cycle grid (including future days as ghost cells).
    """
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    if not wallet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet not set up yet")

    today = today_ist()
    ctx = get_cycle_context(wallet, today)

    daily = get_daily_totals_for_cycle(
        db, current_user.id, ctx["cycle_start"], ctx["effective_today"]
    )
    daily_limit = get_daily_spend_limit(wallet, daily, today)
    current_streak = compute_current_streak(
        daily, daily_limit, ctx["effective_today"], ctx["cycle_start"]
    )

    # Build StreakDay entries for cycle_start → effective_today
    days_elapsed = (ctx["effective_today"] - ctx["cycle_start"]).days + 1
    days = [
        StreakDay(
            date=(ctx["cycle_start"] + timedelta(days=i)).isoformat(),
            under_limit=daily.get(ctx["cycle_start"] + timedelta(days=i), 0.0) <= daily_limit,
            is_today=(ctx["cycle_start"] + timedelta(days=i) == today),
        )
        for i in range(days_elapsed)
    ]

    return StreakCalendarResponse(
        days=days,
        current_streak=current_streak,
        cycle_start=ctx["cycle_start"].isoformat(),
        cycle_end=ctx["cycle_end"].isoformat(),
    )
