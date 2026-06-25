from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

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

    # ── Round-up jar ─────────────────────────────────────────────────────────
    roundup_enabled = Column(Boolean, default=False, nullable=False)
    savings_jar = Column(Float, default=0.0, nullable=False)
    jar_goal_amount = Column(Float, default=0.0, nullable=False)
    jar_goal_name = Column(String, nullable=True)

    # ── Budget cycle ──────────────────────────────────────────────────────────
    cycle_start_date = Column(Date, nullable=True)   # first day of current cycle
    next_refill_date = Column(Date, nullable=True)   # last day of current cycle
    budget_mode = Column(String, nullable=True)      # "date" | "days"

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
    created_at = Column(DateTime, default=datetime.utcnow)

    # ── Round-up fields (null when roundup was off at creation time) ──────────
    roundup_spare = Column(Float, nullable=True)
    roundup_doubled = Column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="expenses")
    category = relationship("Category", back_populates="expenses")
