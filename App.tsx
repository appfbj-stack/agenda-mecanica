
import React, { useState, useEffect } from 'react';
import { Plus, Search, Car, User, Wrench, DollarSign, AlertCircle, Moon, Sun, FileDown, MessageCircle, Share2, Settings, PenTool, Calendar, Clock } from 'lucide-react';
import { jsPDF } from "jspdf";
import { ServiceRecord, ServiceStatus, ViewState, Part, WorkshopSettings } from './types';
import { Button, Input, Card, Header, TextArea } from './components/UI';
import { SignaturePad } from './components/SignaturePad';
import * as db from './services/dbService';
import { STATUS_BADGE_STYLES, STATUS_COLORS } from './constants';

// --- Global Helper Functions ---

const generateServicePDF = (service: ServiceRecord, settings: WorkshopSettings) => {
  const doc = new jsPDF();
  const margin = 20;
  let y = 20;

  doc.setFontSize(22);
  doc.setTextColor(79, 70, 229);
  doc.text(settings.name.toUpperCase(), margin, y);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Ordem de Serviço / Orçamento", margin + 100, y);
  
  y += 6;
  doc.setFontSize(8);
  doc.text(`Contato: ${settings.phone} | ${settings.address}`, margin, y);

  y += 10;
  doc.setDrawColor(200);
  doc.line(margin, y, 190, y);
  y += 10;

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("Cliente:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(service.ownerName, margin + 25, y);
  
  doc.setFont("helvetica", "bold");
  doc.text("Telefone:", margin + 100, y);
  doc.setFont("helvetica", "normal");
  doc.text(service.ownerPhone, margin + 125, y);
  
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Veículo:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${service.carModel} (${service.carYear})`, margin + 25, y);
  
  doc.setFont("helvetica", "bold");
  doc.text("Placa:", margin + 100, y);
  doc.setFont("helvetica", "normal");
  doc.text(service.carPlate.toUpperCase(), margin + 125, y);

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Agendamento:", margin, y);
  doc.setFont("helvetica", "normal");
  const agendamento = service.scheduledDate ? `${service.scheduledDate.split('-').reverse().join('/')} às ${service.scheduledTime || '--:--'}` : 'Não agendado';
  doc.text(agendamento, margin + 35, y);

  doc.setFont("helvetica", "bold");
  doc.text("KM:", margin + 100, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${service.carMileage} km`, margin + 125, y);

  y += 15;
  
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, 170, 25, 'F');
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("RELATO & DIAGNÓSTICO", margin + 5, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`Relato: ${service.description}`, margin + 5, y);
  y += 6;
  doc.text(`Diagnóstico: ${service.diagnosis}`, margin + 5, y);
  
  y += 20;

  doc.setFillColor(79, 70, 229);
  doc.rect(margin, y, 170, 8, 'F');
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.text("Peça / Serviço", margin + 5, y + 5.5);
  doc.text("Qtd", margin + 110, y + 5.5);
  doc.text("Unit.", margin + 130, y + 5.5);
  doc.text("Total", margin + 150, y + 5.5);
  
  y += 8;
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");

  service.parts.forEach((part) => {
    doc.text(part.name, margin + 5, y + 6);
    doc.text(part.quantity.toString(), margin + 110, y + 6);
    doc.text(`R$ ${part.unitPrice.toFixed(2)}`, margin + 130, y + 6);
    doc.text(`R$ ${(part.quantity * part.unitPrice).toFixed(2)}`, margin + 150, y + 6);
    y += 8;
    doc.setDrawColor(230);
    doc.line(margin, y, margin + 170, y);
  });

  if (service.laborCost > 0) {
    y += 2;
    doc.text(service.laborDescription || "Mão de Obra", margin + 5, y + 6);
    doc.text("-", margin + 110, y + 6);
    doc.text("-", margin + 130, y + 6);
    doc.text(`R$ ${Number(service.laborCost).toFixed(2)}`, margin + 150, y + 6);
    y += 8;
    doc.line(margin, y, margin + 170, y);
  }

  y += 5;
  const total = db.calculateTotal(service);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL: R$ ${total.toFixed(2)}`, margin + 110, y + 5);

  y += 15;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Garantia: ${service.warrantyInfo}`, margin, y);

  if (service.clientSignature) {
    y += 10;
    doc.text("Assinado Digitalmente pelo Cliente:", margin, y);
    y += 5;
    doc.addImage(service.clientSignature, 'PNG', margin, y, 40, 20);
  }

  doc.save(`OS-${service.carPlate}-${service.id.slice(0,4)}.pdf`);
};

const shareServiceWhatsApp = (service: ServiceRecord, settings: WorkshopSettings) => {
  const total = db.calculateTotal(service).toFixed(2);
  let phone = service.ownerPhone.replace(/\D/g, '');
  if (phone.length >= 10 && phone.length <= 11) phone = `55${phone}`;
  
  const agendamento = service.scheduledDate ? `*Agendamento:* ${service.scheduledDate.split('-').reverse().join('/')} às ${service.scheduledTime || '--:--'}%0A` : '';

  const message = `Olá *${service.ownerName}*, aqui está o resumo do serviço do seu *${service.carModel}* (${service.carPlate}).%0A%0A*Status:* ${service.status}%0A${agendamento}*KM:* ${service.carMileage}%0A*Total:* R$ ${total}%0A%0AAtenciosamente,%0A*${settings.name}*%0AContato: ${settings.phone}`;
  
  window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
};

// --- Views ---

const Dashboard: React.FC<{ 
  onNew: () => void; 
  onSelect: (id: string) => void; 
  onSettings: () => void;
  settings: WorkshopSettings;
}> = ({ onNew, onSelect, onSettings, settings }) => {
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    const data = await db.getServices();
    setServices(data);
  };

  useEffect(() => { loadData(); }, []);

  const filtered = services.filter(s => 
    s.carPlate.toLowerCase().includes(search.toLowerCase()) ||
    s.ownerName.toLowerCase().includes(search.toLowerCase()) ||
    s.carModel.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 transition-colors">
      <Header 
        title={settings.name} 
        subtitle="Gestão de Serviços"
        rightAction={
          <div className="flex items-center gap-2">
            <button onClick={onSettings} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Settings size={20} />
            </button>
            <ThemeToggle />
            <button onClick={onNew} className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-3 rounded-2xl shadow-lg">
              <Plus size={24} />
            </button>
          </div>
        }
      />
      
      <div className="p-5 space-y-6">
        <div className="relative group animate-enter">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
             <Search className="text-indigo-300 dark:text-indigo-400" size={20} />
          </div>
          <input 
            type="text" 
            placeholder="Buscar placa, nome..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 rounded-2xl border-none shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
          />
        </div>

        <div className="grid gap-4">
          {filtered.map((service, index) => (
            <Card key={service.id} onClick={() => onSelect(service.id)} className="border-l-[6px] border-l-indigo-500 animate-enter" style={{ animationDelay: `${index * 50}ms` }}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{service.carModel}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 inline-block px-2 py-0.5 rounded-md">{service.carPlate.toUpperCase()}</p>
                    {service.scheduledDate && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 uppercase">
                        <Calendar size={10} /> {service.scheduledDate.split('-').reverse().slice(0,2).join('/')}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full ${STATUS_BADGE_STYLES[service.status]}`}>{service.status}</span>
              </div>
              
              <div className="flex justify-between items-end mt-4">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-indigo-600 font-bold text-xs">{service.ownerName.charAt(0)}</div>
                   <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{service.ownerName.split(' ')[0]}</p>
                </div>
                <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">R$ {db.calculateTotal(service).toFixed(2)}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

const ServiceForm: React.FC<{
  initialData?: ServiceRecord;
  onSave: (service: ServiceRecord) => void;
  onCancel: () => void;
}> = ({ initialData, onSave, onCancel }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<ServiceRecord>(initialData || {
    id: db.generateId(),
    carPlate: '', carModel: '', carYear: '', carColor: '', carMileage: '',
    ownerName: '', ownerPhone: '',
    entryDate: new Date().toISOString().split('T')[0],
    scheduledDate: '', scheduledTime: '',
    description: '', diagnosis: '',
    laborCost: 0, laborDescription: '',
    parts: [],
    warrantyInfo: '3 meses garantia legal',
    status: ServiceStatus.ANALYSIS,
    createdAt: Date.now(), updatedAt: Date.now()
  });
  const [tempPart, setTempPart] = useState<Part>({ id: '', name: '', quantity: 1, unitPrice: 0 });

  const handleChange = (field: keyof ServiceRecord, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addPart = () => {
    if (!tempPart.name || tempPart.unitPrice <= 0) return;
    const newPart = { ...tempPart, id: db.generateId() };
    setFormData(prev => ({ ...prev, parts: [...prev.parts, newPart] }));
    setTempPart({ id: '', name: '', quantity: 1, unitPrice: 0 });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <Header title={initialData ? "Editar" : "Novo"} onBack={onCancel} />
      <div className="p-5">
        {step === 1 && (
          <div className="space-y-4 animate-enter">
            <h3 className="text-lg font-bold flex items-center gap-2"><Car className="text-indigo-500" size={20}/> Veículo</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Placa" value={formData.carPlate} onChange={e => handleChange('carPlate', e.target.value)} className="uppercase" />
              <Input label="Modelo" value={formData.carModel} onChange={e => handleChange('carModel', e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Ano" type="number" value={formData.carYear} onChange={e => handleChange('carYear', e.target.value)} />
              <Input label="Cor" value={formData.carColor} onChange={e => handleChange('carColor', e.target.value)} />
              <Input label="KM" type="number" value={formData.carMileage} onChange={e => handleChange('carMileage', e.target.value)} />
            </div>

            <h3 className="text-lg font-bold flex items-center gap-2 mt-6"><User className="text-indigo-500" size={20}/> Proprietário</h3>
            <Input label="Nome Completo" value={formData.ownerName} onChange={e => handleChange('ownerName', e.target.value)} />
            <Input label="Telefone / WhatsApp" value={formData.ownerPhone} onChange={e => handleChange('ownerPhone', e.target.value)} />

            <h3 className="text-lg font-bold flex items-center gap-2 mt-6"><Calendar className="text-indigo-500" size={20}/> Agendamento</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Data" type="date" value={formData.scheduledDate} onChange={e => handleChange('scheduledDate', e.target.value)} />
              <Input label="Hora" type="time" value={formData.scheduledTime} onChange={e => handleChange('scheduledTime', e.target.value)} />
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4 animate-enter">
            <h3 className="text-lg font-bold flex items-center gap-2"><AlertCircle className="text-indigo-500" size={20}/> Problema</h3>
            <TextArea label="Relato do Cliente" value={formData.description} onChange={e => handleChange('description', e.target.value)} />
            <TextArea label="Diagnóstico Técnico" value={formData.diagnosis} onChange={e => handleChange('diagnosis', e.target.value)} />
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl mt-4">
              <label className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-2 block">Status</label>
              <div className="flex flex-wrap gap-2">
                {Object.values(ServiceStatus).map(s => (
                  <button key={s} onClick={() => handleChange('status', s)} className={`text-xs px-3 py-2 rounded-lg border transition-all ${formData.status === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800'}`}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-5 animate-enter">
            <h3 className="text-lg font-bold flex items-center gap-2"><DollarSign className="text-indigo-500" size={20}/> Orçamento</h3>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border">
              <Input placeholder="Peça" value={tempPart.name} onChange={e => setTempPart({...tempPart, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Input type="number" placeholder="Qtd" value={tempPart.quantity} onChange={e => setTempPart({...tempPart, quantity: Number(e.target.value)})} />
                <Input type="number" placeholder="R$" value={tempPart.unitPrice} onChange={e => setTempPart({...tempPart, unitPrice: Number(e.target.value)})} />
              </div>
              <Button onClick={addPart} fullWidth className="mt-2" size="sm">Adicionar Peça</Button>
            </div>
            {formData.parts.map((p, idx) => (
              <div key={idx} className="flex justify-between p-3 bg-white dark:bg-slate-800 border rounded-xl text-sm">
                <span>{p.quantity}x {p.name}</span>
                <span className="font-bold">R$ {p.quantity * p.unitPrice}</span>
              </div>
            ))}
            <Input label="Mão de Obra (R$)" type="number" value={formData.laborCost} onChange={e => handleChange('laborCost', Number(e.target.value))} />
            <div className="bg-slate-900 text-white p-4 rounded-xl flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>R$ {db.calculateTotal(formData).toFixed(2)}</span>
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-5 animate-enter">
             <h3 className="text-lg font-bold flex items-center gap-2"><PenTool className="text-indigo-500" size={20}/> Autorização</h3>
             <SignaturePad onSave={(sig) => handleChange('clientSignature', sig)} existingSignature={formData.clientSignature} />
          </div>
        )}
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t flex gap-3">
        {step > 1 && <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">Voltar</Button>}
        {step < 4 ? <Button onClick={() => setStep(s => s + 1)} fullWidth className="flex-[2]">Próximo</Button> : <Button onClick={() => onSave(formData)} variant="success" fullWidth className="flex-[2]">Salvar</Button>}
      </div>
    </div>
  );
};

const ServiceDetails: React.FC<{
  service: ServiceRecord;
  settings: WorkshopSettings;
  onBack: () => void;
  onEdit: () => void;
}> = ({ service, settings, onBack, onEdit }) => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
    <Header title={service.carModel} subtitle={service.carPlate.toUpperCase()} onBack={onBack} rightAction={<Button variant="ghost" size="sm" onClick={onEdit}>Editar</Button>} />
    <div className="p-5 space-y-6 animate-enter">
      <div className={`p-6 rounded-3xl ${STATUS_COLORS[service.status]} flex flex-col items-center gap-2`}>
        <h2 className="text-2xl font-extrabold">{service.status}</h2>
        <p className="text-sm opacity-80">{service.entryDate}</p>
      </div>

      {service.scheduledDate && (
        <Card className="bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800">
           <div className="flex items-center gap-3 text-indigo-700 dark:text-indigo-300">
              <Calendar size={20} />
              <div>
                <p className="text-[10px] uppercase font-bold opacity-70">Agendamento para o Cliente</p>
                <p className="font-bold">{service.scheduledDate.split('-').reverse().join('/')} às {service.scheduledTime || '--:--'}</p>
              </div>
           </div>
        </Card>
      )}

      <Card className="space-y-4">
         <h3 className="font-bold flex items-center gap-2 text-indigo-600"><User size={18}/> Cliente e Veículo</h3>
         <p className="text-sm font-medium">{service.ownerName} - {service.carMileage} km</p>
         <p className="text-sm opacity-60">{service.ownerPhone}</p>
      </Card>
      <Card className="space-y-4">
         <h3 className="font-bold flex items-center gap-2 text-indigo-600"><Wrench size={18}/> Diagnóstico</h3>
         <p className="text-sm">{service.description}</p>
         {service.diagnosis && <p className="text-sm italic text-indigo-400">"{service.diagnosis}"</p>}
      </Card>
      <div className="pt-3 flex justify-between items-center px-4">
        <span className="font-bold">Total Geral</span>
        <span className="text-xl font-extrabold text-indigo-600">R$ {db.calculateTotal(service).toFixed(2)}</span>
      </div>
      {service.clientSignature && <Card><img src={service.clientSignature} className="w-full h-auto max-h-32 object-contain" /></Card>}
    </div>
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-slate-900/90 border-t flex gap-3">
      <Button onClick={() => shareServiceWhatsApp(service, settings)} className="flex-1 bg-[#25D366] text-white"><MessageCircle size={20}/> Zap</Button>
      <Button onClick={() => generateServicePDF(service, settings)} className="flex-1 bg-indigo-600 text-white"><FileDown size={20} /> PDF</Button>
    </div>
  </div>
);

const SettingsPanel: React.FC<{
  settings: WorkshopSettings;
  onSave: (settings: WorkshopSettings) => void;
  onBack: () => void;
}> = ({ settings, onSave, onBack }) => {
  const [localSettings, setLocalSettings] = useState<WorkshopSettings>(settings);
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <Header title="Configurações" onBack={onBack} />
      <div className="p-5 space-y-6 animate-enter">
         <Card className="space-y-4">
           <Input label="Nome da Oficina" value={localSettings.name} onChange={e => setLocalSettings({...localSettings, name: e.target.value})} />
           <Input label="Telefone" value={localSettings.phone} onChange={e => setLocalSettings({...localSettings, phone: e.target.value})} />
           <Input label="Endereço" value={localSettings.address} onChange={e => setLocalSettings({...localSettings, address: e.target.value})} />
         </Card>
         <Button fullWidth onClick={() => onSave(localSettings)}>Salvar Alterações</Button>
      </div>
    </div>
  );
};

// --- Theme Toggle ---
const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
    localStorage.theme = !isDark ? 'dark' : 'light';
  };
  return (
    <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600">
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
};

// --- App Component ---

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settings, setSettings] = useState<WorkshopSettings | null>(null);
  const [services, setServices] = useState<ServiceRecord[]>([]);

  useEffect(() => {
    const init = async () => {
      const s = await db.getSettings();
      const sv = await db.getServices();
      setSettings(s);
      setServices(sv);
    };
    init();
  }, [view]);

  const handleSave = async (service: ServiceRecord) => {
    await db.saveService(service);
    setView('DASHBOARD');
  };

  const handleSaveSettings = async (newSettings: WorkshopSettings) => {
    await db.saveSettings(newSettings);
    setSettings(newSettings);
    setView('DASHBOARD');
  };

  if (!settings) return null;

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-slate-950 min-h-screen shadow-2xl relative">
      {view === 'DASHBOARD' && (
        <Dashboard 
          settings={settings}
          onSettings={() => setView('SETTINGS')}
          onNew={() => { setSelectedId(null); setView('CREATE_EDIT'); }}
          onSelect={(id) => { setSelectedId(id); setView('DETAILS'); }}
        />
      )}
      {view === 'SETTINGS' && <SettingsPanel settings={settings} onSave={handleSaveSettings} onBack={() => setView('DASHBOARD')} />}
      {view === 'CREATE_EDIT' && (
        <ServiceForm 
          initialData={selectedId ? services.find(s => s.id === selectedId) : undefined}
          onSave={handleSave}
          onCancel={() => setView('DASHBOARD')}
        />
      )}
      {view === 'DETAILS' && selectedId && services.find(s => s.id === selectedId) && (
        <ServiceDetails 
          service={services.find(s => s.id === selectedId)!} 
          settings={settings}
          onBack={() => setView('DASHBOARD')}
          onEdit={() => setView('CREATE_EDIT')}
        />
      )}
    </div>
  );
};

export default App;
