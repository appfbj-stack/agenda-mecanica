import logging
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models import Tenant, TenantModule, User

logger = logging.getLogger(__name__)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def get_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
) -> User:
    # Se não há token, retorna o usuário admin padrão (modo sem login)
    if not token:
        user = db.query(User).filter(User.email == "admin@oficina.com", User.active.is_(True)).first()
        if user:
            return user
        # Se nem o admin existe ainda, busca qualquer usuário ativo
        user = db.query(User).filter(User.active.is_(True)).first()
        if user:
            return user
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Nenhum usuário disponível")

    try:
        payload = decode_token(token)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    user = db.query(User).filter(User.id == int(payload["sub"]), User.active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")

    # super_admin nunca é bloqueado por inatividade do tenant
    if user.role != "super_admin":
        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        if tenant and not tenant.active:
            raise HTTPException(
                status_code=402,
                detail="Assinatura suspensa. Entre em contato com o administrador.",
            )

    return user


def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    return current_user


def require_admin_or_super(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Acesso negado")
    return current_user


def require_module(module_name: str):
    def _check(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> User:
        mod = (
            db.query(TenantModule)
            .filter(
                TenantModule.tenant_id == current_user.tenant_id,
                TenantModule.module_name == module_name,
                TenantModule.enabled.is_(True),
            )
            .first()
        )
        if not mod:
            raise HTTPException(status_code=403, detail=f"Módulo '{module_name}' não habilitado")
        return current_user

    return _check
