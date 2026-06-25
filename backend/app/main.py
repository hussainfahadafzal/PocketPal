from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import auth as auth_router

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


@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok", "app": "PocketPal"}
