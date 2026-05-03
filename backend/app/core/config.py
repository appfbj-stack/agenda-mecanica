from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/oficina"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 dias

    ADMIN_EMAIL: str = "admin@oficina.com"
    ADMIN_PASSWORD: str = "admin123"

    RESET_TOKEN_EXPIRE_MINUTES: int = 30
    FRONTEND_URL: str = "http://localhost:5173"

    # Hermes agente — integração opcional
    HERMES_API_URL: str = ""      # ex: https://api.meuchat.fbautomacao.space
    HERMES_EMAIL: str = ""        # email do admin no sistema Hermes
    HERMES_PASSWORD: str = ""     # senha do admin no sistema Hermes


settings = Settings()
