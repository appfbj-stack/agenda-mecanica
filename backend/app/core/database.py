import logging
from urllib.parse import urlparse, urlunparse

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

logger = logging.getLogger(__name__)


def _ensure_database_exists(database_url: str) -> None:
    """Cria o banco de dados se não existir. Conecta ao 'postgres' (default db)."""
    try:
        parsed = urlparse(database_url)
        db_name = parsed.path.lstrip("/")
        if not db_name:
            return

        # Conecta ao banco padrão 'postgres' para criar o banco alvo
        admin_url = urlunparse(parsed._replace(path="/postgres"))
        admin_engine = create_engine(
            admin_url,
            isolation_level="AUTOCOMMIT",
            pool_pre_ping=True,
        )
        with admin_engine.connect() as conn:
            exists = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :name"),
                {"name": db_name},
            ).fetchone()
            if not exists:
                conn.execute(text(f'CREATE DATABASE "{db_name}"'))
                logger.info("Banco de dados '%s' criado com sucesso.", db_name)
            else:
                logger.info("Banco de dados '%s' já existe.", db_name)
        admin_engine.dispose()
    except Exception:
        logger.exception("Não foi possível garantir a existência do banco de dados")


# Garante que o banco existe antes de criar o engine principal
_ensure_database_exists(settings.DATABASE_URL)

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
