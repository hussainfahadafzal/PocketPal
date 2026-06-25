from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


# --- Auth / User ---

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


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


# --- Wallet ---

class WalletCreate(BaseModel):
    monthly_balance: float = 0.0
    savings_goal: float = 0.0
    goal_name: Optional[str] = None


class WalletResponse(WalletCreate):
    id: int
    user_id: int

    model_config = {"from_attributes": True}


# --- Category ---

class CategoryCreate(BaseModel):
    name: str
    monthly_cap: Optional[float] = None
    color: Optional[str] = None


class CategoryResponse(CategoryCreate):
    id: int
    user_id: int

    model_config = {"from_attributes": True}


# --- Expense ---

class ExpenseCreate(BaseModel):
    amount: float
    note: Optional[str] = None
    category_id: Optional[int] = None


class ExpenseResponse(ExpenseCreate):
    id: int
    user_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Dashboard ---

class DashboardResponse(BaseModel):
    daily_spend_limit: float
    spent_today: float
    spent_this_month: float
    balance_left: float
    days_left_in_month: int
    saved_vs_yesterday: float
    streak_days: int
