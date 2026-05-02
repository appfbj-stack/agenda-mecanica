"""Clientes, Veículos e Ordens de Serviço."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.models import Customer, ServiceOrder, Vehicle, User
from app.schemas import (
    CustomerCreate, CustomerOut, CustomerUpdate,
    ServiceOrderCreate, ServiceOrderOut, ServiceOrderUpdate,
    VehicleCreate, VehicleOut, VehicleUpdate,
    WorkshopSettingsOut, WorkshopSettingsUpdate,
)
from app.models import WorkshopSettings

router = APIRouter(prefix="/workshop", tags=["workshop"])


# ── Settings ──────────────────────────────────────────────────────────────────

@router.get("/settings", response_model=WorkshopSettingsOut)
def get_settings(db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    s = db.query(WorkshopSettings).filter(WorkshopSettings.tenant_id == cu.tenant_id).first()
    if not s:
        s = WorkshopSettings(tenant_id=cu.tenant_id)
        db.add(s)
        db.commit()
        db.refresh(s)
    return s


@router.put("/settings", response_model=WorkshopSettingsOut)
def update_settings(
    payload: WorkshopSettingsUpdate,
    db: Session = Depends(get_db),
    cu: User = Depends(get_current_user),
):
    s = db.query(WorkshopSettings).filter(WorkshopSettings.tenant_id == cu.tenant_id).first()
    if not s:
        s = WorkshopSettings(tenant_id=cu.tenant_id)
        db.add(s)
        db.flush()
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(s, field, value)
    db.commit()
    db.refresh(s)
    return s


# ── Customers ─────────────────────────────────────────────────────────────────

@router.get("/customers", response_model=list[CustomerOut])
def list_customers(
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
    cu: User = Depends(get_current_user),
):
    query = db.query(Customer).filter(Customer.tenant_id == cu.tenant_id)
    if q:
        like = f"%{q}%"
        query = query.filter(Customer.name.ilike(like) | Customer.phone.ilike(like))
    return query.order_by(Customer.name.asc()).all()


@router.post("/customers", response_model=CustomerOut, status_code=201)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    c = Customer(tenant_id=cu.tenant_id, **payload.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.get("/customers/{cid}", response_model=CustomerOut)
def get_customer(cid: int, db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    c = db.query(Customer).filter(Customer.id == cid, Customer.tenant_id == cu.tenant_id).first()
    if not c:
        raise HTTPException(404, "Cliente não encontrado")
    return c


@router.put("/customers/{cid}", response_model=CustomerOut)
def update_customer(cid: int, payload: CustomerUpdate, db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    c = db.query(Customer).filter(Customer.id == cid, Customer.tenant_id == cu.tenant_id).first()
    if not c:
        raise HTTPException(404, "Cliente não encontrado")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(c, field, value)
    db.commit()
    db.refresh(c)
    return c


@router.delete("/customers/{cid}", status_code=204)
def delete_customer(cid: int, db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    c = db.query(Customer).filter(Customer.id == cid, Customer.tenant_id == cu.tenant_id).first()
    if not c:
        raise HTTPException(404, "Cliente não encontrado")
    db.delete(c)
    db.commit()


# ── Vehicles ──────────────────────────────────────────────────────────────────

@router.get("/vehicles", response_model=list[VehicleOut])
def list_vehicles(
    customer_id: int | None = Query(default=None),
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
    cu: User = Depends(get_current_user),
):
    query = db.query(Vehicle).filter(Vehicle.tenant_id == cu.tenant_id)
    if customer_id:
        query = query.filter(Vehicle.customer_id == customer_id)
    if q:
        like = f"%{q}%"
        query = query.filter(Vehicle.plate.ilike(like) | Vehicle.model.ilike(like))
    return query.order_by(Vehicle.created_at.desc()).all()


@router.post("/vehicles", response_model=VehicleOut, status_code=201)
def create_vehicle(payload: VehicleCreate, db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    v = Vehicle(tenant_id=cu.tenant_id, **payload.model_dump())
    db.add(v)
    db.commit()
    db.refresh(v)
    return v


@router.get("/vehicles/{vid}", response_model=VehicleOut)
def get_vehicle(vid: int, db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    v = db.query(Vehicle).filter(Vehicle.id == vid, Vehicle.tenant_id == cu.tenant_id).first()
    if not v:
        raise HTTPException(404, "Veículo não encontrado")
    return v


@router.put("/vehicles/{vid}", response_model=VehicleOut)
def update_vehicle(vid: int, payload: VehicleUpdate, db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    v = db.query(Vehicle).filter(Vehicle.id == vid, Vehicle.tenant_id == cu.tenant_id).first()
    if not v:
        raise HTTPException(404, "Veículo não encontrado")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(v, field, value)
    db.commit()
    db.refresh(v)
    return v


@router.delete("/vehicles/{vid}", status_code=204)
def delete_vehicle(vid: int, db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    v = db.query(Vehicle).filter(Vehicle.id == vid, Vehicle.tenant_id == cu.tenant_id).first()
    if not v:
        raise HTTPException(404, "Veículo não encontrado")
    db.delete(v)
    db.commit()


# ── Service Orders ────────────────────────────────────────────────────────────

@router.get("/service-orders", response_model=list[ServiceOrderOut])
def list_orders(
    status_filter: str | None = Query(default=None, alias="status"),
    vehicle_id: int | None = Query(default=None),
    customer_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    cu: User = Depends(get_current_user),
):
    query = db.query(ServiceOrder).filter(ServiceOrder.tenant_id == cu.tenant_id)
    if status_filter:
        query = query.filter(ServiceOrder.status == status_filter)
    if vehicle_id:
        query = query.filter(ServiceOrder.vehicle_id == vehicle_id)
    if customer_id:
        query = query.filter(ServiceOrder.customer_id == customer_id)
    return query.order_by(ServiceOrder.created_at.desc()).all()


@router.post("/service-orders", response_model=ServiceOrderOut, status_code=201)
def create_order(payload: ServiceOrderCreate, db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    o = ServiceOrder(tenant_id=cu.tenant_id, **payload.model_dump())
    db.add(o)
    db.commit()
    db.refresh(o)
    return o


@router.get("/service-orders/{oid}", response_model=ServiceOrderOut)
def get_order(oid: int, db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    o = db.query(ServiceOrder).filter(ServiceOrder.id == oid, ServiceOrder.tenant_id == cu.tenant_id).first()
    if not o:
        raise HTTPException(404, "Ordem de serviço não encontrada")
    return o


@router.put("/service-orders/{oid}", response_model=ServiceOrderOut)
def update_order(oid: int, payload: ServiceOrderUpdate, db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    o = db.query(ServiceOrder).filter(ServiceOrder.id == oid, ServiceOrder.tenant_id == cu.tenant_id).first()
    if not o:
        raise HTTPException(404, "Ordem de serviço não encontrada")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(o, field, value)
    db.commit()
    db.refresh(o)
    return o


@router.patch("/service-orders/{oid}/status", response_model=ServiceOrderOut)
def update_order_status(
    oid: int,
    new_status: str,
    db: Session = Depends(get_db),
    cu: User = Depends(get_current_user),
):
    valid = {"em_analise", "aguardando_aprovacao", "em_execucao", "pronto", "concluido"}
    if new_status not in valid:
        raise HTTPException(422, f"Status inválido. Use: {', '.join(valid)}")
    o = db.query(ServiceOrder).filter(ServiceOrder.id == oid, ServiceOrder.tenant_id == cu.tenant_id).first()
    if not o:
        raise HTTPException(404, "Ordem de serviço não encontrada")
    o.status = new_status
    db.commit()
    db.refresh(o)
    return o


@router.delete("/service-orders/{oid}", status_code=204)
def delete_order(oid: int, db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    o = db.query(ServiceOrder).filter(ServiceOrder.id == oid, ServiceOrder.tenant_id == cu.tenant_id).first()
    if not o:
        raise HTTPException(404, "Ordem de serviço não encontrada")
    db.delete(o)
    db.commit()


# ── Flat Service Orders (formato compatível com o frontend PWA) ───────────────

import json as _json
from datetime import datetime as _dt
from pydantic import BaseModel as _BM
from typing import Any as _Any


class FlatServiceRecord(_BM):
    id: str | None = None
    carPlate: str = ""
    carModel: str = ""
    carYear: str = ""
    carColor: str = ""
    carMileage: str = ""
    ownerName: str = ""
    ownerPhone: str = ""
    entryDate: str = ""
    scheduledDate: str | None = None
    scheduledTime: str | None = None
    description: str = ""
    diagnosis: str = ""
    laborCost: float = 0.0
    laborDescription: str = ""
    parts: list[_Any] = []
    warrantyInfo: str = ""
    paymentMethod: str = "Nenhum"
    amountPaid: float = 0.0
    status: str = "Em Análise"
    clientSignature: str | None = None
    createdAt: int | None = None
    updatedAt: int | None = None


def _order_to_flat(order: ServiceOrder, db: Session) -> dict:
    vehicle = db.query(Vehicle).filter(Vehicle.id == order.vehicle_id).first() if order.vehicle_id else None
    customer = db.query(Customer).filter(Customer.id == order.customer_id).first() if order.customer_id else None
    ts_created = int(order.created_at.timestamp() * 1000) if order.created_at else 0
    ts_updated = int(order.updated_at.timestamp() * 1000) if order.updated_at else 0
    return {
        "id": str(order.id),
        "carPlate": vehicle.plate if vehicle else "",
        "carModel": vehicle.model if vehicle else "",
        "carYear": vehicle.year or "" if vehicle else "",
        "carColor": vehicle.color or "" if vehicle else "",
        "carMileage": vehicle.mileage or "" if vehicle else "",
        "ownerName": customer.name if customer else "",
        "ownerPhone": customer.phone or "" if customer else "",
        "entryDate": order.entry_date or "",
        "scheduledDate": order.scheduled_date,
        "scheduledTime": order.scheduled_time,
        "description": order.description or "",
        "diagnosis": order.diagnosis or "",
        "laborCost": (order.labor_cost or 0) / 100.0,
        "laborDescription": order.labor_description or "",
        "parts": _json.loads(order.parts_json) if order.parts_json else [],
        "warrantyInfo": order.warranty_info or "",
        "paymentMethod": order.payment_method or "Nenhum",
        "amountPaid": (order.amount_paid or 0) / 100.0,
        "status": order.status or "Em Análise",
        "clientSignature": order.client_signature,
        "createdAt": ts_created,
        "updatedAt": ts_updated,
    }


@router.get("/service-orders/flat")
def list_orders_flat(db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    orders = db.query(ServiceOrder).filter(ServiceOrder.tenant_id == cu.tenant_id)\
        .order_by(ServiceOrder.created_at.desc()).all()
    return [_order_to_flat(o, db) for o in orders]


@router.post("/service-orders/flat")
def upsert_order_flat(
    payload: FlatServiceRecord,
    db: Session = Depends(get_db),
    cu: User = Depends(get_current_user),
):
    # 1. Find or create customer
    customer = None
    if payload.ownerName or payload.ownerPhone:
        if payload.ownerPhone:
            customer = db.query(Customer).filter(
                Customer.tenant_id == cu.tenant_id,
                Customer.phone == payload.ownerPhone,
            ).first()
        if not customer:
            customer = Customer(
                tenant_id=cu.tenant_id,
                name=payload.ownerName or "Cliente",
                phone=payload.ownerPhone or None,
            )
            db.add(customer)
            db.flush()

    # 2. Find or create vehicle
    vehicle = None
    if payload.carPlate or payload.carModel:
        if payload.carPlate:
            vehicle = db.query(Vehicle).filter(
                Vehicle.tenant_id == cu.tenant_id,
                Vehicle.plate == payload.carPlate,
            ).first()
        if not vehicle:
            vehicle = Vehicle(
                tenant_id=cu.tenant_id,
                plate=payload.carPlate or "S/P",
                model=payload.carModel or "",
                year=payload.carYear or None,
                color=payload.carColor or None,
                mileage=payload.carMileage or None,
                customer_id=customer.id if customer else None,
            )
            db.add(vehicle)
            db.flush()
        else:
            # Update mileage and link customer
            vehicle.mileage = payload.carMileage or vehicle.mileage
            if customer and not vehicle.customer_id:
                vehicle.customer_id = customer.id

    # 3. Create or update service order
    order = None
    if payload.id:
        try:
            oid = int(payload.id)
            order = db.query(ServiceOrder).filter(
                ServiceOrder.id == oid, ServiceOrder.tenant_id == cu.tenant_id
            ).first()
        except (ValueError, TypeError):
            pass

    if order:
        # Update
        order.vehicle_id = vehicle.id if vehicle else order.vehicle_id
        order.customer_id = customer.id if customer else order.customer_id
        order.status = payload.status
        order.description = payload.description
        order.diagnosis = payload.diagnosis
        order.labor_cost = int(payload.laborCost * 100)
        order.labor_description = payload.laborDescription
        order.parts_json = _json.dumps(payload.parts)
        order.warranty_info = payload.warrantyInfo
        order.payment_method = payload.paymentMethod
        order.amount_paid = int(payload.amountPaid * 100)
        order.entry_date = payload.entryDate or None
        order.scheduled_date = payload.scheduledDate
        order.scheduled_time = payload.scheduledTime
        order.client_signature = payload.clientSignature
    else:
        order = ServiceOrder(
            tenant_id=cu.tenant_id,
            vehicle_id=vehicle.id if vehicle else None,
            customer_id=customer.id if customer else None,
            status=payload.status,
            description=payload.description,
            diagnosis=payload.diagnosis,
            labor_cost=int(payload.laborCost * 100),
            labor_description=payload.laborDescription,
            parts_json=_json.dumps(payload.parts),
            warranty_info=payload.warrantyInfo,
            payment_method=payload.paymentMethod,
            amount_paid=int(payload.amountPaid * 100),
            entry_date=payload.entryDate or None,
            scheduled_date=payload.scheduledDate,
            scheduled_time=payload.scheduledTime,
            client_signature=payload.clientSignature,
        )
        db.add(order)

    db.commit()
    db.refresh(order)
    return _order_to_flat(order, db)
