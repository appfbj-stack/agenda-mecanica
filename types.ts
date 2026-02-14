
export enum ServiceStatus {
  ANALYSIS = 'Em Análise',
  PENDING_APPROVAL = 'Aguardando Aprovação',
  IN_PROGRESS = 'Em Execução',
  READY = 'Pronto',
  COMPLETED = 'Concluído'
}

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
  scheduledDate?: string; // New field
  scheduledTime?: string; // New field
  description: string; // Problem reported
  diagnosis: string;
  laborCost: number;
  laborDescription: string;
  parts: Part[];
  warrantyInfo: string;
  // Meta
  status: ServiceStatus;
  clientSignature?: string; // Base64 string
  createdAt: number;
  updatedAt: number;
}

export type ViewState = 'DASHBOARD' | 'CREATE_EDIT' | 'DETAILS' | 'SETTINGS';
