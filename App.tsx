import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Car, User, Wrench, FileText, ChevronLeft, Check, Trash2, PenTool, Calendar, DollarSign, AlertCircle, ArrowRight, Moon, Sun, FileDown, MessageCircle, Share2, X } from 'lucide-react';
import { jsPDF } from "jspdf";
import { ServiceRecord, ServiceStatus, ViewState, Part } from './types';
import { Button, Input, Card, Header, TextArea } from './components/UI';
import { SignaturePad } from './components/SignaturePad';
import { getServices, saveService, generateId, calculateTotal } from './services/storageService';
import { STATUS_BADGE_STYLES, STATUS_COLORS } from './constants';

// --- Global Helper Functions (PDF & WhatsApp) ---

const generateServicePDF = (service: ServiceRecord) => {
  const doc = new jsPDF();
  const margin = 20;
  let y = 20;

  // Header
  doc.setFontSize(22);
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text("Oficina+", margin, y);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Ordem de Serviço / Orçamento", margin + 100, y);
  
  y += 15;
  doc.setDrawColor(200);
  doc.line(margin, y, 190, y);
  y += 10;

  // Info Grid
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

  y += 15;
  
  // Diagnosis
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

  // Parts Table Header
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

  // Parts List
  service.parts.forEach((part) => {
    doc.text(part.name, margin + 5, y + 6);
    doc.text(part.quantity.toString(), margin + 110, y + 6);
    doc.text(`R$ ${part.unitPrice.toFixed(2)}`, margin + 130, y + 6);
    doc.text(`R$ ${(part.quantity * part.unitPrice).toFixed(2)}`, margin + 150, y + 6);
    y += 8;
    doc.setDrawColor(230);
    doc.line(margin, y, margin + 170, y);
  });

  // Labor
  if (service.laborCost > 0) {
    y += 2;
    doc.text(service.laborDescription || "Mão de Obra", margin + 5, y + 6);
    doc.text("-", margin + 110, y + 6);
    doc.text("-", margin + 130, y + 6);
    doc.text(`R$ ${Number(service.laborCost).toFixed(2)}`, margin + 150, y + 6);
    y += 8;
    doc.line(margin, y, margin + 170, y);
  }

  // Total
  y += 5;
  const total = calculateTotal(service);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL: R$ ${total.toFixed(2)}`, margin + 110, y + 5);

  // Warranty
  y += 15;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Garantia: ${service.warrantyInfo}`, margin, y);

  // Signature
  if (service.clientSignature) {
    y += 10;
    doc.text("Assinado Digitalmente:", margin, y);
    y += 5;
    doc.addImage(service.clientSignature, 'PNG', margin, y, 40, 20);
  }

  doc.save(`OS-${service.carPlate}-${service.id.slice(0,4)}.pdf`);
};

const shareServiceWhatsApp = (service: ServiceRecord) => {
  const total = calculateTotal(service).toFixed(2);
  // Clean phone: remove non-digits
  let phone = service.ownerPhone.replace(/\D/g, '');
  // Basic assumption: if length is 10 or 11, assume Brazil (55)
  if (phone.length >= 10 && phone.length <= 11) {
    phone = `55${phone}`;
  }
  
  const message = `Olá ${service.ownerName}, aqui está o resumo do serviço do seu *${service.carModel}* (${service.carPlate}).%0A%0A*Status:* ${service.status}%0A*Total:* R$ ${total}%0A%0ADúvidas à disposição!`;
  
  window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
};

// --- Helper Components ---

const StatusBadge: React.FC<{ status: ServiceStatus }> = ({ status }) => (
  <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full shadow-sm tracking-wide uppercase ${STATUS_BADGE_STYLES[status] || 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
    {status}
  </span>
);

const EmptyState: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
  <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-enter">
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/50 p-8 rounded-full mb-6 shadow-inner dark:shadow-none">
      <Wrench className="w-12 h-12 text-indigo-500 dark:text-indigo-400 opacity-80" />
    </div>
    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-3">Sua oficina está vazia</h3>
    <p className="text-slate-400 dark:text-slate-500 mb-8 max-w-xs mx-auto leading-relaxed">Registre a entrada do primeiro veículo e comece a organizar o fluxo de trabalho.</p>
    <Button onClick={onCreate} className="animate-bounce shadow-indigo-500/40 dark:shadow-indigo-900/40">Criar Novo Serviço</Button>
  </div>
);

const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDark(true);
    }
  };

  return (
    <button 
      onClick={toggleTheme} 
      className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
      aria-label="Alternar tema"
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
};

const SplashScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(onFinish, 500); // Wait for fade out
    }, 2000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-50 bg-gradient-to-br from-indigo-600 to-violet-700 dark:from-slate-900 dark:to-slate-950 flex flex-col items-center justify-center text-white transition-opacity duration-500 ${fading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className="bg-white/10 p-6 rounded-3xl mb-6 backdrop-blur-md animate-bounce shadow-2xl shadow-indigo-900/50">
        <Wrench size={64} className="text-white" />
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight mb-2">Oficina+</h1>
      <p className="text-indigo-200 dark:text-slate-400 font-medium tracking-wide text-sm">Gestão Inteligente</p>
      
      <div className="absolute bottom-12">
         <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
      </div>
    </div>
  );
};

// --- Views ---

const Dashboard: React.FC<{ 
  onNew: () => void; 
  onSelect: (id: string) => void; 
}> = ({ onNew, onSelect }) => {
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setServices(getServices());
  }, []);

  const filtered = services.filter(s => 
    s.carPlate.toLowerCase().includes(search.toLowerCase()) ||
    s.ownerName.toLowerCase().includes(search.toLowerCase()) ||
    s.carModel.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 transition-colors">
      <Header 
        title="Oficina+" 
        subtitle="Gestão Inteligente"
        rightAction={
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={onNew} className="bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-500 dark:to-violet-500 text-white p-3 rounded-2xl shadow-lg shadow-indigo-500/30 dark:shadow-indigo-900/30 active:scale-90 transition-all hover:rotate-90 duration-500">
              <Plus size={24} strokeWidth={2.5} />
            </button>
          </div>
        }
      />
      
      <div className="p-5 space-y-6">
        {/* Hero Stats or Search */}
        <div className="relative group animate-enter">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
             <Search className="text-indigo-300 dark:text-indigo-400 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" size={20} />
          </div>
          <input 
            type="text" 
            placeholder="Buscar placa, nome..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 rounded-2xl border-none shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500 transition-all outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 font-medium"
          />
        </div>

        {services.length === 0 && !search ? (
          <EmptyState onCreate={onNew} />
        ) : (
          <div className="grid gap-4">
            {filtered.map((service, index) => (
              <div key={service.id} className={`animate-enter`} style={{ animationDelay: `${index * 50}ms` }}>
                <Card onClick={() => onSelect(service.id)} className="flex flex-col gap-3 relative overflow-hidden group border-l-[6px] border-l-indigo-500 dark:border-l-indigo-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {service.carModel}
                      </h3>
                      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 inline-block px-2 py-0.5 rounded-md mt-1 font-mono tracking-wider">{service.carPlate.toUpperCase()}</p>
                    </div>
                    <StatusBadge status={service.status} />
                  </div>
                  
                  <div className="flex justify-between items-end mt-1">
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                          {service.ownerName.charAt(0)}
                       </div>
                       <div className="flex flex-col">
                          <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Cliente</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium truncate max-w-[120px]">{service.ownerName.split(' ')[0]}</p>
                       </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Valor</p>
                      <p className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-400">
                        R$ {calculateTotal(service).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/50 flex justify-between items-center">
                     <span className="text-[10px] font-bold text-slate-300 dark:text-slate-500 uppercase tracking-wider">Ações Rápidas</span>
                     <div className="flex gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); shareServiceWhatsApp(service); }}
                            className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors shadow-sm border border-green-100 dark:border-green-900/30"
                            title="Enviar no WhatsApp"
                        >
                          <MessageCircle size={18} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); generateServicePDF(service); }}
                            className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors shadow-sm border border-indigo-100 dark:border-indigo-900/30"
                            title="Baixar PDF"
                        >
                          <FileDown size={18} />
                        </button>
                     </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}
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
    id: generateId(),
    carPlate: '', carModel: '', carYear: '', carColor: '',
    ownerName: '', ownerPhone: '',
    entryDate: new Date().toISOString().split('T')[0],
    description: '', diagnosis: '',
    laborCost: 0, laborDescription: '',
    parts: [],
    warrantyInfo: '',
    status: ServiceStatus.ANALYSIS,
    createdAt: Date.now(), updatedAt: Date.now()
  });
  const [tempPart, setTempPart] = useState<Part>({ id: '', name: '', quantity: 1, unitPrice: 0 });

  const handleChange = (field: keyof ServiceRecord, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addPart = () => {
    if (!tempPart.name || tempPart.unitPrice <= 0) return;
    const newPart = { ...tempPart, id: generateId() };
    setFormData(prev => ({ ...prev, parts: [...prev.parts, newPart] }));
    setTempPart({ id: '', name: '', quantity: 1, unitPrice: 0 });
  };

  const removePart = (id: string) => {
    setFormData(prev => ({ ...prev, parts: prev.parts.filter(p => p.id !== id) }));
  };

  const renderStep1 = () => (
    <div className="space-y-4 animate-enter">
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><Car className="text-indigo-500" size={20}/> Dados do Veículo</h3>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Placa" placeholder="ABC-1234" value={formData.carPlate} onChange={e => handleChange('carPlate', e.target.value)} className="uppercase" />
        <Input label="Modelo" placeholder="Ex: Fiat Uno" value={formData.carModel} onChange={e => handleChange('carModel', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Ano" type="number" value={formData.carYear} onChange={e => handleChange('carYear', e.target.value)} />
        <Input label="Cor" value={formData.carColor} onChange={e => handleChange('carColor', e.target.value)} />
      </div>
      
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mt-6"><User className="text-indigo-500" size={20}/> Proprietário</h3>
      <Input label="Nome Completo" value={formData.ownerName} onChange={e => handleChange('ownerName', e.target.value)} />
      <Input label="Telefone / WhatsApp" type="tel" value={formData.ownerPhone} onChange={e => handleChange('ownerPhone', e.target.value)} />
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4 animate-enter">
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><AlertCircle className="text-indigo-500" size={20}/> Diagnóstico</h3>
      <TextArea label="Relato do Cliente" value={formData.description} onChange={e => handleChange('description', e.target.value)} placeholder="O que o cliente relatou?" />
      <TextArea label="Diagnóstico Técnico" value={formData.diagnosis} onChange={e => handleChange('diagnosis', e.target.value)} placeholder="Qual o problema real?" />
      
      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30 mt-4">
        <label className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-2 block">Status Atual</label>
        <div className="flex flex-wrap gap-2">
          {Object.values(ServiceStatus).map(status => (
             <button
               key={status}
               onClick={() => handleChange('status', status)}
               className={`text-xs px-3 py-2 rounded-lg border transition-all ${formData.status === status ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
             >
               {status}
             </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-5 animate-enter">
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><DollarSign className="text-indigo-500" size={20}/> Orçamento</h3>
      
      {/* Add Part Form */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Adicionar Peças</p>
        <div className="grid grid-cols-6 gap-2 mb-2">
          <div className="col-span-6">
             <Input placeholder="Nome da Peça" value={tempPart.name} onChange={e => setTempPart({...tempPart, name: e.target.value})} className="text-sm py-2" />
          </div>
          <div className="col-span-2">
            <Input type="number" placeholder="Qtd" value={tempPart.quantity} onChange={e => setTempPart({...tempPart, quantity: Number(e.target.value)})} className="text-sm py-2" />
          </div>
          <div className="col-span-2">
            <Input type="number" placeholder="R$ Unit." value={tempPart.unitPrice} onChange={e => setTempPart({...tempPart, unitPrice: Number(e.target.value)})} className="text-sm py-2" />
          </div>
          <div className="col-span-2">
             <Button onClick={addPart} size="sm" fullWidth className="h-full py-0">+</Button>
          </div>
        </div>
      </div>

      {/* Parts List */}
      <div className="space-y-2">
        {formData.parts.map((part, idx) => (
          <div key={idx} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm">
            <div>
              <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">{part.name}</p>
              <p className="text-xs text-slate-400">{part.quantity}x R$ {part.unitPrice.toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-indigo-600 dark:text-indigo-400">R$ {(part.quantity * part.unitPrice).toFixed(2)}</span>
              <button onClick={() => removePart(part.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 my-4 pt-4">
        <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-3">Mão de Obra</h4>
        <Input label="Descrição do Serviço" value={formData.laborDescription} onChange={e => handleChange('laborDescription', e.target.value)} placeholder="Ex: Troca de óleo e filtros" />
        <Input label="Valor Mão de Obra (R$)" type="number" value={formData.laborCost} onChange={e => handleChange('laborCost', Number(e.target.value))} className="mt-2" />
      </div>

      <div className="bg-slate-900 dark:bg-black text-white p-4 rounded-xl flex justify-between items-center shadow-xl shadow-slate-200 dark:shadow-none">
        <span className="font-medium text-slate-400">Total Estimado</span>
        <span className="text-2xl font-bold">R$ {calculateTotal(formData).toFixed(2)}</span>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-5 animate-enter">
       <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><PenTool className="text-indigo-500" size={20}/> Autorização</h3>
       <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-xl">
         <p className="text-xs text-orange-700 dark:text-orange-400 leading-relaxed">
           Ao assinar, o cliente concorda com os serviços descritos e autoriza a execução. As peças trocadas possuem garantia conforme lei vigente.
         </p>
       </div>
       <Input label="Termos de Garantia" value={formData.warrantyInfo} onChange={e => handleChange('warrantyInfo', e.target.value)} placeholder="Ex: 3 meses motor e caixa" />
       
       <div className="mt-4">
         <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            Assinatura do Cliente <span className="text-red-500 ml-1" title="Obrigatório">*</span>
         </label>
         <SignaturePad 
            onSave={(signature) => handleChange('clientSignature', signature)}
            existingSignature={formData.clientSignature} 
         />
         {!formData.clientSignature && (
            <p className="text-xs text-red-400 mt-2 font-medium animate-enter">A assinatura é obrigatória para finalizar.</p>
         )}
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <Header 
        title={initialData ? "Editar Serviço" : "Novo Serviço"} 
        onBack={onCancel}
        rightAction={<div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-lg">Passo {step}/4</div>}
      />
      
      <div className="p-5">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 flex gap-3 z-20">
        {step > 1 && (
          <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">Voltar</Button>
        )}
        {step < 4 ? (
          <Button onClick={() => setStep(s => s + 1)} fullWidth className="flex-[2]">Próximo <ArrowRight size={18}/></Button>
        ) : (
          <Button 
            onClick={() => onSave(formData)} 
            variant="success" 
            fullWidth 
            className="flex-[2]"
            disabled={!formData.clientSignature}
          >
            Salvar e Finalizar <Check size={18}/>
          </Button>
        )}
      </div>
    </div>
  );
};

const ServiceDetails: React.FC<{
  service: ServiceRecord;
  onBack: () => void;
  onEdit: () => void;
}> = ({ service, onBack, onEdit }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <Header 
        title={service.carModel} 
        subtitle={service.carPlate.toUpperCase()}
        onBack={onBack}
        rightAction={
          <Button variant="ghost" size="sm" onClick={onEdit} className="text-indigo-600 dark:text-indigo-400">Editar</Button>
        }
      />

      <div className="p-5 space-y-6">
        {/* Status Card */}
        <div className={`p-6 rounded-3xl ${STATUS_COLORS[service.status]} flex flex-col items-center justify-center text-center gap-2 animate-enter`}>
           <h2 className="text-2xl font-extrabold tracking-tight">{service.status}</h2>
           <p className="text-sm opacity-80">{service.entryDate}</p>
        </div>

        {/* Client Info */}
        <Card className="space-y-4 animate-enter stagger-1">
           <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
             <User size={18} className="text-indigo-500"/> Dados do Cliente
           </h3>
           <div className="grid grid-cols-1 gap-3">
             <div>
               <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold">Nome</p>
               <p className="font-medium text-slate-700 dark:text-slate-300">{service.ownerName}</p>
             </div>
             <div>
               <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold">Telefone</p>
               <p className="font-medium text-slate-700 dark:text-slate-300">{service.ownerPhone}</p>
             </div>
           </div>
        </Card>

        {/* Problem & Diagnosis */}
        <Card className="space-y-4 animate-enter stagger-2">
           <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
             <Wrench size={18} className="text-indigo-500"/> Diagnóstico
           </h3>
           <div>
             <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold">Relato</p>
             <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{service.description}</p>
           </div>
           {service.diagnosis && (
             <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl">
               <p className="text-xs text-indigo-400 dark:text-indigo-300 uppercase font-bold">Diagnóstico Técnico</p>
               <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">{service.diagnosis}</p>
             </div>
           )}
        </Card>

        {/* Financials */}
        <Card className="space-y-4 animate-enter stagger-3">
           <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
             <DollarSign size={18} className="text-indigo-500"/> Valores
           </h3>
           
           <div className="space-y-2">
             {service.parts.map((p, i) => (
               <div key={i} className="flex justify-between text-sm text-slate-600 dark:text-slate-400 border-b border-dashed border-slate-100 dark:border-slate-800 pb-1 last:border-0">
                 <span>{p.quantity}x {p.name}</span>
                 <span className="font-medium">R$ {(p.quantity * p.unitPrice).toFixed(2)}</span>
               </div>
             ))}
             {service.laborCost > 0 && (
                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 pt-1">
                  <span>Mão de Obra ({service.laborDescription})</span>
                  <span className="font-medium">R$ {service.laborCost.toFixed(2)}</span>
                </div>
             )}
           </div>

           <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
             <span className="font-bold text-slate-800 dark:text-slate-200">Total Geral</span>
             <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">R$ {calculateTotal(service).toFixed(2)}</span>
           </div>
        </Card>

        {/* Signature */}
        {service.clientSignature ? (
           <Card className="animate-enter stagger-3">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-3">Assinatura do Cliente</h3>
              <div className="bg-slate-50 dark:bg-slate-200 rounded-lg p-2">
                <img src={service.clientSignature} alt="Assinatura" className="w-full h-auto opacity-90" />
              </div>
           </Card>
        ) : (
          <div className="p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center text-slate-400 dark:text-slate-500 text-sm">
            Ainda não assinado
          </div>
        )}

        <div className="h-20"></div> 
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 flex gap-3 z-20">
        <Button 
            onClick={() => shareServiceWhatsApp(service)}
            className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white shadow-lg shadow-green-500/20"
        >
            <MessageCircle className="mr-2" size={20}/> WhatsApp
        </Button>
        <Button 
            onClick={() => generateServicePDF(service)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30"
        >
            <FileDown className="mr-2" size={20} /> PDF
        </Button>
      </div>
    </div>
  );
};

// --- Main Controller ---

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate app load
    setTimeout(() => setLoading(false), 2000);
  }, []);

  const handleSave = (service: ServiceRecord) => {
    saveService(service);
    setView('DASHBOARD');
    setSelectedId(null);
  };

  if (loading) return <SplashScreen onFinish={() => setLoading(false)} />;

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-slate-950 min-h-screen shadow-2xl overflow-hidden relative">
      {view === 'DASHBOARD' && (
        <Dashboard 
          onNew={() => { setSelectedId(null); setView('CREATE_EDIT'); }}
          onSelect={(id) => { setSelectedId(id); setView('DETAILS'); }}
        />
      )}
      
      {view === 'CREATE_EDIT' && (
        <ServiceForm 
          initialData={selectedId ? getServices().find(s => s.id === selectedId) : undefined}
          onSave={handleSave}
          onCancel={() => setView('DASHBOARD')}
        />
      )}

      {view === 'DETAILS' && selectedId && (
        <ServiceDetails 
          service={getServices().find(s => s.id === selectedId)!} 
          onBack={() => setView('DASHBOARD')}
          onEdit={() => setView('CREATE_EDIT')}
        />
      )}
    </div>
  );
};

export default App;