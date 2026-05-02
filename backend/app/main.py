import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models import MODULES, Tenant, TenantModule, User, WorkshopSettings
from app.routes.admin import router as admin_router
from app.routes.auth import router as auth_router
from app.routes.crm import router as crm_router
from app.routes.workshop import router as workshop_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Oficina Mecânica API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Ajustar em produção
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _seed_super_admin():
    """Cria o super_admin inicial se não existir."""
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.role == "super_admin").first()
        if not existing:
            # super_admin usa tenant_id=0 (sentinel — não é um tenant real)
            if not db.query(Tenant).filter(Tenant.id == 0).first():
                from sqlalchemy import text
                db.execute(text(
                    "INSERT INTO tenants (id, name, slug, active) "
                    "VALUES (0, 'System', 'system', true) ON CONFLICT DO NOTHING"
                ))
            user = User(
                tenant_id=0,
                email=settings.ADMIN_EMAIL,
                password_hash=hash_password(settings.ADMIN_PASSWORD),
                name="Super Admin",
                role="super_admin",
            )
            db.add(user)
            db.commit()
            logger.info("Super admin criado: %s", settings.ADMIN_EMAIL)
        else:
            logger.info("Super admin já existe: %s", existing.email)
    except Exception:
        db.rollback()
        logger.exception("Erro ao criar super admin")
    finally:
        db.close()


@app.on_event("startup")
def startup():
    logger.info("Criando tabelas...")
    Base.metadata.create_all(bind=engine)
    _seed_super_admin()
    logger.info("Backend pronto.")


app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(workshop_router)
app.include_router(crm_router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
