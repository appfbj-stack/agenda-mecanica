"""Painel super_admin: gerenciar tenants e módulos."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password
from app.deps import require_super_admin
from app.models import MODULES, Tenant, TenantModule, User, WorkshopSettings
from app.schemas import ModuleToggle, ModulesMap, TenantOut, TenantUpdate, UserOut

router = APIRouter(prefix="/admin", tags=["admin"])


def _build_modules_map(db: Session, tenant_id: int) -> ModulesMap:
    rows = db.query(TenantModule).filter(TenantModule.tenant_id == tenant_id).all()
    d = {r.module_name: r.enabled for r in rows}
    return ModulesMap(**{m: d.get(m, False) for m in MODULES})


def _ensure_modules(db: Session, tenant_id: int):
    """Garante que todos os módulos existam para o tenant."""
    existing = {
        r.module_name
        for r in db.query(TenantModule).filter(TenantModule.tenant_id == tenant_id).all()
    }
    for mod in MODULES:
        if mod not in existing:
            db.add(TenantModule(tenant_id=tenant_id, module_name=mod, enabled=False))
    db.flush()


# ── Tenants ───────────────────────────────────────────────────────────────────

@router.get("/tenants", response_model=list[TenantOut])
def list_tenants(
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    tenants = db.query(Tenant).order_by(Tenant.id).all()
    result = []
    for t in tenants:
        out = TenantOut.model_validate(t)
        out.modules = _build_modules_map(db, t.id)
        result.append(out)
    return result


@router.patch("/tenants/{tenant_id}", response_model=TenantOut)
def update_tenant(
    tenant_id: int,
    payload: TenantUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant não encontrado")
    if payload.name is not None:
        tenant.name = payload.name
    if payload.active is not None:
        tenant.active = payload.active
    db.commit()
    db.refresh(tenant)
    out = TenantOut.model_validate(tenant)
    out.modules = _build_modules_map(db, tenant.id)
    return out


# ── Modules ───────────────────────────────────────────────────────────────────

@router.get("/tenants/{tenant_id}/modules", response_model=ModulesMap)
def get_tenant_modules(
    tenant_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    _ensure_modules(db, tenant_id)
    db.commit()
    return _build_modules_map(db, tenant_id)


@router.put("/tenants/{tenant_id}/modules", response_model=ModulesMap)
def set_tenant_modules(
    tenant_id: int,
    payload: ModulesMap,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    _ensure_modules(db, tenant_id)
    for mod_name, enabled in payload.model_dump().items():
        row = (
            db.query(TenantModule)
            .filter(TenantModule.tenant_id == tenant_id, TenantModule.module_name == mod_name)
            .first()
        )
        if row:
            row.enabled = enabled
    db.commit()
    return _build_modules_map(db, tenant_id)


@router.patch("/tenants/{tenant_id}/modules", response_model=ModulesMap)
def toggle_module(
    tenant_id: int,
    payload: ModuleToggle,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    _ensure_modules(db, tenant_id)
    row = (
        db.query(TenantModule)
        .filter(TenantModule.tenant_id == tenant_id, TenantModule.module_name == payload.module_name)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"Módulo '{payload.module_name}' não encontrado")
    row.enabled = payload.enabled
    db.commit()
    return _build_modules_map(db, tenant_id)


# ── Users ──────────────────────────────────────────────────────────────────────

@router.get("/tenants/{tenant_id}/users", response_model=list[UserOut])
def list_tenant_users(
    tenant_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    return db.query(User).filter(User.tenant_id == tenant_id).all()


@router.post("/super-admin", response_model=UserOut, status_code=201)
def create_super_admin(
    email: str,
    password: str,
    name: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    """Cria outro super_admin (apenas super_admin pode fazer isso)."""
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    # super_admin usa tenant_id=0 (sem tenant)
    user = User(
        tenant_id=0,
        email=email,
        password_hash=hash_password(password),
        name=name,
        role="super_admin",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
