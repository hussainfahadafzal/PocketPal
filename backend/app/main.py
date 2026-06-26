import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .database import Base, engine
from .models import generate_invite_code
from .routers import auth as auth_router
from .routers import categories as categories_router
from .routers import dashboard as dashboard_router
from .routers import expenses as expenses_router
from .routers import friends as friends_router
from .routers import groups as groups_router
from .routers import pal as pal_router
from .routers import pocketscore as pocketscore_router
from .routers import splits as splits_router
from .routers import streak as streak_router
from .routers import wallet as wallet_router

app = FastAPI(title="PocketPal API", version="1.0.0")

_origins = ["http://localhost:5173", "http://localhost:4173"]
if os.getenv("FRONTEND_URL"):
    _origins.append(os.getenv("FRONTEND_URL").rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _migrate():
    """
    Add new columns to existing tables without touching existing data.
    Safe to run on every startup (idempotent via PRAGMA table_info checks).
    """
    with engine.connect() as conn:
        # ── wallets ──────────────────────────────────────────────────────────
        existing_wallet_cols = {
            row[1] for row in conn.execute(text("PRAGMA table_info(wallets)"))
        }
        new_wallet_cols = [
            ("roundup_enabled",  "BOOLEAN NOT NULL DEFAULT 0"),
            ("savings_jar",      "FLOAT    NOT NULL DEFAULT 0.0"),
            ("jar_goal_amount",  "FLOAT    NOT NULL DEFAULT 0.0"),
            ("jar_goal_name",    "VARCHAR"),
            ("cycle_start_date", "DATE"),
            ("next_refill_date", "DATE"),
            ("budget_mode",      "VARCHAR"),
        ]
        for col, definition in new_wallet_cols:
            if col not in existing_wallet_cols:
                conn.execute(text(f"ALTER TABLE wallets ADD COLUMN {col} {definition}"))

        # ── expenses ─────────────────────────────────────────────────────────
        existing_expense_cols = {
            row[1] for row in conn.execute(text("PRAGMA table_info(expenses)"))
        }
        new_expense_cols = [
            ("roundup_spare",    "FLOAT"),
            ("roundup_doubled",  "BOOLEAN NOT NULL DEFAULT 0"),
            ("split_share_id",   "INTEGER"),           # FK to split_shares, nullable
        ]
        for col, definition in new_expense_cols:
            if col not in existing_expense_cols:
                conn.execute(text(f"ALTER TABLE expenses ADD COLUMN {col} {definition}"))

        # ── users: invite_code ────────────────────────────────────────────────
        existing_user_cols = {
            row[1] for row in conn.execute(text("PRAGMA table_info(users)"))
        }
        if "invite_code" not in existing_user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN invite_code VARCHAR"))
            # Backfill existing users with unique invite codes
            users = conn.execute(text("SELECT id FROM users")).fetchall()
            used: set[str] = set()
            for (uid,) in users:
                code = generate_invite_code()
                while code in used:
                    code = generate_invite_code()
                used.add(code)
                conn.execute(
                    text("UPDATE users SET invite_code = :code WHERE id = :uid"),
                    {"code": code, "uid": uid},
                )

        conn.commit()


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)  # create brand-new tables (splits, groups, etc.)
    _migrate()                              # add new columns to existing tables


app.include_router(auth_router.router)
app.include_router(wallet_router.router)
app.include_router(categories_router.router)
app.include_router(expenses_router.router)
app.include_router(dashboard_router.router)
app.include_router(pal_router.router)
app.include_router(streak_router.router)
app.include_router(pocketscore_router.router)
app.include_router(friends_router.router)
app.include_router(groups_router.router)
app.include_router(splits_router.router)


@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok", "app": "PocketPal"}
