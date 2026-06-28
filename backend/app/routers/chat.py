from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import DirectMessage, Friendship, User
from ..schemas import DirectMessageCreate, DirectMessageResponse

router = APIRouter(prefix="/chat", tags=["chat"])


def _are_friends(db: Session, user_id: int, friend_id: int) -> bool:
    return (
        db.query(Friendship)
        .filter(
            or_(
                and_(Friendship.requester_id == user_id, Friendship.addressee_id == friend_id),
                and_(Friendship.requester_id == friend_id, Friendship.addressee_id == user_id),
            ),
            Friendship.status == "accepted",
        )
        .first()
    ) is not None


@router.get("/{friend_id}", response_model=list[DirectMessageResponse])
def list_messages(
    friend_id: int,
    since_id: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _are_friends(db, current_user.id, friend_id):
        raise HTTPException(403, "Not friends")

    messages = (
        db.query(DirectMessage)
        .filter(
            or_(
                and_(DirectMessage.sender_id == current_user.id, DirectMessage.receiver_id == friend_id),
                and_(DirectMessage.sender_id == friend_id, DirectMessage.receiver_id == current_user.id),
            ),
            DirectMessage.id > since_id,
        )
        .order_by(DirectMessage.created_at)
        .limit(100)
        .all()
    )

    result = []
    for m in messages:
        r = DirectMessageResponse.model_validate(m)
        r.sender_name = m.sender.name
        r.is_mine = m.sender_id == current_user.id
        result.append(r)
    return result


@router.post("/{friend_id}", response_model=DirectMessageResponse, status_code=201)
def send_message(
    friend_id: int,
    body: DirectMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _are_friends(db, current_user.id, friend_id):
        raise HTTPException(403, "Not friends")

    msg = DirectMessage(
        sender_id=current_user.id,
        receiver_id=friend_id,
        content=body.content.strip(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    r = DirectMessageResponse.model_validate(msg)
    r.sender_name = current_user.name
    r.is_mine = True
    return r
