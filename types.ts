
export enum ServiceStatus {
  ANALYSIS = 'Em Análise',
  PENDING_APPROVAL = 'Aguardando Aprovação',
  IN_PROGRESS = 'Em Execução',
  READY = 'Pronto',
  COMPLETED = 'Concluído'
}

export type PaymentMethod = 'Dinheiro' | 'PIX' | 'Cartão' | 'Misto' | 'Nenhum';

export interface Part {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface WorkshopSettings {
  name: string;
  phone: string;
  address: string;
  cnpj?: string;
  logo?: string;
}

export interface ServiceRecord {
  id: string;
  // Car Info
  carPlate: string;
  carModel: string;
  carYear: string;
  carColor: string;
  carMileage: string;
  // Owner Info
  ownerName: string;
  ownerPhone: string;
  // Service Info
  entryDate: string;
  scheduledDate?: string;
  scheduledTime?: string;
  description: string;
  diagnosis: string;
  laborCost: number;
  laborDescription: string;
  parts: Part[];
  warrantyInfo: string;
  // Finance Info
  paymentMethod: PaymentMethod;
  amountPaid: number;
  // Meta
  status: ServiceStatus;
  clientSignature?: string;
  createdAt: number;
  updatedAt: number;
}

export enum LeadStatus {
  NEW = 'Novo Contato',
  NEGOTIATING = 'Em Negociação',
  FOLLOW_UP = 'Retorno',
  LOST = 'Perdido',
  CONVERTED = 'Convertido'
}

export interface CRMLead {
  id: string;
  name: string;
  phone: string;
  vehicle?: string;
  interest?: string;
  status: LeadStatus;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type ViewState = 'DASHBOARD' | 'CREATE_EDIT' | 'DETAILS' | 'SETTINGS' | 'AGENDA' | 'CRM' | 'CLIENTS' | 'HERMES';
