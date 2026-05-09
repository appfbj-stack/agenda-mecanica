import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    generate_reset_token,
    hash_password,
    verify_password,
)
from app.deps import get_current_user
from app.models import MODULES, Tenant, TenantModule, User, WorkshopSettings
from app.schemas import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordConfirm,
    ResetPasswordRequest,
    TokenResponse,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _slugify(name: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", name.lower())
    slug = re.sub(r"[\s_-]+", "-", slug).strip("-")
    return slug[:80]


def _unique_slug(db: Session, base: str) -> str:
    slug = base
    counter = 1
    while db.query(Tenant).filter(Tenant.slug == slug).first():
        slug = f"{base}-{counter}"
        counter += 1
    return slug


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")

    slug = _unique_slug(db, _slugify(payload.workshop_name))

    tenant = Tenant(name=payload.workshop_name, slug=slug)
    db.add(tenant)
    db.flush()

    for mod in MODULES:
        db.add(TenantModule(tenant_id=tenant.id, module_name=mod, enabled=False))

    db.add(WorkshopSettings(tenant_id=tenant.id, name=payload.workshop_name))

    user = User(
        tenant_id=tenant.id,
        email=payload.email,
        password_hash=hash_password(payload.password),
        name=payload.name,
        role="admin",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "tenant_id": str(tenant.id)})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email, User.active.is_(True)).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")

    # Verifica se o tenant está ativo (bloqueio por inadimplência)
    if user.role != "super_admin":
        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        if not tenant or not tenant.active:
            raise HTTPException(
                status_code=403,
                detail="Conta suspensa. Entre em contato com o suporte."
            )

    token = create_access_token({"sub": str(user.id), "tenant_id": str(user.tenant_id)})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/reset-password")
def request_reset(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        token = generate_reset_token()
        user.reset_token = token
        user.reset_token_expires = datetime.now(timezone.utc) + timedelta(
            minutes=settings.RESET_TOKEN_EXPIRE_MINUTES
        )
        db.commit()
        return {
            "message": "Se o e-mail existir, você receberá as instruções.",
            "_dev_token": token,
        }
    return {"message": "Se o e-mail existir, você receberá as instruções."}


@router.post("/reset-password/confirm")
def confirm_reset(payload: ResetPasswordConfirm, db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .filter(
            User.reset_token == payload.token,
            User.reset_token_expires > datetime.now(timezone.utc),
        )
        .first()
    )
    if not user:
        raise HTTPException(status_code=400, detail="Token inválido ou expirado")

    user.password_hash = hash_password(payload.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    return {"message": "Senha alterada com sucesso"}


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"message": "Senha alterada com sucesso"}


@router.get("/me/modules")
def my_modules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == "super_admin":
        return {mod: True for mod in MODULES}

    rows = db.query(TenantModule).filter(
        TenantModule.tenant_id == current_user.tenant_id
    ).all()
    d = {r.module_name: r.enabled for r in rows}
    return {mod: d.get(mod, False) for mod in MODULES}
