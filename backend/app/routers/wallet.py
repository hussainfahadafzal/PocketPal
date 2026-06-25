from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import User, Wallet
from ..schemas import WalletCreate, WalletResponse

router = APIRouter(prefix="/wallet", tags=["wallet"])


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
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    if not wallet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet not set up yet")
    return wallet
