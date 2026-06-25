from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import User, Wallet
from ..schemas import (
    JarGoalRequest,
    JarResponse,
    RoundupToggleResponse,
    WalletCreate,
    WalletResponse,
)
from ..utils import compute_current_streak, get_daily_spend_limit, get_daily_totals_for_month

router = APIRouter(prefix="/wallet", tags=["wallet"])


def _get_wallet_or_404(db: Session, user_id: int) -> Wallet:
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if not wallet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet not set up yet")
    return wallet


@router.post("", response_model=WalletResponse)
def upsert_wallet(
    payload: WalletCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    if wallet:
        wallet.monthly_balance = payload.monthly_balance
        wallet.savings_goal = payload.savings_goal
        wallet.goal_name = payload.goal_name
    else:
        wallet = Wallet(user_id=current_user.id, **payload.model_dump())
        db.add(wallet)
    db.commit()
    db.refresh(wallet)
    return wallet


@router.get("", response_model=WalletResponse)
def get_wallet(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_wallet_or_404(db, current_user.id)


# ── Round-up jar endpoints ────────────────────────────────────────────────────

@router.post("/roundup", response_model=RoundupToggleResponse)
def toggle_roundup(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Toggle round-up saving on/off for the current user."""
    wallet = _get_wallet_or_404(db, current_user.id)
    wallet.roundup_enabled = not wallet.roundup_enabled
    db.commit()
    return RoundupToggleResponse(roundup_enabled=wallet.roundup_enabled)


@router.post("/jar-goal", response_model=WalletResponse)
def set_jar_goal(
    payload: JarGoalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Set or update the savings-jar goal name and target amount."""
    wallet = _get_wallet_or_404(db, current_user.id)
    wallet.jar_goal_name = payload.jar_goal_name
    wallet.jar_goal_amount = payload.jar_goal_amount
    db.commit()
    db.refresh(wallet)
    return wallet


@router.get("/jar", response_model=JarResponse)
def get_jar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return savings-jar totals, goal progress, and whether the 2× round-up
    bonus is currently active (streak >= 7 days).
    """
    wallet = _get_wallet_or_404(db, current_user.id)

    today = date.today()
    daily = get_daily_totals_for_month(db, current_user.id, today.year, today.month)
    limit = get_daily_spend_limit(wallet, daily, today)
    streak = compute_current_streak(daily, limit, today)

    progress_pct = 0.0
    if wallet.jar_goal_amount > 0:
        progress_pct = min(100.0, round((wallet.savings_jar / wallet.jar_goal_amount) * 100, 1))

    return JarResponse(
        savings_jar=wallet.savings_jar,
        jar_goal_name=wallet.jar_goal_name,
        jar_goal_amount=wallet.jar_goal_amount,
        progress_pct=progress_pct,
        double_active=streak >= 7,
    )
