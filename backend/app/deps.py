import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models import Tenant, TenantModule, User

logger = logging.getLogger(__name__)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> User:
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
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito a super admin")
    return current_user


def require_admin_or_super(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("super_admin", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito a administradores")
    return current_user


def require_module(module_name: str):
    """Dependency factory — verifica se o módulo está habilitado para o tenant."""

    def _check(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> User:
        # super_admin sempre tem acesso
        if current_user.role == "super_admin":
            return current_user
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
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Módulo '{module_name}' não está ativo no seu plano.",
            )
        return current_user

    return _check
