from datetime import date, timedelta

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
from ..utils import (
    compute_current_streak,
    get_cycle_context,
    get_daily_spend_limit,
    get_daily_totals_for_cycle,
)

router = APIRouter(prefix="/wallet", tags=["wallet"])


def _get_wallet_or_404(db: Session, user_id: int) -> Wallet:
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if not wallet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet not set up yet")
    return wallet


def _wallet_response(wallet: Wallet, today: date) -> WalletResponse:
    """Build a WalletResponse with computed cycle fields attached."""
    ctx = get_cycle_context(wallet, today)
    resp = WalletResponse.model_validate(wallet)
    resp.cycle_expired = ctx["cycle_expired"]
    resp.days_left = ctx["days_left"]
    return resp


@router.post("", response_model=WalletResponse)
def upsert_wallet(
    payload: WalletCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()

    # ── Resolve cycle mode ────────────────────────────────────────────────────
    if payload.next_refill_date is not None:
        if payload.next_refill_date <= today:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="next_refill_date must be a future date",
            )
        new_cycle_start = today
        new_refill_date = payload.next_refill_date
        new_mode = "date"
    elif payload.number_of_days is not None:
        new_cycle_start = today
        new_refill_date = today + timedelta(days=payload.number_of_days)
        new_mode = "days"
    else:
        # No cycle info provided — OK only if wallet already has a cycle set
        new_cycle_start = new_refill_date = new_mode = None

    if wallet:
        wallet.monthly_balance = payload.monthly_balance
        wallet.savings_goal = payload.savings_goal
        wallet.goal_name = payload.goal_name
        if new_refill_date:
            # Cycle reset — start fresh from today
            wallet.cycle_start_date = new_cycle_start
            wallet.next_refill_date = new_refill_date
            wallet.budget_mode = new_mode
        elif not wallet.next_refill_date:
            # Existing wallet with no cycle (legacy) and no new cycle provided
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provide next_refill_date or number_of_days to set your budget cycle",
            )
    else:
        # First-time setup — cycle is required
        if not new_refill_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Choose a budget cycle: provide next_refill_date or number_of_days",
            )
        wallet = Wallet(
            user_id=current_user.id,
            monthly_balance=payload.monthly_balance,
            savings_goal=payload.savings_goal,
            goal_name=payload.goal_name,
            cycle_start_date=new_cycle_start,
            next_refill_date=new_refill_date,
            budget_mode=new_mode,
        )
        db.add(wallet)

    db.commit()
    db.refresh(wallet)
    return _wallet_response(wallet, today)


@router.get("", response_model=WalletResponse)
def get_wallet(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wallet = _get_wallet_or_404(db, current_user.id)
    return _wallet_response(wallet, date.today())


# ── Round-up jar endpoints ────────────────────────────────────────────────────

@router.post("/roundup", response_model=RoundupToggleResponse)
def toggle_roundup(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
    wallet = _get_wallet_or_404(db, current_user.id)
    wallet.jar_goal_name = payload.jar_goal_name
    wallet.jar_goal_amount = payload.jar_goal_amount
    db.commit()
    db.refresh(wallet)
    return _wallet_response(wallet, date.today())


@router.get("/jar", response_model=JarResponse)
def get_jar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return savings-jar totals, goal progress, and whether the 2× bonus is active."""
    wallet = _get_wallet_or_404(db, current_user.id)
    today = date.today()
    ctx = get_cycle_context(wallet, today)
    daily = get_daily_totals_for_cycle(db, current_user.id, ctx["cycle_start"], ctx["effective_today"])
    limit = get_daily_spend_limit(wallet, daily, today)
    streak = compute_current_streak(daily, limit, ctx["effective_today"], ctx["cycle_start"])

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
