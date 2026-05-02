/**
 * dbService — camada de dados conectada ao backend (substituiu IndexedDB).
 * Mantém as mesmas assinaturas de função para compatibilidade com App.tsx.
 */
import { ServiceRecord, WorkshopSettings, CRMLead, LeadStatus, ServiceStatus, PaymentMethod } from '../types';

const BASE_URL = (): string =>
  (window as any).__API_URL__ || import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL()}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || `Erro ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

type FlatOrder = {
  id?: string;
  carPlate: string; carModel: string; carYear: string; carColor: string; carMileage: string;
  ownerName: string; ownerPhone: string;
  entryDate: string; scheduledDate?: string | null; scheduledTime?: string | null;
  description: string; diagnosis: string;
  laborCost: number; laborDescription: string;
  parts: any[];
  warrantyInfo: string;
  paymentMethod: string;
  amountPaid: number;
  status: string;
  clientSignature?: string | null;
  createdAt?: number; updatedAt?: number;
};

function flatToRecord(f: FlatOrder): ServiceRecord {
  return {
    id: f.id || generateId(),
    carPlate: f.carPlate,
    carModel: f.carModel,
    carYear: f.carYear,
    carColor: f.carColor,
    carMileage: f.carMileage,
    ownerName: f.ownerName,
    ownerPhone: f.ownerPhone,
    entryDate: f.entryDate,
    scheduledDate: f.scheduledDate ?? undefined,
    scheduledTime: f.scheduledTime ?? undefined,
    description: f.description,
    diagnosis: f.diagnosis,
    laborCost: f.laborCost,
    laborDescription: f.laborDescription,
    parts: f.parts || [],
    warrantyInfo: f.warrantyInfo,
    paymentMethod: (f.paymentMethod as PaymentMethod) || 'Nenhum',
    amountPaid: f.amountPaid,
    status: (f.status as ServiceStatus) || ServiceStatus.ANALYSIS,
    clientSignature: f.clientSignature ?? undefined,
    createdAt: f.createdAt || Date.now(),
    updatedAt: f.updatedAt || Date.now(),
  };
}

// ── Service Orders ────────────────────────────────────────────────────────────

export const getServices = async (): Promise<ServiceRecord[]> => {
  const list = await api<FlatOrder[]>('/workshop/service-orders/flat');
  return list.map(flatToRecord);
};

export const saveService = async (service: ServiceRecord): Promise<void> => {
  await api('/workshop/service-orders/flat', {
    method: 'POST',
    body: JSON.stringify({
      id: service.id,
      carPlate: service.carPlate,
      carModel: service.carModel,
      carYear: service.carYear,
      carColor: service.carColor,
      carMileage: service.carMileage,
      ownerName: service.ownerName,
      ownerPhone: service.ownerPhone,
      entryDate: service.entryDate,
      scheduledDate: service.scheduledDate ?? null,
      scheduledTime: service.scheduledTime ?? null,
      description: service.description,
      diagnosis: service.diagnosis,
      laborCost: service.laborCost,
      laborDescription: service.laborDescription,
      parts: service.parts,
      warrantyInfo: service.warrantyInfo,
      paymentMethod: service.paymentMethod,
      amountPaid: service.amountPaid,
      status: service.status,
      clientSignature: service.clientSignature ?? null,
    }),
  });
};

export const deleteService = async (id: string): Promise<void> => {
  await api(`/workshop/service-orders/${id}`, { method: 'DELETE' });
};

// ── Leads CRM ─────────────────────────────────────────────────────────────────

type ApiLead = {
  id: number; name: string; phone?: string; vehicle?: string;
  interest?: string; status: string; notes?: string;
  created_at: string; updated_at: string;
};

function apiLeadToFrontend(l: ApiLead): CRMLead {
  return {
    id: String(l.id),
    name: l.name,
    phone: l.phone || '',
    vehicle: l.vehicle,
    interest: l.interest,
    status: (l.status as LeadStatus) || LeadStatus.NEW,
    notes: l.notes,
    createdAt: new Date(l.created_at).getTime(),
    updatedAt: new Date(l.updated_at).getTime(),
  };
}

export const getLeads = async (): Promise<CRMLead[]> => {
  try {
    const list = await api<ApiLead[]>('/crm/leads');
    return list.map(apiLeadToFrontend);
  } catch {
    return [];
  }
};

export const saveLead = async (lead: CRMLead): Promise<void> => {
  const payload = {
    name: lead.name,
    phone: lead.phone || null,
    vehicle: lead.vehicle || null,
    interest: lead.interest || null,
    status: lead.status,
    notes: lead.notes || null,
  };
  const numId = parseInt(lead.id, 10);
  if (!isNaN(numId)) {
    await api(`/crm/leads/${numId}`, { method: 'PUT', body: JSON.stringify(payload) });
  } else {
    await api('/crm/leads', { method: 'POST', body: JSON.stringify(payload) });
  }
};

export const deleteLead = async (id: string): Promise<void> => {
  const numId = parseInt(id, 10);
  if (!isNaN(numId)) {
    await api(`/crm/leads/${numId}`, { method: 'DELETE' });
  }
};

// ── Workshop Settings ─────────────────────────────────────────────────────────

type ApiSettings = {
  id: number; name: string; phone?: string; address?: string;
  cnpj?: string; logo_base64?: string;
};

export const getSettings = async (): Promise<WorkshopSettings> => {
  try {
    const s = await api<ApiSettings>('/workshop/settings');
    return {
      name: s.name || 'Oficina+',
      phone: s.phone || '',
      address: s.address || '',
      cnpj: s.cnpj,
      logo: s.logo_base64,
    };
  } catch {
    return { name: 'Oficina+', phone: '', address: '' };
  }
};

export const saveSettings = async (settings: WorkshopSettings): Promise<void> => {
  await api('/workshop/settings', {
    method: 'PUT',
    body: JSON.stringify({
      name: settings.name,
      phone: settings.phone || null,
      address: settings.address || null,
      cnpj: settings.cnpj || null,
      logo_base64: settings.logo || null,
    }),
  });
};

// ── Utilitários ───────────────────────────────────────────────────────────────

export const generateId = (): string => Math.random().toString(36).substr(2, 9);

export const calculateTotal = (service: ServiceRecord): number => {
  const partsTotal = service.parts.reduce(
    (acc, part) => acc + part.quantity * part.unitPrice,
    0
  );
  return partsTotal + (Number(service.laborCost) || 0);
};
