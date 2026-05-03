"""Módulo Hermes — chat com IA (opcional por tenant)."""
import os
import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import require_module
from app.models import User, WorkshopSettings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/hermes", tags=["hermes"])

HERMES_API_URL = os.getenv("HERMES_API_URL", "").rstrip("/")


class ChatMessage(BaseModel):
    role: str          # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
async def hermes_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    cu: User = Depends(require_module("hermes")),
):
    """Envia mensagem ao Hermes agente e retorna a resposta."""
    if not HERMES_API_URL:
        raise HTTPException(
            status_code=503,
            detail="Hermes não configurado. Contate o administrador.",
        )

    # Busca contexto da oficina para enriquecer o prompt
    settings = (
        db.query(WorkshopSettings)
        .filter(WorkshopSettings.tenant_id == cu.tenant_id)
        .first()
    )
    oficina_nome = settings.name if settings else "Oficina+"
    oficina_telefone = settings.phone if settings else ""

    hermes_payload = {
        "message": payload.message,
        "history": [m.model_dump() for m in payload.history],
        "context": {
            "oficina": oficina_nome,
            "telefone": oficina_telefone,
            "tenant_id": cu.tenant_id,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{HERMES_API_URL}/chat",
                json=hermes_payload,
            )
            resp.raise_for_status()
            data = resp.json()

        reply = data.get("reply") or data.get("response") or data.get("message") or ""
        if not reply:
            logger.warning("Hermes retornou resposta inesperada: %s", data)
            reply = "Sem resposta do assistente."

        return ChatResponse(reply=reply)

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Hermes demorou muito para responder.")
    except httpx.HTTPStatusError as e:
        logger.error("Erro do Hermes: %s", e.response.text)
        raise HTTPException(status_code=502, detail="Erro ao comunicar com o assistente.")
    except Exception as e:
        logger.exception("Erro inesperado no Hermes: %s", e)
        raise HTTPException(status_code=500, detail="Erro interno no assistente.")
