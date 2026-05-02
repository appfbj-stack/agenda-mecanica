from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr


class ORMModel(BaseModel):
    model_config = {"from_attributes": True}


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    workshop_name: str
    email: EmailStr
    password: str
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class ResetPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordConfirm(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ── User ──────────────────────────────────────────────────────────────────────

class UserOut(ORMModel):
    id: int
    tenant_id: int
    email: str
    name: str
    role: str
    active: bool
    created_at: datetime


# ── Modules ───────────────────────────────────────────────────────────────────

class ModuleOut(ORMModel):
    id: int
    tenant_id: int
    module_name: str
    enabled: bool


class ModuleToggle(BaseModel):
    module_name: str
    enabled: bool


class ModulesMap(BaseModel):
    crm: bool = False
    agenda: bool = False
    kanban: bool = False
    whatsapp: bool = False
    followup: bool = False
    hermes: bool = False
    instagram: bool = False
    youtube: bool = False


# ── Tenant (admin) ────────────────────────────────────────────────────────────

class TenantOut(ORMModel):
    id: int
    name: str
    slug: str
    active: bool
    created_at: datetime
    modules: ModulesMap = ModulesMap()


class TenantUpdate(BaseModel):
    name: str | None = None
    active: bool | None = None


# ── Customer ──────────────────────────────────────────────────────────────────

class CustomerCreate(BaseModel):
    name: str
    phone: str | None = None
    email: str | None = None
    cpf: str | None = None
    address: str | None = None
    notes: str | None = None


class CustomerUpdate(CustomerCreate):
    name: str | None = None


class CustomerOut(ORMModel):
    id: int
    tenant_id: int
    name: str
    phone: str | None
    email: str | None
    cpf: str | None
    address: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


# ── Vehicle ───────────────────────────────────────────────────────────────────

class VehicleCreate(BaseModel):
    customer_id: int | None = None
    plate: str
    model: str
    brand: str | None = None
    year: str | None = None
    color: str | None = None
    mileage: str | None = None
    notes: str | None = None


class VehicleUpdate(VehicleCreate):
    plate: str | None = None
    model: str | None = None


class VehicleOut(ORMModel):
    id: int
    tenant_id: int
    customer_id: int | None
    plate: str
    model: str
    brand: str | None
    year: str | None
    color: str | None
    mileage: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


# ── ServiceOrder ──────────────────────────────────────────────────────────────

class ServiceOrderCreate(BaseModel):
    vehicle_id: int | None = None
    customer_id: int | None = None
    status: str = "em_analise"
    description: str | None = None
    diagnosis: str | None = None
    labor_cost: int = 0
    labor_description: str | None = None
    parts_json: str | None = None
    warranty_info: str | None = None
    payment_method: str = "Nenhum"
    amount_paid: int = 0
    entry_date: str | None = None
    scheduled_date: str | None = None
    scheduled_time: str | None = None
    client_signature: str | None = None


class ServiceOrderUpdate(ServiceOrderCreate):
    pass


class ServiceOrderOut(ORMModel):
    id: int
    tenant_id: int
    vehicle_id: int | None
    customer_id: int | None
    status: str
    description: str | None
    diagnosis: str | None
    labor_cost: int
    labor_description: str | None
    parts_json: str | None
    warranty_info: str | None
    payment_method: str
    amount_paid: int
    entry_date: str | None
    scheduled_date: str | None
    scheduled_time: str | None
    client_signature: str | None
    created_at: datetime
    updated_at: datetime


# ── Lead ──────────────────────────────────────────────────────────────────────

class LeadCreate(BaseModel):
    name: str
    phone: str | None = None
    vehicle: str | None = None
    interest: str | None = None
    status: str = "Novo Contato"
    notes: str | None = None


class LeadUpdate(LeadCreate):
    name: str | None = None


class LeadOut(ORMModel):
    id: int
    tenant_id: int
    name: str
    phone: str | None
    vehicle: str | None
    interest: str | None
    status: str
    notes: str | None
    created_at: datetime
    updated_at: datetime


# ── WorkshopSettings ──────────────────────────────────────────────────────────

class WorkshopSettingsUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    address: str | None = None
    cnpj: str | None = None
    logo_base64: str | None = None


class WorkshopSettingsOut(ORMModel):
    id: int
    tenant_id: int
    name: str
    phone: str | None
    address: str | None
    cnpj: str | None
    logo_base64: str | None
    updated_at: datetime
