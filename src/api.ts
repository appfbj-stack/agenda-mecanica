const BASE_URL = (window as any).__API_URL__ || import.meta.env.VITE_API_URL || "http://localhost:8000";

function getToken(): string | null {
  return localStorage.getItem("token");
}

export function setToken(token: string) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Erro ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserOut {
  id: number; tenant_id: number; email: string; name: string; role: string; active: boolean; created_at: string;
}
export interface TokenResponse {
  access_token: string; token_type: string; user: UserOut;
}
export interface ModulesMap {
  crm: boolean; agenda: boolean; kanban: boolean; whatsapp: boolean;
  followup: boolean; hermes: boolean; instagram: boolean; youtube: boolean;
}
export interface TenantOut {
  id: number; name: string; slug: string; active: boolean; created_at: string; modules: ModulesMap;
}
export interface Customer {
  id: number; tenant_id: number; name: string; phone?: string; email?: string;
  cpf?: string; address?: string; notes?: string; created_at: string; updated_at: string;
}
export interface Vehicle {
  id: number; tenant_id: number; customer_id?: number; plate: string; model: string;
  brand?: string; year?: string; color?: string; mileage?: string; notes?: string;
  created_at: string; updated_at: string;
}
export interface ServiceOrder {
  id: number; tenant_id: number; vehicle_id?: number; customer_id?: number; status: string;
  description?: string; diagnosis?: string; labor_cost: number; labor_description?: string;
  parts_json?: string; warranty_info?: string; payment_method: string; amount_paid: number;
  entry_date?: string; scheduled_date?: string; scheduled_time?: string; client_signature?: string;
  created_at: string; updated_at: string;
}
export interface Lead {
  id: number; tenant_id: number; name: string; phone?: string; vehicle?: string;
  interest?: string; status: string; notes?: string; created_at: string; updated_at: string;
}
export interface WorkshopSettings {
  id: number; tenant_id: number; name: string; phone?: string; address?: string;
  cnpj?: string; logo_base64?: string; updated_at: string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authRegister = (data: { workshop_name: string; email: string; password: string; name: string }) =>
  request<TokenResponse>("/auth/register", { method: "POST", body: JSON.stringify(data) });

export const authLogin = (email: string, password: string) =>
  request<TokenResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

export const authMe = () => request<UserOut>("/auth/me");

export const authResetPassword = (email: string) =>
  request<{ message: string }>("/auth/reset-password", { method: "POST", body: JSON.stringify({ email }) });

export const authConfirmReset = (token: string, new_password: string) =>
  request<{ message: string }>("/auth/reset-password/confirm", { method: "POST", body: JSON.stringify({ token, new_password }) });

export const authChangePassword = (current_password: string, new_password: string) =>
  request<{ message: string }>("/auth/change-password", { method: "POST", body: JSON.stringify({ current_password, new_password }) });

// ── Admin ──────────────────────────────────────────────────────────────────────

export const adminListTenants = () => request<TenantOut[]>("/admin/tenants");
export const adminUpdateTenant = (id: number, data: Partial<TenantOut>) =>
  request<TenantOut>(`/admin/tenants/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const adminGetModules = (tenantId: number) =>
  request<ModulesMap>(`/admin/tenants/${tenantId}/modules`);
export const adminSetModules = (tenantId: number, modules: ModulesMap) =>
  request<ModulesMap>(`/admin/tenants/${tenantId}/modules`, { method: "PUT", body: JSON.stringify(modules) });
export const adminToggleModule = (tenantId: number, module_name: string, enabled: boolean) =>
  request<ModulesMap>(`/admin/tenants/${tenantId}/modules`, { method: "PATCH", body: JSON.stringify({ module_name, enabled }) });

// ── Workshop ──────────────────────────────────────────────────────────────────

export const getWorkshopSettings = () => request<WorkshopSettings>("/workshop/settings");
export const updateWorkshopSettings = (data: Partial<WorkshopSettings>) =>
  request<WorkshopSettings>("/workshop/settings", { method: "PUT", body: JSON.stringify(data) });

export const listCustomers = (q?: string) =>
  request<Customer[]>(`/workshop/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`);
export const createCustomer = (data: Omit<Customer, "id" | "tenant_id" | "created_at" | "updated_at">) =>
  request<Customer>("/workshop/customers", { method: "POST", body: JSON.stringify(data) });
export const updateCustomer = (id: number, data: Partial<Customer>) =>
  request<Customer>(`/workshop/customers/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteCustomer = (id: number) =>
  request<void>(`/workshop/customers/${id}`, { method: "DELETE" });

export const listVehicles = (params?: { customer_id?: number; q?: string }) => {
  const qs = new URLSearchParams();
  if (params?.customer_id) qs.set("customer_id", String(params.customer_id));
  if (params?.q) qs.set("q", params.q);
  return request<Vehicle[]>(`/workshop/vehicles${qs.toString() ? "?" + qs : ""}`);
};
export const createVehicle = (data: Omit<Vehicle, "id" | "tenant_id" | "created_at" | "updated_at">) =>
  request<Vehicle>("/workshop/vehicles", { method: "POST", body: JSON.stringify(data) });
export const updateVehicle = (id: number, data: Partial<Vehicle>) =>
  request<Vehicle>(`/workshop/vehicles/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteVehicle = (id: number) =>
  request<void>(`/workshop/vehicles/${id}`, { method: "DELETE" });

export const listServiceOrders = (params?: { status?: string; vehicle_id?: number; customer_id?: number }) => {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.vehicle_id) qs.set("vehicle_id", String(params.vehicle_id));
  if (params?.customer_id) qs.set("customer_id", String(params.customer_id));
  return request<ServiceOrder[]>(`/workshop/service-orders${qs.toString() ? "?" + qs : ""}`);
};
export const createServiceOrder = (data: Omit<ServiceOrder, "id" | "tenant_id" | "created_at" | "updated_at">) =>
  request<ServiceOrder>("/workshop/service-orders", { method: "POST", body: JSON.stringify(data) });
export const updateServiceOrder = (id: number, data: Partial<ServiceOrder>) =>
  request<ServiceOrder>(`/workshop/service-orders/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const updateServiceOrderStatus = (id: number, status: string) =>
  request<ServiceOrder>(`/workshop/service-orders/${id}/status?new_status=${status}`, { method: "PATCH" });
export const deleteServiceOrder = (id: number) =>
  request<void>(`/workshop/service-orders/${id}`, { method: "DELETE" });

// ── CRM ────────────────────────────────────────────────────────────────────────

export const listLeads = (q?: string) =>
  request<Lead[]>(`/crm/leads${q ? `?q=${encodeURIComponent(q)}` : ""}`);
export const createLead = (data: Omit<Lead, "id" | "tenant_id" | "created_at" | "updated_at">) =>
  request<Lead>("/crm/leads", { method: "POST", body: JSON.stringify(data) });
export const updateLead = (id: number, data: Partial<Lead>) =>
  request<Lead>(`/crm/leads/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteLead = (id: number) =>
  request<void>(`/crm/leads/${id}`, { method: "DELETE" });

// ── Módulos do usuário ────────────────────────────────────────────────────────

export const getMyModules = () => request<ModulesMap>("/auth/me/modules");

// ── Hermes ────────────────────────────────────────────────────────────────────

export interface HermesMessage {
  role: "user" | "assistant";
  content: string;
}

export interface HermesChatResponse {
  reply: string;
}

export const hermesChat = (message: string, history: HermesMessage[]) =>
  request<HermesChatResponse>("/hermes/chat", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });
export const getMe = authMe;

// ── Hermes Admin — plano e consumo ────────────────────────────────────────────

export interface HermesUsageAdmin {
  tenant_id: number;
  plan: string;
  plan_label: string;
  messages_used: number;
  messages_limit: number;
  month: string;
  percent: number;
}

export const adminGetHermesUsage = (tenantId: number) =>
  request<HermesUsageAdmin>(`/admin/tenants/${tenantId}/hermes-usage`);

export const adminSetHermesPlan = (tenantId: number, plan: string) =>
  request<HermesUsageAdmin>(`/admin/tenants/${tenantId}/hermes-plan`, {
    method: "PATCH",
    body: JSON.stringify({ plan }),
  });

export const adminResetHermesUsage = (tenantId: number) =>
  request<HermesUsageAdmin>(`/admin/tenants/${tenantId}/hermes-reset`, {
    method: "POST",
  });
