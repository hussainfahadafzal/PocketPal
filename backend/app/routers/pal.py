import calendar
from collections import defaultdict
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Category, Expense, User, Wallet
from ..schemas import Nudge
from ..utils import _date_ist, today_ist

router = APIRouter(prefix="/pal", tags=["pal"])

_WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _month_expenses(db: Session, user_id: int, year: int, month: int) -> List[Expense]:
    last_day = calendar.monthrange(year, month)[1]
    # Wide window so IST-boundary expenses (stored as previous-day UTC) are included.
    from datetime import timedelta
    return (
        db.query(Expense)
        .filter(
            Expense.user_id == user_id,
            Expense.created_at >= datetime(year, month, 1) - timedelta(hours=6),
            Expense.created_at <= datetime(year, month, last_day, 23, 59, 59) + timedelta(hours=6),
        )
        .all()
    )


@router.get("/nudges", response_model=List[Nudge])
def get_nudges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = today_ist()
    year, month = today.year, today.month
    days_in_month = calendar.monthrange(year, month)[1]
    days_elapsed = today.day
    days_left = days_in_month - days_elapsed + 1  # includes today

    expenses = _month_expenses(db, current_user.id, year, month)
    # Filter to expenses that fall in this month in IST
    expenses = [e for e in expenses if _date_ist(e.created_at).month == month and _date_ist(e.created_at).year == year]
    total_spent = sum(e.amount for e in expenses)

    spent_today = sum(e.amount for e in expenses if _date_ist(e.created_at) == today)

    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()

    nudges: List[Nudge] = []

    # ── Rule 1: category over its monthly cap ──
    capped_cats = (
        db.query(Category)
        .filter(
            Category.user_id == current_user.id,
            Category.monthly_cap.isnot(None),
        )
        .all()
    )
    cat_totals: dict[int, float] = defaultdict(float)
    for exp in expenses:
        if exp.category_id:
            cat_totals[exp.category_id] += exp.amount

    for cat in capped_cats:
        if cat_totals.get(cat.id, 0) > cat.monthly_cap:
            nudges.append(Nudge(
                type="over_budget",
                message=f"You're over budget on {cat.name}.",
                icon="⚠️",
            ))

    # ── Rule 2: projected month spend > monthly balance ──
    if wallet and days_elapsed > 0:
        daily_avg = total_spent / days_elapsed
        projected = daily_avg * days_in_month
        if projected > wallet.monthly_balance:
            overspend = round(projected - wallet.monthly_balance)
            nudges.append(Nudge(
                type="projected_overspend",
                message=f"At this rate you'll overspend by ₹{overspend:,} this month.",
                icon="📈",
            ))

    # ── Rule 3: weekday with highest average daily spend ──
    if expenses:
        wd_totals: dict[int, float] = defaultdict(float)
        wd_days: dict[int, set] = defaultdict(set)
        for exp in expenses:
            d = _date_ist(exp.created_at)
            wd = d.weekday()  # 0 = Monday, 6 = Sunday
            wd_totals[wd] += exp.amount
            wd_days[wd].add(d)

        wd_avgs = {wd: wd_totals[wd] / len(wd_days[wd]) for wd in wd_totals}
        top_wd = max(wd_avgs, key=wd_avgs.__getitem__)
        nudges.append(Nudge(
            type="high_spend_day",
            message=f"You spend most on {_WEEKDAY_NAMES[top_wd]}s.",
            icon="📅",
        ))

    # ── Rule 4: today's spend is under the daily limit ──
    if wallet and days_left > 0:
        balance_left = wallet.monthly_balance - total_spent
        raw_limit = (balance_left - wallet.savings_goal) / days_left
        daily_limit = round(max(0.0, raw_limit) / 10) * 10
        if daily_limit > 0 and spent_today < daily_limit:
            nudges.append(Nudge(
                type="under_limit",
                message="Nice! Under your limit today 🔥",
                icon="✅",
            ))

    # ── Rule 5: >55 % of spend falls on weekends ──
    if total_spent > 0:
        weekend_spent = sum(
            e.amount for e in expenses
            if _date_ist(e.created_at).weekday() in (5, 6)  # Saturday, Sunday
        )
        if weekend_spent / total_spent > 0.55:
            nudges.append(Nudge(
                type="weekend_splurger",
                message="You're a Weekend Splurger — over half your spend happens on Sat & Sun.",
                icon="🛍️",
            ))

    return nudges[:4]
