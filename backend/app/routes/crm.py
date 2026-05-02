"""CRM de leads — módulo opcional."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user, require_module
from app.models import Lead, User
from app.schemas import LeadCreate, LeadOut, LeadUpdate

router = APIRouter(
    prefix="/crm",
    tags=["crm"],
    dependencies=[Depends(require_module("crm"))],
)


@router.get("/leads", response_model=list[LeadOut])
def list_leads(
    q: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    cu: User = Depends(get_current_user),
):
    query = db.query(Lead).filter(Lead.tenant_id == cu.tenant_id)
    if q:
        like = f"%{q}%"
        query = query.filter(Lead.name.ilike(like) | Lead.phone.ilike(like))
    if status_filter:
        query = query.filter(Lead.status == status_filter)
    return query.order_by(Lead.updated_at.desc()).all()


@router.post("/leads", response_model=LeadOut, status_code=201)
def create_lead(payload: LeadCreate, db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    lead = Lead(tenant_id=cu.tenant_id, **payload.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.get("/leads/{lid}", response_model=LeadOut)
def get_lead(lid: int, db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    lead = db.query(Lead).filter(Lead.id == lid, Lead.tenant_id == cu.tenant_id).first()
    if not lead:
        raise HTTPException(404, "Lead não encontrado")
    return lead


@router.put("/leads/{lid}", response_model=LeadOut)
def update_lead(lid: int, payload: LeadUpdate, db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    lead = db.query(Lead).filter(Lead.id == lid, Lead.tenant_id == cu.tenant_id).first()
    if not lead:
        raise HTTPException(404, "Lead não encontrado")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(lead, field, value)
    db.commit()
    db.refresh(lead)
    return lead


@router.delete("/leads/{lid}", status_code=204)
def delete_lead(lid: int, db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    lead = db.query(Lead).filter(Lead.id == lid, Lead.tenant_id == cu.tenant_id).first()
    if not lead:
        raise HTTPException(404, "Lead não encontrado")
    db.delete(lead)
    db.commit()
