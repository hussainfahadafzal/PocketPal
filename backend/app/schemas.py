from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


# ── Auth / User ───────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8)


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None


# ── Wallet ────────────────────────────────────────────────────────────────────

class WalletCreate(BaseModel):
    monthly_balance: float = Field(default=0.0, ge=0)
    savings_goal: float = Field(default=0.0, ge=0)
    goal_name: Optional[str] = Field(default=None, max_length=60)


class WalletResponse(BaseModel):
    id: int
    user_id: int
    monthly_balance: float
    savings_goal: float
    goal_name: Optional[str]
    roundup_enabled: bool
    savings_jar: float
    jar_goal_amount: float
    jar_goal_name: Optional[str]

    model_config = {"from_attributes": True}


# ── Category ──────────────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    monthly_cap: Optional[float] = Field(default=None, ge=0)
    color: Optional[str] = None


class CategoryResponse(CategoryCreate):
    id: int
    user_id: int

    model_config = {"from_attributes": True}


# ── Expense ───────────────────────────────────────────────────────────────────

class ExpenseCreate(BaseModel):
    amount: float = Field(gt=0)
    note: Optional[str] = Field(default=None, max_length=120)
    category_id: Optional[int] = None


class ExpenseResponse(BaseModel):
    id: int
    user_id: int
    amount: float
    note: Optional[str]
    category_id: Optional[int]
    created_at: datetime
    roundup_spare: Optional[float]
    roundup_doubled: bool

    model_config = {"from_attributes": True}


# ── Pal nudges ────────────────────────────────────────────────────────────────

class Nudge(BaseModel):
    type: str
    message: str
    icon: str


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardResponse(BaseModel):
    daily_spend_limit: float
    spent_today: float
    spent_this_month: float
    balance_left: float
    days_left_in_month: int
    saved_vs_yesterday: float
    streak_days: int


# ── Streak calendar ───────────────────────────────────────────────────────────

class StreakDay(BaseModel):
    date: str          # "YYYY-MM-DD"
    under_limit: bool
    is_today: bool


class StreakCalendarResponse(BaseModel):
    days: List[StreakDay]
    current_streak: int


# ── Savings jar ───────────────────────────────────────────────────────────────

class RoundupToggleResponse(BaseModel):
    roundup_enabled: bool


class JarGoalRequest(BaseModel):
    jar_goal_name: str = Field(min_length=1, max_length=60)
    jar_goal_amount: float = Field(gt=0)


class JarResponse(BaseModel):
    savings_jar: float
    jar_goal_name: Optional[str]
    jar_goal_amount: float
    progress_pct: float   # 0–100; 0 when no goal set
    double_active: bool   # True when current_streak >= 7 (2× round-up active)


# ── PocketScore ───────────────────────────────────────────────────────────────

class PocketScoreResponse(BaseModel):
    score: int             # 0–850 composite
    label: str             # "Poor" | "Fair" | "Good" | "Excellent"
    tips: List[str]        # 2–3 actionable tips
    score_discipline: int  # 0–300 component
    score_saving: int      # 0–250 component
    score_streak: int      # 0–200 component
    score_caps: int        # 0–100 component
