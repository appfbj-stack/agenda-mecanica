"""Módulo Hermes — chat com IA, controle de plano e tokens por tenant."""
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.deps import require_module
from app.models import HermesUsage, HERMES_PLANS, User, WorkshopSettings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/hermes", tags=["hermes"])

_hermes_token: Optional[str] = None


# ── Auth Hermes ───────────────────────────────────────────────────────────────

async def _get_hermes_token() -> str:
    global _hermes_token
    if _hermes_token:
        return _hermes_token
    url = settings.HERMES_API_URL.rstrip("/")
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(f"{url}/auth/login",
            json={"email": settings.HERMES_EMAIL, "password": settings.HERMES_PASSWORD})
        resp.raise_for_status()
        _hermes_token = resp.json()["access_token"]
    return _hermes_token


async def _hermes_chat_request(message: str) -> str:
    global _hermes_token
    url = settings.HERMES_API_URL.rstrip("/")
    for attempt in range(2):
        token = await _get_hermes_token()
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(f"{url}/admin/hermes/chat",
                json={"message": message},
                headers={"Authorization": f"Bearer {token}"})
        if resp.status_code == 401 and attempt == 0:
            _hermes_token = None
            continue
        resp.raise_for_status()
        data = resp.json()
        return data.get("response") or data.get("reply") or data.get("message") or ""
    raise HTTPException(status_code=502, detail="Não foi possível autenticar no assistente.")


# ── Controle de uso ───────────────────────────────────────────────────────────

def _current_month() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def _get_or_create_usage(db: Session, tenant_id: int) -> HermesUsage:
    usage = db.query(HermesUsage).filter(HermesUsage.tenant_id == tenant_id).first()
    if not usage:
        usage = HermesUsage(tenant_id=tenant_id, plan="basico",
                            messages_used=0, month=_current_month())
        db.add(usage)
        db.commit()
        db.refresh(usage)
    # Reseta contador se virou o mês
    if usage.month != _current_month():
        usage.messages_used = 0
        usage.month = _current_month()
        db.commit()
    return usage


def _check_and_increment(db: Session, usage: HermesUsage) -> dict:
    plan = HERMES_PLANS.get(usage.plan, HERMES_PLANS["basico"])
    if usage.messages_used >= plan["messages"]:
        raise HTTPException(
            status_code=429,
            detail=f"Limite de {plan['messages']} mensagens do plano {plan['label']} atingido este mês. "
                   f"Contate o administrador para fazer upgrade."
        )
    usage.messages_used += 1
    db.commit()
    return plan


def _truncate(text: str, max_chars: int) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "... [mensagem truncada para economizar tokens]"


# ── Contexto do negócio ───────────────────────────────────────────────────────

def _build_context_message(message: str, ws: Optional[WorkshopSettings], is_first: bool) -> str:
    if not ws or not is_first:
        return message
    lines = [
        "=== CONTEXTO DO NEGÓCIO ===",
        f"Você é o assistente pessoal da oficina '{ws.name}'.",
        "Ajude com: agendamentos, clientes, veículos, tarefas, dúvidas da oficina.",
        "Respostas curtas e diretas.",
    ]
    if ws.phone:   lines.append(f"Telefone: {ws.phone}")
    if ws.address: lines.append(f"Endereço: {ws.address}")
    lines += ["=== FIM DO CONTEXTO ===", "", f"Usuário: {message}"]
    return "\n".join(lines)


# ── Schemas ───────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []

class ChatResponse(BaseModel):
    reply: str
    messages_used: int
    messages_limit: int
    plan: str

class UsageOut(BaseModel):
    plan: str
    plan_label: str
    messages_used: int
    messages_limit: int
    month: str
    percent: float


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def hermes_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    cu: User = Depends(require_module("hermes")),
):
    if not settings.HERMES_API_URL or not settings.HERMES_EMAIL:
        raise HTTPException(status_code=503, detail="Hermes não configurado.")

    # Verifica e incrementa contador
    usage = _get_or_create_usage(db, cu.tenant_id)
    plan = _check_and_increment(db, usage)

    # Contexto do negócio (só na 1ª mensagem)
    ws = db.query(WorkshopSettings).filter(WorkshopSettings.tenant_id == cu.tenant_id).first()
    is_first = len(payload.history) <= 1
    full_message = _build_context_message(payload.message, ws, is_first)

    # Trunca mensagem para proteger tokens
    full_message = _truncate(full_message, plan["max_chars"] if not is_first else plan["max_chars"] * 3)

    try:
        reply = await _hermes_chat_request(full_message)
        if not reply:
            reply = "Sem resposta do assistente."
        return ChatResponse(
            reply=reply,
            messages_used=usage.messages_used,
            messages_limit=plan["messages"],
            plan=usage.plan,
        )
    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Hermes demorou muito para responder.")
    except httpx.HTTPStatusError as e:
        logger.error("Erro Hermes: %s — %s", e.response.status_code, e.response.text)
        raise HTTPException(status_code=502, detail="Erro ao comunicar com o assistente.")
    except Exception as e:
        logger.exception("Erro inesperado: %s", e)
        raise HTTPException(status_code=500, detail="Erro interno.")


@router.get("/usage", response_model=UsageOut)
def hermes_usage(
    db: Session = Depends(get_db),
    cu: User = Depends(require_module("hermes")),
):
    """Retorna o consumo atual do tenant."""
    usage = _get_or_create_usage(db, cu.tenant_id)
    plan = HERMES_PLANS.get(usage.plan, HERMES_PLANS["basico"])
    pct = min(100.0, round(usage.messages_used / plan["messages"] * 100, 1))
    return UsageOut(
        plan=usage.plan,
        plan_label=plan["label"],
        messages_used=usage.messages_used,
        messages_limit=plan["messages"],
        month=usage.month,
        percent=pct,
    )
