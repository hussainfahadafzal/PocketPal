from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Group, GroupMember, User
from ..schemas import GroupCreate, GroupResponse

router = APIRouter(prefix="/groups", tags=["groups"])


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
