from datetime import datetime
from time import time
import threading

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import DirectMessage, Friendship, User
from ..schemas import DirectMessageCreate, DirectMessageResponse

router = APIRouter(prefix="/chat", tags=["chat"])

# In-memory typing state: {(typer_id, receiver_id): last_typed_timestamp}
_typing: dict[tuple[int, int], float] = {}
_typing_lock = threading.Lock()
TYPING_TTL = 3.5  # seconds before "typing..." disappears


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


# ── Unread counts (no path param — must come before /{friend_id} routes) ─────

@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Total unread messages across all conversations for the current user."""
    try:
        count = (
            db.query(DirectMessage)
            .filter(
                DirectMessage.receiver_id == current_user.id,
                DirectMessage.is_read.is_(False),
            )
            .count()
        )
        return {"count": count}
    except Exception:
        return {"count": 0}


@router.get("/unread-per-friend")
def unread_per_friend(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unread count per sender — used to show per-conversation badges."""
    try:
        rows = (
            db.query(DirectMessage.sender_id, func.count(DirectMessage.id).label("cnt"))
            .filter(
                DirectMessage.receiver_id == current_user.id,
                DirectMessage.is_read.is_(False),
            )
            .group_by(DirectMessage.sender_id)
            .all()
        )
        return {str(row.sender_id): row.cnt for row in rows}
    except Exception:
        return {}


@router.get("/conversations")
def conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """All friend conversations with last message preview, sorted by recency."""
    friendships = (
        db.query(Friendship)
        .filter(
            or_(
                Friendship.requester_id == current_user.id,
                Friendship.addressee_id == current_user.id,
            ),
            Friendship.status == "accepted",
        )
        .all()
    )

    result = []
    for fs in friendships:
        friend_id = fs.addressee_id if fs.requester_id == current_user.id else fs.requester_id
        friend = db.query(User).filter(User.id == friend_id).first()
        if not friend:
            continue

        last_msg = (
            db.query(DirectMessage)
            .filter(
                or_(
                    and_(DirectMessage.sender_id == current_user.id, DirectMessage.receiver_id == friend_id),
                    and_(DirectMessage.sender_id == friend_id, DirectMessage.receiver_id == current_user.id),
                )
            )
            .order_by(DirectMessage.created_at.desc())
            .first()
        )

        unread = (
            db.query(func.count(DirectMessage.id))
            .filter(
                DirectMessage.sender_id == friend_id,
                DirectMessage.receiver_id == current_user.id,
                DirectMessage.is_read.is_(False),
            )
            .scalar()
        ) or 0

        result.append({
            "friend": {"id": friend.id, "name": friend.name, "email": friend.email},
            "last_message": last_msg.content if last_msg else None,
            "last_message_at": last_msg.created_at.strftime('%Y-%m-%dT%H:%M:%SZ') if last_msg else None,
            "last_message_mine": (last_msg.sender_id == current_user.id) if last_msg else False,
            "unread_count": unread,
        })

    result.sort(key=lambda x: x["last_message_at"] or "", reverse=True)
    return result


# ── Sub-path routes defined before /{friend_id} to avoid shadowing ───────────

@router.post("/{friend_id}/read", status_code=204)
def mark_read(
    friend_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all messages sent by friend to current_user as read."""
    if not _are_friends(db, current_user.id, friend_id):
        raise HTTPException(403, "Not friends")
    now = datetime.now()
    db.query(DirectMessage).filter(
        DirectMessage.sender_id == friend_id,
        DirectMessage.receiver_id == current_user.id,
        DirectMessage.is_read.is_(False),
    ).update({"is_read": True, "read_at": now}, synchronize_session=False)
    db.commit()


@router.get("/{friend_id}/read-status")
def read_status(
    friend_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the highest id of my messages that friend has already read."""
    if not _are_friends(db, current_user.id, friend_id):
        raise HTTPException(403, "Not friends")
    row = (
        db.query(DirectMessage.id)
        .filter(
            DirectMessage.sender_id == current_user.id,
            DirectMessage.receiver_id == friend_id,
            DirectMessage.is_read == True,  # noqa: E712
        )
        .order_by(DirectMessage.id.desc())
        .first()
    )
    return {"last_read_id": row[0] if row else 0}


@router.post("/{friend_id}/typing", status_code=204)
def set_typing(
    friend_id: int,
    current_user: User = Depends(get_current_user),
):
    """Register that current_user is actively typing to friend_id."""
    with _typing_lock:
        _typing[(current_user.id, friend_id)] = time()


@router.get("/{friend_id}/typing")
def get_typing(
    friend_id: int,
    current_user: User = Depends(get_current_user),
):
    """Return whether friend_id is currently typing to current_user."""
    with _typing_lock:
        ts = _typing.get((friend_id, current_user.id), 0.0)
    return {"is_typing": (time() - ts) < TYPING_TTL}


# ── Base message routes ───────────────────────────────────────────────────────

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
