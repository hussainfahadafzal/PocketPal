from collections import defaultdict
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Expense, Group, GroupMember, SplitExpense, SplitShare, User
from ..schemas import BalanceEntry, SettleRequest, SplitCreate, SplitResponse, UserMini

router = APIRouter(prefix="/splits", tags=["splits"])

_TOLERANCE = 0.01  # ₹0.01 rounding tolerance for share validation


# ── Debt simplification ───────────────────────────────────────────────────────

def _collect_network_debts(
    db: Session, user_id: int
) -> tuple[list[tuple[int, int, float]], dict[int, User]]:
    """
    Find every user directly connected to `user_id` through unsettled splits,
    then pull all gross debts between every pair in that network.

    Returns:
        gross  – list of (debtor_id, creditor_id, amount) for each unsettled share
        users  – {id: User} cache for every person in the network
    """
    network: set[int] = {user_id}

    # Users who owe current_user (their shares in current_user-paid splits)
    for (uid,) in (
        db.query(SplitShare.user_id)
        .join(SplitExpense, SplitExpense.id == SplitShare.split_expense_id)
        .filter(
            SplitExpense.paid_by_user_id == user_id,
            SplitShare.user_id != user_id,
            SplitShare.settled.is_(False),
        )
        .distinct()
        .all()
    ):
        network.add(uid)

    # Users current_user owes (payers of splits current_user is in)
    for (uid,) in (
        db.query(SplitExpense.paid_by_user_id)
        .join(SplitShare, SplitShare.split_expense_id == SplitExpense.id)
        .filter(
            SplitShare.user_id == user_id,
            SplitExpense.paid_by_user_id != user_id,
            SplitShare.settled.is_(False),
        )
        .distinct()
        .all()
    ):
        network.add(uid)

    # All unsettled shares between every pair in the network
    rows = (
        db.query(
            SplitShare.user_id,
            SplitExpense.paid_by_user_id,
            SplitShare.share_amount,
        )
        .join(SplitExpense, SplitExpense.id == SplitShare.split_expense_id)
        .filter(
            SplitShare.settled.is_(False),
            SplitShare.user_id.in_(network),
            SplitExpense.paid_by_user_id.in_(network),
            SplitShare.user_id != SplitExpense.paid_by_user_id,  # skip payer's own share
        )
        .all()
    )

    gross = [(debtor, creditor, float(amount)) for debtor, creditor, amount in rows]
    users = {u.id: u for u in db.query(User).filter(User.id.in_(network)).all()}
    return gross, users


def _simplify_debts(
    gross: list[tuple[int, int, float]],
) -> list[tuple[int, int, float]]:
    """
    Min Cash Flow — reduce N gross bilateral debts to the minimum number of
    transactions that leaves everyone's net position unchanged.

    ALGORITHM
    ---------
    Step 1 — Net positions.
        For every person i, compute:
            net[i] = Σ(amounts owed TO i) − Σ(amounts i OWES)
        Positive net[i] → i is a net creditor (should receive).
        Negative net[i] → i is a net debtor (should pay).

    Step 2 — Greedy matching.
        While there are unresolved debtors and creditors:
            d = debtor with the largest outstanding debt
            c = creditor owed the most
            payment = min(|d.net|, c.net)
            Record transaction d → c for `payment`.
            Reduce both nets by `payment`; remove any that reach 0.

    EXAMPLE
        Alice pays ₹600 dinner split 3 ways → B owes Alice ₹200, C owes Alice ₹200.
        Bob pays ₹300 taxi split 3 ways   → Alice owes Bob ₹100, C owes Bob ₹100.

        Gross debts: B→A ₹200, C→A ₹200, A→B ₹100, C→B ₹100
        Net:  A = +200+200−100 = +300 (creditor)
              B = −200+100+100 = 0    (balanced — drops out!)
              C = −200−100     = −300 (debtor)

        Result: C → A ₹300  (1 transaction, down from 4).

    COMPLEXITY  O(n log n) sort + O(n) greedy scan; n = unique people.

    NOTE  The simplified set is not unique; different greedy orderings produce
    equivalent solutions. Settlement still happens pair-wise in the DB — this
    function produces the DISPLAY view only.
    """
    net: dict[int, float] = defaultdict(float)
    for debtor, creditor, amount in gross:
        net[debtor] -= amount
        net[creditor] += amount

    # Separate into mutable lists sorted largest-first
    debtors   = sorted(
        [(uid, -v) for uid, v in net.items() if v < -0.005],
        key=lambda x: x[1], reverse=True,
    )
    creditors = sorted(
        [(uid,  v) for uid, v in net.items() if v >  0.005],
        key=lambda x: x[1], reverse=True,
    )

    result: list[tuple[int, int, float]] = []
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


# ── Helpers ───────────────────────────────────────────────────────────────────

def _resolve_shares(payload: SplitCreate):
    """Return list of {user_id, share_amount} from either equal_split or custom shares."""
    if payload.equal_split:
        participants = list(set(payload.participants) | {payload.paid_by})
        count = len(participants)
        each = round(payload.total_amount / count, 2)
        shares = [{"user_id": uid, "share_amount": each} for uid in participants]
        diff = round(payload.total_amount - each * count, 2)
        shares[-1]["share_amount"] = round(shares[-1]["share_amount"] + diff, 2)
        return shares
    return [s.model_dump() for s in payload.shares]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("", response_model=SplitResponse, status_code=status.HTTP_201_CREATED)
def create_split(
    payload: SplitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shares = _resolve_shares(payload)

    total_shares = sum(s["share_amount"] for s in shares)
    if abs(total_shares - payload.total_amount) > _TOLERANCE:
        raise HTTPException(
            status_code=400,
            detail=f"Shares sum to {total_shares:.2f} but total is {payload.total_amount:.2f}",
        )

    if not db.query(User).filter(User.id == payload.paid_by).first():
        raise HTTPException(status_code=404, detail=f"Payer user {payload.paid_by} not found")

    if payload.group_id:
        if not db.query(Group).filter(Group.id == payload.group_id).first():
            raise HTTPException(status_code=404, detail="Group not found")
        for s in shares:
            if not db.query(GroupMember).filter(
                GroupMember.group_id == payload.group_id,
                GroupMember.user_id == s["user_id"],
            ).first():
                raise HTTPException(
                    status_code=400,
                    detail=f"User {s['user_id']} is not a member of this group",
                )

    split = SplitExpense(
        description=payload.description,
        total_amount=payload.total_amount,
        paid_by_user_id=payload.paid_by,
        group_id=payload.group_id,
        created_by=current_user.id,
    )
    db.add(split)
    db.flush()

    for s in shares:
        user = db.query(User).filter(User.id == s["user_id"]).first()
        if not user:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"User {s['user_id']} not found")

        share = SplitShare(
            split_expense_id=split.id,
            user_id=s["user_id"],
            share_amount=s["share_amount"],
        )
        db.add(share)
        db.flush()

        # Auto-create a budget Expense so each person's share counts toward
        # their daily spend limit on the Dashboard — no extra integration needed.
        db.add(Expense(
            user_id=s["user_id"],
            amount=s["share_amount"],
            note=f"Split: {payload.description}",
            category_id=None,
            split_share_id=share.id,
        ))

    db.commit()
    db.refresh(split)
    return split


@router.get("", response_model=List[SplitResponse])
def list_splits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    participant_split_ids = (
        db.query(SplitShare.split_expense_id)
        .filter(SplitShare.user_id == current_user.id)
        .subquery()
    )
    return (
        db.query(SplitExpense)
        .filter(
            or_(
                SplitExpense.paid_by_user_id == current_user.id,
                SplitExpense.id.in_(participant_split_ids),
            )
        )
        .order_by(SplitExpense.created_at.desc())
        .all()
    )


@router.get("/balances", response_model=List[BalanceEntry])
def get_balances(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return the SIMPLIFIED balance list for the current user using the
    Min Cash Flow algorithm (see _simplify_debts for full documentation).

    Why simplification matters
    --------------------------
    Without simplification, each pair shows a gross bilateral balance that
    can be noisy.  A owes B ₹200 AND B owes A ₹100 → really A owes B ₹100.
    Across a whole network (dinner + taxi + hotel), the minimum-transaction
    picture is far cleaner: one payment per person instead of many.

    Settlement behaviour
    --------------------
    The simplified view is a DISPLAY optimisation.  Clicking "Settle up"
    still marks the underlying pair-wise split_shares as settled (the actual
    DB records).  After each settlement the balances are re-fetched and
    re-simplified, so the picture stays accurate.
    """
    gross, users = _collect_network_debts(db, current_user.id)
    if not gross:
        return []

    simplified = _simplify_debts(gross)

    # Keep only transactions that directly involve the current user
    result: list[BalanceEntry] = []
    for debtor_id, creditor_id, amount in simplified:
        if current_user.id not in (debtor_id, creditor_id):
            continue

        other_id = creditor_id if debtor_id == current_user.id else debtor_id
        other = users.get(other_id)
        if not other:
            continue

        you_owe   = round(amount, 2) if debtor_id   == current_user.id else 0.0
        they_owe  = round(amount, 2) if creditor_id == current_user.id else 0.0

        result.append(BalanceEntry(
            friend=UserMini(
                id=other.id,
                name=other.name,
                email=other.email,
                invite_code=other.invite_code,
            ),
            net_amount=round(amount, 2),
            you_owe=you_owe,
            they_owe=they_owe,
        ))

    return sorted(result, key=lambda x: x.net_amount, reverse=True)


@router.post("/settle")
def settle(
    payload: SettleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mark every unsettled split_share between the caller and friend_user_id
    as settled.  Both directions are cleared (i.e. shares the friend owes
    the caller AND shares the caller owes the friend).

    After settlement the caller should re-fetch /splits/balances — the
    simplified view will update automatically because the underlying gross
    debts have changed.
    """
    friend_id = payload.friend_user_id
    if friend_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot settle with yourself")
    if not db.query(User).filter(User.id == friend_id).first():
        raise HTTPException(status_code=404, detail="User not found")

    shares = (
        db.query(SplitShare)
        .join(SplitExpense, SplitExpense.id == SplitShare.split_expense_id)
        .filter(
            SplitShare.settled.is_(False),
            or_(
                and_(
                    SplitShare.user_id == current_user.id,
                    SplitExpense.paid_by_user_id == friend_id,
                ),
                and_(
                    SplitShare.user_id == friend_id,
                    SplitExpense.paid_by_user_id == current_user.id,
                ),
            ),
        )
        .all()
    )

    now = datetime.now()
    for share in shares:
        share.settled = True
        share.settled_at = now

    db.commit()
    return {"settled_count": len(shares), "with_user": friend_id}
