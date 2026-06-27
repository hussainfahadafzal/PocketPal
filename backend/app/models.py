import random
import string
from datetime import datetime, timedelta

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float,
    ForeignKey, Integer, String, UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .database import Base


def generate_invite_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return "PKT-" + "".join(random.choices(chars, k=5))


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    invite_code = Column(String, unique=True, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    wallet = relationship("Wallet", back_populates="user", uselist=False, cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="user", cascade="all, delete-orphan")


class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    monthly_balance = Column(Float, default=0.0, nullable=False)
    savings_goal = Column(Float, default=0.0, nullable=False)
    goal_name = Column(String, nullable=True)

    roundup_enabled = Column(Boolean, default=False, nullable=False)
    savings_jar = Column(Float, default=0.0, nullable=False)
    jar_goal_amount = Column(Float, default=0.0, nullable=False)
    jar_goal_name = Column(String, nullable=True)

    cycle_start_date = Column(Date, nullable=True)
    next_refill_date = Column(Date, nullable=True)
    budget_mode = Column(String, nullable=True)

    user = relationship("User", back_populates="wallet")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    monthly_cap = Column(Float, nullable=True)
    color = Column(String, nullable=True)

    user = relationship("User", back_populates="categories")
    expenses = relationship("Expense", back_populates="category")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    amount = Column(Float, nullable=False)
    note = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    # Round-up fields
    roundup_spare = Column(Float, nullable=True)
    roundup_doubled = Column(Boolean, default=False, nullable=False)

    # Populated when this expense was auto-created from a split share
    split_share_id = Column(Integer, ForeignKey("split_shares.id"), nullable=True)

    user = relationship("User", back_populates="expenses")
    category = relationship("Category", back_populates="expenses")


# ── Password Reset ───────────────────────────────────────────────────────────

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    token      = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    used       = Column(Boolean, default=False, nullable=False)

    user = relationship("User")


# ── Social: Friendships ───────────────────────────────────────────────────────

class Friendship(Base):
    __tablename__ = "friendships"

    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    addressee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="pending", nullable=False)  # pending | accepted | rejected
    created_at = Column(DateTime, default=datetime.now)

    __table_args__ = (
        UniqueConstraint("requester_id", "addressee_id", name="uq_friendship_pair"),
    )

    requester = relationship("User", foreign_keys=[requester_id])
    addressee = relationship("User", foreign_keys=[addressee_id])


# ── Social: Groups ────────────────────────────────────────────────────────────

class Group(Base):
    __tablename__ = "split_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.now)

    creator = relationship("User", foreign_keys=[created_by])
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    split_expenses = relationship("SplitExpense", back_populates="group")


class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("split_groups.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    __table_args__ = (
        UniqueConstraint("group_id", "user_id", name="uq_group_member"),
    )

    group = relationship("Group", back_populates="members")
    user = relationship("User")


# ── Social: Split Expenses ────────────────────────────────────────────────────

class SplitExpense(Base):
    __tablename__ = "split_expenses"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, nullable=False)
    total_amount = Column(Float, nullable=False)
    paid_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("split_groups.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.now)

    paid_by = relationship("User", foreign_keys=[paid_by_user_id])
    creator = relationship("User", foreign_keys=[created_by])
    group = relationship("Group", back_populates="split_expenses")
    shares = relationship("SplitShare", back_populates="split_expense", cascade="all, delete-orphan")


class SplitShare(Base):
    __tablename__ = "split_shares"

    id = Column(Integer, primary_key=True, index=True)
    split_expense_id = Column(Integer, ForeignKey("split_expenses.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    share_amount = Column(Float, nullable=False)
    settled = Column(Boolean, default=False, nullable=False)
    settled_at = Column(DateTime, nullable=True)

    split_expense = relationship("SplitExpense", back_populates="shares")
    user = relationship("User")
