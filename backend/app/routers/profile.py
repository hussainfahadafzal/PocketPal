from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import get_current_user, hash_password, verify_password
from ..database import get_db
from ..models import (
    Friendship,
    GroupMember,
    PasswordResetToken,
    SplitExpense,
    SplitShare,
    User,
    Wallet,
)
from ..schemas import ChangePasswordRequest, UpdateProfileRequest, UserResponse
from ..utils import today_ist

router = APIRouter(prefix="/profile", tags=["profile"])


@router.patch("", response_model=UserResponse)
def update_profile(
    payload: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.name is not None:
        current_user.name = payload.name.strip()

    if payload.email is not None and payload.email != current_user.email:
        taken = db.query(User).filter(
            User.email == payload.email,
            User.id != current_user.id,
        ).first()
        if taken:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="That email is already registered to another account.",
            )
        current_user.email = payload.email

    # Update wallet fields only when a wallet already exists
    wallet_fields_sent = any(
        v is not None for v in [
            payload.monthly_balance,
            payload.savings_goal,
            payload.goal_name,
            payload.next_refill_date,
            payload.number_of_days,
        ]
    )
    if wallet_fields_sent:
        wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
        if wallet:
            if payload.monthly_balance is not None:
                wallet.monthly_balance = payload.monthly_balance
            if payload.savings_goal is not None:
                wallet.savings_goal = payload.savings_goal
            if payload.goal_name is not None:
                wallet.goal_name = payload.goal_name
            today = today_ist()
            if payload.next_refill_date is not None:
                if payload.next_refill_date <= today:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="next_refill_date must be a future date.",
                    )
                wallet.cycle_start_date = today
                wallet.next_refill_date = payload.next_refill_date
                wallet.budget_mode = "date"
            elif payload.number_of_days is not None:
                wallet.cycle_start_date = today
                wallet.next_refill_date = today + timedelta(days=payload.number_of_days)
                wallet.budget_mode = "days"

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"detail": "Password changed successfully."}


@router.delete("", status_code=status.HTTP_200_OK)
def delete_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uid = current_user.id

    # Remove non-cascading associations before deleting the user row
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == uid
    ).delete(synchronize_session=False)

    db.query(Friendship).filter(
        (Friendship.requester_id == uid) | (Friendship.addressee_id == uid)
    ).delete(synchronize_session=False)

    db.query(GroupMember).filter(
        GroupMember.user_id == uid
    ).delete(synchronize_session=False)

    # SplitShares where user is a participant
    db.query(SplitShare).filter(
        SplitShare.user_id == uid
    ).delete(synchronize_session=False)

    # SplitExpenses owned (paid/created) by this user — delete their shares first
    owned_split_ids = [
        row[0] for row in db.query(SplitExpense.id).filter(
            (SplitExpense.paid_by_user_id == uid) | (SplitExpense.created_by == uid)
        ).all()
    ]
    if owned_split_ids:
        db.query(SplitShare).filter(
            SplitShare.split_expense_id.in_(owned_split_ids)
        ).delete(synchronize_session=False)
        db.query(SplitExpense).filter(
            SplitExpense.id.in_(owned_split_ids)
        ).delete(synchronize_session=False)

    # User.wallet, .categories, .expenses all have cascade="all, delete-orphan"
    db.delete(current_user)
    db.commit()
    return {"detail": "Account deleted."}
