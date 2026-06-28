from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Friendship, User
from ..schemas import FriendRequestCreate, FriendshipResponse, UserMini

router = APIRouter(prefix="/friends", tags=["friends"])


def _existing_friendship(db: Session, uid_a: int, uid_b: int) -> Friendship | None:
    return db.query(Friendship).filter(
        or_(
            and_(Friendship.requester_id == uid_a, Friendship.addressee_id == uid_b),
            and_(Friendship.requester_id == uid_b, Friendship.addressee_id == uid_a),
        )
    ).first()


@router.post("/request", response_model=FriendshipResponse, status_code=status.HTTP_201_CREATED)
def send_friend_request(
    payload: FriendRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.email:
        target = db.query(User).filter(User.email == payload.email).first()
        if not target:
            raise HTTPException(status_code=404, detail="No user found with that email")
    else:
        target = db.query(User).filter(User.invite_code == payload.invite_code).first()
        if not target:
            raise HTTPException(status_code=404, detail="No user found with that invite code")

    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot add yourself as a friend")

    existing = _existing_friendship(db, current_user.id, target.id)
    if existing:
        if existing.status == "accepted":
            raise HTTPException(status_code=400, detail="Already friends")
        if existing.status == "pending":
            raise HTTPException(status_code=400, detail="Friend request already pending")
        # Re-request after rejection
        existing.status = "pending"
        existing.requester_id = current_user.id
        existing.addressee_id = target.id
        db.commit()
        db.refresh(existing)
        return existing

    friendship = Friendship(requester_id=current_user.id, addressee_id=target.id)
    db.add(friendship)
    db.commit()
    db.refresh(friendship)
    return friendship


@router.post("/accept/{friendship_id}", response_model=FriendshipResponse)
def accept_request(
    friendship_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    f = db.query(Friendship).filter(Friendship.id == friendship_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Friend request not found")
    if f.addressee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your request to accept")
    if f.status != "pending":
        raise HTTPException(status_code=400, detail=f"Request is already {f.status}")
    f.status = "accepted"
    db.commit()
    db.refresh(f)
    return f


@router.post("/reject/{friendship_id}", response_model=FriendshipResponse)
def reject_request(
    friendship_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    f = db.query(Friendship).filter(Friendship.id == friendship_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Friend request not found")
    if f.addressee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your request to reject")
    if f.status != "pending":
        raise HTTPException(status_code=400, detail=f"Request is already {f.status}")
    f.status = "rejected"
    db.commit()
    db.refresh(f)
    return f


@router.get("", response_model=List[UserMini])
def list_friends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    friendships = db.query(Friendship).filter(
        Friendship.status == "accepted",
        or_(
            Friendship.requester_id == current_user.id,
            Friendship.addressee_id == current_user.id,
        ),
    ).all()
    return [
        f.addressee if f.requester_id == current_user.id else f.requester
        for f in friendships
    ]


@router.get("/requests", response_model=List[FriendshipResponse])
def incoming_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Friendship).filter(
        Friendship.addressee_id == current_user.id,
        Friendship.status == "pending",
    ).all()


@router.get("/requests/sent", response_model=List[FriendshipResponse])
def sent_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Friendship).filter(
        Friendship.requester_id == current_user.id,
        Friendship.status == "pending",
    ).all()


@router.post("/cancel/{friendship_id}", status_code=204)
def cancel_request(
    friendship_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    f = db.query(Friendship).filter(Friendship.id == friendship_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Friend request not found")
    if f.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your request to cancel")
    if f.status != "pending":
        raise HTTPException(status_code=400, detail=f"Request is already {f.status}")
    db.delete(f)
    db.commit()
