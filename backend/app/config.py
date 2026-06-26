from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./pocketpal.db"
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def fix_postgres_scheme(cls, v: str) -> str:
        # Neon / Heroku / Render sometimes provide "postgres://" but SQLAlchemy
        # requires "postgresql://" for the psycopg2 dialect.
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
