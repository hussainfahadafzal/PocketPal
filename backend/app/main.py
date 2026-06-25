from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import auth as auth_router
from .routers import categories as categories_router
from .routers import dashboard as dashboard_router
from .routers import expenses as expenses_router
from .routers import wallet as wallet_router

app = FastAPI(title="PocketPal API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def create_tables():
    # Creates all tables that don't exist yet; safe to call on every start
    Base.metadata.create_all(bind=engine)


app.include_router(auth_router.router)
app.include_router(wallet_router.router)
app.include_router(categories_router.router)
app.include_router(expenses_router.router)
app.include_router(dashboard_router.router)


@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok", "app": "PocketPal"}
