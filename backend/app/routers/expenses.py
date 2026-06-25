import calendar
import math
from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Expense, User, Wallet
from ..schemas import ExpenseCreate, ExpenseResponse
from ..utils import (
    compute_current_streak,
    get_cycle_context,
    get_daily_spend_limit,
    get_daily_totals_for_cycle,
)

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()

    roundup_spare: Optional[float] = None
    roundup_doubled: bool = False

    if wallet and wallet.roundup_enabled:
        # Round up to the next multiple of ₹10
        next_10 = math.ceil(payload.amount / 10) * 10
        spare = round(next_10 - payload.amount, 2)

        if spare > 0:
            today = date.today()
            # Compute streak BEFORE this expense is saved (pre-save totals)
            ctx = get_cycle_context(wallet, today)
            daily = get_daily_totals_for_cycle(db, current_user.id, ctx["cycle_start"], ctx["effective_today"])
            limit = get_daily_spend_limit(wallet, daily, today)
            streak = compute_current_streak(daily, limit, ctx["effective_today"], ctx["cycle_start"])

            # 2× bonus when streak >= 7 consecutive under-limit days
            if streak >= 7:
                spare = round(spare * 2, 2)
                roundup_doubled = True

            roundup_spare = spare
            wallet.savings_jar = round(wallet.savings_jar + spare, 2)

    expense = Expense(
        user_id=current_user.id,
        roundup_spare=roundup_spare,
        roundup_doubled=roundup_doubled,
        **payload.model_dump(),
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.get("", response_model=List[ExpenseResponse])
def list_expenses(
    month: Optional[str] = None,
    category_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Expense).filter(Expense.user_id == current_user.id)

    if month is not None:
        try:
            year, m = month.split("-")
            year, m = int(year), int(m)
        except (ValueError, AttributeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="month must be in YYYY-MM format",
            )
        last_day = calendar.monthrange(year, m)[1]
        query = query.filter(
            Expense.created_at >= datetime(year, m, 1),
            Expense.created_at <= datetime(year, m, last_day, 23, 59, 59),
        )

    if category_id is not None:
        query = query.filter(Expense.category_id == category_id)

    return query.order_by(Expense.created_at.desc()).all()


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = (
        db.query(Expense)
        .filter(Expense.id == expense_id, Expense.user_id == current_user.id)
        .first()
    )
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    db.delete(expense)
    db.commit()
