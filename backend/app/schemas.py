from datetime import date, datetime
from typing import Annotated, List, Optional

from pydantic import BaseModel, EmailStr, Field, PlainSerializer, model_validator

# Naive datetimes from the DB are UTC. Appending Z tells the browser to treat
# them as UTC so it converts to the user's local timezone correctly.
UtcDatetime = Annotated[
    datetime,
    PlainSerializer(lambda v: v.strftime('%Y-%m-%dT%H:%M:%SZ'), return_type=str),
]


# ── Auth / User ───────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8)


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    invite_code: Optional[str] = None
    created_at: UtcDatetime

    model_config = {"from_attributes": True}


class UserMini(BaseModel):
    id: int
    name: str
    email: str
    invite_code: Optional[str] = None

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
    monthly_balance: float = Field(gt=0)
    savings_goal: float = Field(default=0.0, ge=0)
    goal_name: Optional[str] = Field(default=None, max_length=60)
    # Budget cycle — one of these is required on first setup; both optional on updates
    next_refill_date: Optional[date] = None          # Mode 1: user picks a specific date
    number_of_days: Optional[int] = Field(default=None, ge=1, le=366)  # Mode 2: N days from today


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
    # Cycle fields (stored)
    cycle_start_date: Optional[date] = None
    next_refill_date: Optional[date] = None
    budget_mode: Optional[str] = None
    # Computed at read time (not DB columns — populated by _wallet_response helper)
    cycle_expired: bool = False
    days_left: int = 0

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
    created_at: UtcDatetime
    roundup_spare: Optional[float]
    roundup_doubled: bool
    split_share_id: Optional[int] = None

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
    spent_this_month: float        # cycle spend (field name kept for frontend compat)
    balance_left: float
    days_left_in_month: int        # cycle days left (field name kept for frontend compat)
    saved_vs_yesterday: float
    streak_days: int
    next_refill_date: Optional[str] = None  # ISO date string, e.g. "2026-07-15"
    cycle_expired: bool = False


# ── Streak calendar ───────────────────────────────────────────────────────────

class StreakDay(BaseModel):
    date: str          # "YYYY-MM-DD"
    under_limit: bool
    is_today: bool


class StreakCalendarResponse(BaseModel):
    days: List[StreakDay]
    current_streak: int
    cycle_start: str   # ISO date — first day of this cycle
    cycle_end: str     # ISO date — last day of this cycle (next_refill_date)


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


# ── Friends ───────────────────────────────────────────────────────────────────

class FriendRequestCreate(BaseModel):
    email: Optional[EmailStr] = None
    invite_code: Optional[str] = None

    @model_validator(mode="after")
    def require_one(self):
        if not self.email and not self.invite_code:
            raise ValueError("Provide either email or invite_code")
        return self


class FriendshipResponse(BaseModel):
    id: int
    status: str
    created_at: UtcDatetime
    requester: UserMini
    addressee: UserMini

    model_config = {"from_attributes": True}


# ── Groups ────────────────────────────────────────────────────────────────────

class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    member_user_ids: List[int]


class GroupMemberResponse(BaseModel):
    user_id: int
    user: UserMini

    model_config = {"from_attributes": True}


class GroupResponse(BaseModel):
    id: int
    name: str
    created_by: int
    created_at: UtcDatetime
    members: List[GroupMemberResponse]

    model_config = {"from_attributes": True}


# ── Splits ────────────────────────────────────────────────────────────────────

class ShareInput(BaseModel):
    user_id: int
    share_amount: float = Field(gt=0)


class SplitCreate(BaseModel):
    description: str = Field(min_length=1, max_length=120)
    total_amount: float = Field(gt=0)
    paid_by: int                          # user_id of whoever paid the full bill
    group_id: Optional[int] = None
    equal_split: bool = False             # if True, divide equally among participants
    participants: Optional[List[int]] = None  # used with equal_split=True
    shares: Optional[List[ShareInput]] = None  # used with equal_split=False

    @model_validator(mode="after")
    def validate_split_mode(self):
        if self.equal_split:
            if not self.participants:
                raise ValueError("participants is required when equal_split is True")
        else:
            if not self.shares:
                raise ValueError("shares is required when equal_split is False")
        return self


class SplitShareResponse(BaseModel):
    id: int
    user_id: int
    share_amount: float
    settled: bool
    settled_at: Optional[UtcDatetime]
    user: UserMini

    model_config = {"from_attributes": True}


class SplitResponse(BaseModel):
    id: int
    description: str
    total_amount: float
    paid_by_user_id: int
    paid_by: UserMini
    group_id: Optional[int]
    created_at: UtcDatetime
    shares: List[SplitShareResponse]

    model_config = {"from_attributes": True}


class BalanceEntry(BaseModel):
    friend: UserMini
    net_amount: float    # absolute value of the net
    you_owe: float       # how much you owe them (0 if they owe you)
    they_owe: float      # how much they owe you (0 if you owe them)


class SettleRequest(BaseModel):
    friend_user_id: int


# ── Password reset ────────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)
