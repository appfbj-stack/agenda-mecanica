import { ServiceRecord, Part, ServiceStatus } from '../types';
import { STORAGE_KEY } from '../constants';

const MOCK_DATA: ServiceRecord[] = [
  {
    id: 'mock-1',
    carPlate: 'BRA-2E19',
    carModel: 'Fiat Strada 1.4',
    carYear: '2021',
    carColor: 'Branca',
    ownerName: 'João da Silva (Transportes Express)',
    ownerPhone: '(11) 99999-1234',
    entryDate: new Date().toISOString().split('T')[0], // Hoje
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
    status: ServiceStatus.IN_PROGRESS,
    clientSignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', // Mock Fake Signature
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'mock-2',
    carPlate: 'ABC-1234',
    carModel: 'Toyota Corolla XEi',
    carYear: '2018',
    carColor: 'Prata',
    ownerName: 'Dra. Ana Maria',
    ownerPhone: '(11) 98888-5555',
    entryDate: '2023-10-25',
    description: 'Revisão de 50.000km e barulho no freio.',
    diagnosis: 'Pastilhas dianteiras no fim da vida útil.',
    laborCost: 300,
    laborDescription: 'Revisão completa + Troca de pastilhas',
    parts: [
      { id: 'p4', name: 'Kit Pastilha Dianteira', quantity: 1, unitPrice: 380 },
      { id: 'p5', name: 'Óleo 5w30 (Litro)', quantity: 4, unitPrice: 65 },
      { id: 'p6', name: 'Filtro de Óleo', quantity: 1, unitPrice: 45 }
    ],
    warrantyInfo: '6 meses na pastilha',
    status: ServiceStatus.READY,
    clientSignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    createdAt: Date.now() - 100000,
    updatedAt: Date.now()
  },
  {
    id: 'mock-3',
    carPlate: 'XYZ-9090',
    carModel: 'Hyundai HB20 1.0',
    carYear: '2015',
    carColor: 'Preto',
    ownerName: 'Carlos Eduardo',
    ownerPhone: '(21) 97777-1010',
    entryDate: '2023-10-28',
    description: 'Carro morrendo quando para no sinal. Ar condicionado parou.',
    diagnosis: 'Em análise...',
    laborCost: 0,
    laborDescription: '',
    parts: [],
    warrantyInfo: '',
    status: ServiceStatus.ANALYSIS,
    createdAt: Date.now() - 200000,
    updatedAt: Date.now()
  },
  {
    id: 'mock-4',
    carPlate: 'FGH-5544',
    carModel: 'VW Gol G5',
    carYear: '2012',
    carColor: 'Vermelho',
    ownerName: 'Pedro Pedreiro',
    ownerPhone: '(11) 91234-5678',
    entryDate: '2023-10-27',
    description: 'Embreagem patinando muito.',
    diagnosis: 'Kit de embreagem completo necessário.',
    laborCost: 400,
    laborDescription: 'Troca do kit de embreagem',
    parts: [
      { id: 'p7', name: 'Kit Embreagem Luk', quantity: 1, unitPrice: 650 }
    ],
    warrantyInfo: '3 meses',
    status: ServiceStatus.PENDING_APPROVAL,
    // No signature yet
    createdAt: Date.now() - 50000,
    updatedAt: Date.now()
  }
];

export const getServices = (): ServiceRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    
    // Se estiver vazio, preenche com dados de exemplo (Mocap)
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
    services.unshift(service); // Add to top
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(services));
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const calculateTotal = (service: ServiceRecord): number => {
  const partsTotal = service.parts.reduce((acc, part) => acc + (part.quantity * part.unitPrice), 0);
  return partsTotal + (Number(service.laborCost) || 0);
};