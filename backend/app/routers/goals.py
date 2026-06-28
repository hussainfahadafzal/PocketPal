from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Goal, User
from ..schemas import GoalCreate, GoalResponse, GoalUpdate

router = APIRouter(prefix="/goals", tags=["goals"])


def _resp(goal: Goal) -> GoalResponse:
    r = GoalResponse.model_validate(goal)
    if goal.target_amount > 0:
        r.progress_pct = round(min(100.0, goal.saved_amount / goal.target_amount * 100), 1)
    return r


def _get_own_goal(goal_id: int, db: Session, user: User) -> Goal:
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == user.id).first()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    return goal


@router.get("", response_model=List[GoalResponse])
def list_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goals = db.query(Goal).filter(Goal.user_id == current_user.id).order_by(Goal.created_at).all()
    return [_resp(g) for g in goals]


@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(
    payload: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = Goal(
        user_id=current_user.id,
        name=payload.name.strip(),
        emoji=payload.emoji,
        target_amount=payload.target_amount,
        saved_amount=payload.saved_amount,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return _resp(goal)


@router.patch("/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: int,
    payload: GoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = _get_own_goal(goal_id, db, current_user)
    if payload.name is not None:
        goal.name = payload.name.strip()
    if payload.emoji is not None:
        goal.emoji = payload.emoji
    if payload.target_amount is not None:
        goal.target_amount = payload.target_amount
    if payload.saved_amount is not None:
        goal.saved_amount = payload.saved_amount
    db.commit()
    db.refresh(goal)
    return _resp(goal)


@router.delete("/{goal_id}", status_code=status.HTTP_200_OK)
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = _get_own_goal(goal_id, db, current_user)
    db.delete(goal)
    db.commit()
    return {"detail": "Goal deleted."}
