"""Módulo Hermes — chat com IA (opcional por tenant)."""
import logging
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.deps import require_module
from app.models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/hermes", tags=["hermes"])

# Cache simples do token (em memória — suficiente para single-instance)
_hermes_token: Optional[str] = None


async def _get_hermes_token() -> str:
    """Faz login na API Hermes e retorna o Bearer token."""
    global _hermes_token
    if _hermes_token:
        return _hermes_token

    url = settings.HERMES_API_URL.rstrip("/")
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{url}/auth/login",
            json={"email": settings.HERMES_EMAIL, "password": settings.HERMES_PASSWORD},
        )
        resp.raise_for_status()
        _hermes_token = resp.json()["access_token"]
    return _hermes_token


async def _hermes_chat_request(message: str) -> str:
    """Chama /admin/hermes/chat com renovação automática de token."""
    global _hermes_token
    url = settings.HERMES_API_URL.rstrip("/")

    for attempt in range(2):          # tenta 2x: normal + após re-login
        token = await _get_hermes_token()
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(
                f"{url}/admin/hermes/chat",
                json={"message": message},
                headers={"Authorization": f"Bearer {token}"},
            )

        if resp.status_code == 401 and attempt == 0:
            # Token expirado — força re-login
            _hermes_token = None
            continue

        resp.raise_for_status()
        data = resp.json()
        return data.get("response") or data.get("reply") or data.get("message") or ""

    raise HTTPException(status_code=502, detail="Não foi possível autenticar no assistente.")


# ── Schemas ──────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str       # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def hermes_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    cu: User = Depends(require_module("hermes")),
):
    """Envia mensagem ao Hermes agente e retorna a resposta."""
    if not settings.HERMES_API_URL or not settings.HERMES_EMAIL:
        raise HTTPException(
            status_code=503,
            detail="Hermes não configurado. Contate o administrador.",
        )

    try:
        reply = await _hermes_chat_request(payload.message)
        if not reply:
            logger.warning("Hermes retornou resposta vazia.")
            reply = "Sem resposta do assistente."
        return ChatResponse(reply=reply)

    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Hermes demorou muito para responder.")
    except httpx.HTTPStatusError as e:
        logger.error("Erro do Hermes: %s — %s", e.response.status_code, e.response.text)
        raise HTTPException(status_code=502, detail="Erro ao comunicar com o assistente.")
    except Exception as e:
        logger.exception("Erro inesperado no Hermes: %s", e)
        raise HTTPException(status_code=500, detail="Erro interno no assistente.")
