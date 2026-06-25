from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .database import Base, engine
from .routers import auth as auth_router
from .routers import categories as categories_router
from .routers import dashboard as dashboard_router
from .routers import expenses as expenses_router
from .routers import pal as pal_router
from .routers import pocketscore as pocketscore_router
from .routers import streak as streak_router
from .routers import wallet as wallet_router

app = FastAPI(title="PocketPal API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _migrate():
    """
    Add new columns to existing tables without touching existing data.
    Uses SQLite PRAGMA to check which columns already exist so this is
    safe to run on every startup (idempotent).
    """
    with engine.connect() as conn:
        # ── wallets ──────────────────────────────────────────────────────────
        existing_wallet_cols = {
            row[1] for row in conn.execute(text("PRAGMA table_info(wallets)"))
        }
        new_wallet_cols = [
            ("roundup_enabled", "BOOLEAN NOT NULL DEFAULT 0"),
            ("savings_jar",     "FLOAT    NOT NULL DEFAULT 0.0"),
            ("jar_goal_amount", "FLOAT    NOT NULL DEFAULT 0.0"),
            ("jar_goal_name",   "VARCHAR"),
        ]
        for col, definition in new_wallet_cols:
            if col not in existing_wallet_cols:
                conn.execute(text(f"ALTER TABLE wallets ADD COLUMN {col} {definition}"))

        # ── expenses ─────────────────────────────────────────────────────────
        existing_expense_cols = {
            row[1] for row in conn.execute(text("PRAGMA table_info(expenses)"))
        }
        new_expense_cols = [
            ("roundup_spare",   "FLOAT"),
            ("roundup_doubled", "BOOLEAN NOT NULL DEFAULT 0"),
        ]
        for col, definition in new_expense_cols:
            if col not in existing_expense_cols:
                conn.execute(text(f"ALTER TABLE expenses ADD COLUMN {col} {definition}"))

        conn.commit()


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)  # create any brand-new tables
    _migrate()                              # add new columns to existing tables


app.include_router(auth_router.router)
app.include_router(wallet_router.router)
app.include_router(categories_router.router)
app.include_router(expenses_router.router)
app.include_router(dashboard_router.router)
app.include_router(pal_router.router)
app.include_router(streak_router.router)
app.include_router(pocketscore_router.router)


@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok", "app": "PocketPal"}
