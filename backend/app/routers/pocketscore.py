"""
PocketScore: a 0–850 composite financial-health score derived from four signals.

Signal                 Max pts  Formula
─────────────────────  ───────  ───────────────────────────────────────────────
Budget Discipline        300    (days_under_limit / days_elapsed) × 300
Saving Rate              250    cycle-goal track (0–125) + jar progress (0–125)
Streak Strength          200    min(streak, 30) / 30 × 200
Category Cap Adherence   100    (cats_under_cap / capped_cats) × 100; 50 if none set
─────────────────────  ───────
Total                    850

Labels: 0–349 Poor | 350–549 Fair | 550–699 Good | 700–850 Excellent
"""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Category, Expense, User, Wallet
from ..schemas import PocketScoreResponse
from ..utils import (
    compute_current_streak,
    get_cycle_context,
    get_daily_spend_limit,
    get_daily_totals_for_cycle,
    today_ist,
)

router = APIRouter(prefix="/pocketscore", tags=["pocketscore"])


@router.get("", response_model=PocketScoreResponse)
def get_pocket_score(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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

    # ── Category spending this cycle ──────────────────────────────────────────
    cs, ce = ctx["cycle_start"], ctx["effective_today"]
    cat_rows = (
        db.query(Expense.category_id, func.sum(Expense.amount).label("total"))
        .filter(
            Expense.user_id == current_user.id,
            Expense.category_id.isnot(None),
            Expense.created_at >= datetime(cs.year, cs.month, cs.day),
            Expense.created_at <= datetime(ce.year, ce.month, ce.day, 23, 59, 59),
        )
        .group_by(Expense.category_id)
        .all()
    )
    cat_spent: dict[int, float] = {row.category_id: row.total for row in cat_rows}
    categories = db.query(Category).filter(Category.user_id == current_user.id).all()

    # ── Signal 1: Budget Discipline (0–300) ───────────────────────────────────
    days_elapsed = (ctx["effective_today"] - ctx["cycle_start"]).days + 1
    days_under = sum(
        1 for i in range(days_elapsed)
        if daily.get(ctx["cycle_start"] + timedelta(days=i), 0.0) <= daily_limit
    )
    pct_under = days_under / days_elapsed if days_elapsed > 0 else 0.0
    score_discipline = round(pct_under * 300)

    # ── Signal 2: Saving Rate (0–250) ─────────────────────────────────────────
    spent_this_cycle = sum(daily.values())
    remaining = wallet.monthly_balance - spent_this_cycle

    # 2a: on track toward savings goal (0–125)
    if wallet.savings_goal > 0:
        rate_goal = max(0.0, min(remaining / wallet.savings_goal, 1.0))
        score_goal = round(rate_goal * 125)
    else:
        score_goal = 0

    # 2b: savings jar progress (0–125 with goal, 0–60 without)
    if wallet.jar_goal_amount > 0:
        rate_jar = min(wallet.savings_jar / wallet.jar_goal_amount, 1.0)
        score_jar = round(rate_jar * 125)
    elif wallet.savings_jar > 0:
        score_jar = round(min(wallet.savings_jar / 500.0, 1.0) * 60)
    else:
        score_jar = 0

    score_saving = score_goal + score_jar

    # ── Signal 3: Streak Strength (0–200) ────────────────────────────────────
    score_streak = round((min(current_streak, 30) / 30) * 200)

    # ── Signal 4: Category Cap Adherence (0–100) ─────────────────────────────
    capped_cats = [c for c in categories if c.monthly_cap is not None]
    if not capped_cats:
        score_caps = 50  # neutral — not penalised for not setting caps yet
    else:
        cats_under = sum(1 for c in capped_cats if cat_spent.get(c.id, 0.0) <= c.monthly_cap)
        score_caps = round((cats_under / len(capped_cats)) * 100)

    total = min(850, max(0, score_discipline + score_saving + score_streak + score_caps))

    # ── Label ─────────────────────────────────────────────────────────────────
    if total >= 700:
        label = "Excellent"
    elif total >= 550:
        label = "Good"
    elif total >= 350:
        label = "Fair"
    else:
        label = "Poor"

    # ── Tips — pick up to 3, weakest signals first ────────────────────────────
    tips: list[str] = []

    if pct_under < 0.9 and days_elapsed >= 3:
        if pct_under < 0.5:
            tips.append(
                "🎯 Try to stay under your daily limit — even 5 straight days moves "
                "your Budget Discipline score fast."
            )
        else:
            days_short = max(1, round(0.9 * days_elapsed) - days_under)
            tips.append(
                f"🎯 Stay under your daily limit {days_short} more day(s) this cycle "
                "to push your Budget Discipline score higher."
            )

    if current_streak == 0:
        tips.append(
            "🔥 Log an expense today that stays under your daily limit — "
            "that starts your streak and unlocks Streak Strength points."
        )
    elif current_streak < 7:
        left = 7 - current_streak
        tips.append(
            f"🔥 {current_streak}-day streak — keep it going! "
            f"{left} more day(s) unlocks 2× round-up saving."
        )
    elif current_streak < 14:
        tips.append(
            f"🔥 Awesome {current_streak}-day streak! "
            "Hit 14 days to max out your Streak Strength points."
        )

    if wallet.savings_goal > 0 and remaining < wallet.savings_goal and score_goal < 100:
        deficit = max(0, wallet.savings_goal - remaining)
        tips.append(
            f"💰 ₹{round(deficit):,} more in remaining balance would put you "
            "on track for your savings goal this cycle."
        )
    elif wallet.savings_goal == 0 and score_goal == 0:
        tips.append(
            "💰 Set a savings goal in Budgets to unlock the Saving Rate component "
            "of your PocketScore."
        )

    if wallet.savings_jar == 0 and not wallet.roundup_enabled and len(tips) < 3:
        tips.append(
            "🪙 Enable Round-up saving in Budgets — spare change from each expense "
            "builds your jar and boosts your Saving Rate score."
        )

    if capped_cats:
        over_cap = [c for c in capped_cats if cat_spent.get(c.id, 0.0) > c.monthly_cap]
        if over_cap and len(tips) < 3:
            cat = over_cap[0]
            tips.append(
                f"📊 '{cat.name}' is over its ₹{round(cat.monthly_cap):,} cap. "
                "Trimming it this cycle will lift your Category Adherence score."
            )

    if not tips:
        tips.append(
            "🌟 You're doing great! Keep spending under your daily limit every day "
            "to push toward an Excellent score."
        )

    return PocketScoreResponse(
        score=total,
        label=label,
        tips=tips[:3],
        score_discipline=score_discipline,
        score_saving=score_saving,
        score_streak=score_streak,
        score_caps=score_caps,
    )
