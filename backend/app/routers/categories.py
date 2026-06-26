import calendar
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Category, Expense, User, Wallet
from ..schemas import CategoryCreate, CategoryResponse
from ..utils import get_cycle_context

router = APIRouter(prefix="/categories", tags=["categories"])


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category = Category(user_id=current_user.id, **payload.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.get("", response_model=List[CategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Category).filter(Category.user_id == current_user.id).all()


@router.get("/spending", response_model=Dict[int, float])
def get_category_spending(
    month: Optional[str] = Query(None, description="YYYY-MM, defaults to current calendar month"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return {category_id: total_spent} for the given calendar month, computed
    via JOIN so results always use current category IDs (no stale-ID mismatch).
    """
    from datetime import date as date_type
    today = date_type.today()
    if month:
        try:
            year, m = (int(p) for p in month.split("-"))
        except (ValueError, AttributeError):
            raise HTTPException(status_code=400, detail="month must be YYYY-MM")
    else:
        year, m = today.year, today.month

    last_day = calendar.monthrange(year, m)[1]
    start_dt = datetime(year, m, 1)
    end_dt   = datetime(year, m, last_day, 23, 59, 59)

    # Pull only expenses that still belong to an existing category (JOIN)
    rows = (
        db.query(Expense)
        .join(Category, Category.id == Expense.category_id)
        .filter(
            Expense.user_id == current_user.id,
            Category.user_id == current_user.id,
            Expense.created_at >= start_dt,
            Expense.created_at <= end_dt,
        )
        .all()
    )

    totals: Dict[int, float] = defaultdict(float)
    for exp in rows:
        totals[exp.category_id] += exp.amount
    return dict(totals)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category = (
        db.query(Category)
        .filter(Category.id == category_id, Category.user_id == current_user.id)
        .first()
    )
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    db.delete(category)
    db.commit()
