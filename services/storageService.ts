
import { ServiceRecord, Part, ServiceStatus, WorkshopSettings } from '../types';
import { STORAGE_KEY } from '../constants';

const SETTINGS_KEY = 'oficina_plus_settings_v1';

const DEFAULT_SETTINGS: WorkshopSettings = {
  name: 'Oficina+',
  phone: '(11) 99999-9999',
  address: 'Rua das Oficinas, 123'
};

const MOCK_DATA: ServiceRecord[] = [
  {
    id: 'mock-1',
    carPlate: 'BRA-2E19',
    carModel: 'Fiat Strada 1.4',
    carYear: '2021',
    carColor: 'Branca',
    carMileage: '45.200',
    ownerName: 'João da Silva (Transportes Express)',
    ownerPhone: '(11) 99999-1234',
    entryDate: new Date().toISOString().split('T')[0],
    description: 'Luz de injeção acesa e perdendo potência na subida.',
    diagnosis: 'Falha na bobina de ignição e velas gastas.',
    laborCost: 250,
    laborDescription: 'Troca de velas, cabos e bobina + limpeza de bicos',
    parts: [
      { id: 'p1', name: 'Jogo de Velas NGK', quantity: 1, unitPrice: 120 },
      { id: 'p2', name: 'Bobina de Ignição', quantity: 1, unitPrice: 450 },
      { id: 'p3', name: 'Cabo de Vela', quantity: 1, unitPrice: 180 }
    ],
    warrantyInfo: '3 meses para peças e mão de obra',
    // Fix: Added missing paymentMethod and amountPaid properties to match ServiceRecord type
    paymentMethod: 'Nenhum',
    amountPaid: 0,
    status: ServiceStatus.IN_PROGRESS,
    clientSignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

export const getServices = (): ServiceRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_DATA));
    return MOCK_DATA;
  } catch (e) {
    console.error('Error loading services', e);
    return [];
  }
};

export const saveService = (service: ServiceRecord): void => {
  const services = getServices();
  const existingIndex = services.findIndex(s => s.id === service.id);
  if (existingIndex >= 0) {
    services[existingIndex] = service;
  } else {
    services.unshift(service);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(services));
};

export const getSettings = (): WorkshopSettings => {
  const data = localStorage.getItem(SETTINGS_KEY);
  if (data) return JSON.parse(data);
  return DEFAULT_SETTINGS;
};

export const saveSettings = (settings: WorkshopSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const calculateTotal = (service: ServiceRecord): number => {
  const partsTotal = service.parts.reduce((acc, part) => acc + (part.quantity * part.unitPrice), 0);
  return partsTotal + (Number(service.laborCost) || 0);
};
