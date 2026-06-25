from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import User, Wallet
from ..schemas import StreakCalendarResponse, StreakDay
from ..utils import compute_current_streak, get_daily_spend_limit, get_daily_totals_for_month

router = APIRouter(prefix="/streak", tags=["streak"])


@router.get("/calendar", response_model=StreakCalendarResponse)
def get_streak_calendar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return every day so far this month with under_limit status, plus
    the current consecutive streak count.

    Days with no expenses are treated as ₹0 spend → always under-limit.
    The daily_limit used is the one calculated as of TODAY (same formula
    as the dashboard), applied uniformly to all historical days.
    """
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    if not wallet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet not set up yet")

    today = date.today()
    daily = get_daily_totals_for_month(db, current_user.id, today.year, today.month)
    daily_limit = get_daily_spend_limit(wallet, daily, today)
    current_streak = compute_current_streak(daily, daily_limit, today)

    days = [
        StreakDay(
            date=date(today.year, today.month, day_num).isoformat(),
            under_limit=daily.get(date(today.year, today.month, day_num), 0.0) <= daily_limit,
            is_today=(day_num == today.day),
        )
        for day_num in range(1, today.day + 1)
    ]

    return StreakCalendarResponse(days=days, current_streak=current_streak)
