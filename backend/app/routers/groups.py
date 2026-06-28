from collections import defaultdict
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Group, GroupMember, SplitExpense, SplitShare, User
from ..schemas import GroupBalanceEntry, GroupCreate, GroupResponse, UserMini

router = APIRouter(prefix="/groups", tags=["groups"])


def _simplify_debts(gross):
    net: dict = defaultdict(float)
    for debtor, creditor, amount in gross:
        net[debtor] -= amount
        net[creditor] += amount
    debtors   = sorted([(uid, -v) for uid, v in net.items() if v < -0.005], key=lambda x: x[1], reverse=True)
    creditors = sorted([(uid,  v) for uid, v in net.items() if v >  0.005], key=lambda x: x[1], reverse=True)
    result = []
    di = ci = 0
    while di < len(debtors) and ci < len(creditors):
        d_uid, d_amt = debtors[di]
        c_uid, c_amt = creditors[ci]
        pay = min(d_amt, c_amt)
        result.append((d_uid, c_uid, round(pay, 2)))
        debtors[di]   = (d_uid, round(d_amt - pay, 2))
        creditors[ci] = (c_uid, round(c_amt - pay, 2))
        if debtors[di][1]   < 0.005: di += 1
        if creditors[ci][1] < 0.005: ci += 1
    return result


@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(
    payload: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = Group(name=payload.name, created_by=current_user.id)
    db.add(group)
    db.flush()

    member_ids = set(payload.member_user_ids) | {current_user.id}
    for uid in member_ids:
        if not db.query(User).filter(User.id == uid).first():
            db.rollback()
            raise HTTPException(status_code=404, detail=f"User {uid} not found")
        db.add(GroupMember(group_id=group.id, user_id=uid))

    db.commit()
    db.refresh(group)
    return group


@router.get("", response_model=List[GroupResponse])
def list_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Group)
        .join(GroupMember, GroupMember.group_id == Group.id)
        .filter(GroupMember.user_id == current_user.id)
        .all()
    )


@router.get("/{group_id}", response_model=GroupResponse)
def get_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if not db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
    ).first():
        raise HTTPException(status_code=403, detail="You are not a member of this group")
    return group


@router.get("/{group_id}/balances", response_model=List[GroupBalanceEntry])
def group_balances(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
    ).first():
        raise HTTPException(status_code=403, detail="Not a member of this group")

    members = (
        db.query(User)
        .join(GroupMember, GroupMember.user_id == User.id)
        .filter(GroupMember.group_id == group_id)
        .all()
    )
    users_map = {m.id: m for m in members}

    rows = (
        db.query(SplitShare.user_id, SplitExpense.paid_by_user_id, SplitShare.share_amount)
        .join(SplitExpense, SplitExpense.id == SplitShare.split_expense_id)
        .filter(
            SplitExpense.group_id == group_id,
            SplitShare.settled.is_(False),
            SplitShare.user_id != SplitExpense.paid_by_user_id,
        )
        .all()
    )

    gross = [(debtor, creditor, float(amount)) for debtor, creditor, amount in rows]
    if not gross:
        return []

    result = []
    for debtor_id, creditor_id, amount in _simplify_debts(gross):
        debtor   = users_map.get(debtor_id)
        creditor = users_map.get(creditor_id)
        if not debtor or not creditor:
            continue
        result.append(GroupBalanceEntry(
            debtor=UserMini.model_validate(debtor),
            creditor=UserMini.model_validate(creditor),
            amount=amount,
        ))
    return result
