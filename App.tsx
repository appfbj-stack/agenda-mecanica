
import React, { useState, useEffect } from 'react';
import { Plus, Search, Car, User, Wrench, DollarSign, AlertCircle, Moon, Sun, FileDown, MessageCircle, Share2, Settings, PenTool, Calendar, Clock, Loader2, Trash2, CreditCard, Banknote, Landmark, AlertTriangle, Image as ImageIcon, Upload, X, Users, LayoutDashboard, Contact, Bot, Send, Shield, ToggleLeft, ToggleRight } from 'lucide-react';
import { jsPDF } from "jspdf";
import { ServiceRecord, ServiceStatus, ViewState, Part, WorkshopSettings, PaymentMethod, CRMLead, LeadStatus } from './types';
import { Button, Input, Card, Header, TextArea } from './components/UI';
import { SignaturePad } from './components/SignaturePad';
import * as db from './services/dbService';
import { getMyModules, hermesChat, HermesMessage, ModulesMap, adminListTenants, adminToggleModule, adminUpdateTenant, getMe, UserOut, adminGetHermesUsage, adminSetHermesPlan, adminResetHermesUsage } from './src/api';
import { STATUS_BADGE_STYLES, STATUS_COLORS } from './constants';

// 🔧 SEU NÚMERO WHATSAPP DE SUPORTE (só os dígitos, com DDI+DDD)
const SUPORTE_WHATSAPP = '5541999999999'; // ← troque pelo seu número

// --- Global Helper Functions ---

const generateServicePDF = (service: ServiceRecord, settings: WorkshopSettings) => {
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = 210;
  const pageHeight = 297;
  let y = 20;

  const checkPageBreak = (needed: number) => {
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      y = 20;
      return true;
    }
    return false;
  };

  // Header with Logo
  if (settings.logo) {
    try {
      doc.addImage(settings.logo, 'PNG', margin, y, 30, 30);
      y += 35;
    } catch (e) {
      console.error("Erro ao adicionar logo ao PDF", e);
    }
  }

  doc.setFontSize(22);
  doc.setTextColor(188, 19, 254); // Neon Purple
  doc.setFont("helvetica", "bold");
  doc.text(settings.name.toUpperCase(), margin, y);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text("Ordem de Serviço / Orçamento", margin + 100, y);
  
  y += 6;
  doc.setFontSize(8);
  const contactInfo = `Contato: ${settings.phone}${settings.cnpj ? ` | CNPJ: ${settings.cnpj}` : ''} | ${settings.address}`;
  doc.text(contactInfo, margin, y);

  y += 10;
  doc.setDrawColor(200);
  doc.line(margin, y, 190, y);
  y += 10;

  // Customer Info
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENTE:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(service.ownerName, margin + 25, y);
  
  doc.setFont("helvetica", "bold");
  doc.text("TEL:", margin + 110, y);
  doc.setFont("helvetica", "normal");
  doc.text(service.ownerPhone, margin + 125, y);
  
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("VEÍCULO:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${service.carModel} (${service.carYear})`, margin + 25, y);
  
  doc.setFont("helvetica", "bold");
  doc.text("PLACA:", margin + 110, y);
  doc.setFont("helvetica", "normal");
  doc.text(service.carPlate.toUpperCase(), margin + 125, y);

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("DATA/AGENDA:", margin, y);
  doc.setFont("helvetica", "normal");
  const agendamento = service.scheduledDate ? `${service.scheduledDate.split('-').reverse().join('/')} às ${service.scheduledTime || '--:--'}` : service.entryDate;
  doc.text(agendamento, margin + 35, y);

  doc.setFont("helvetica", "bold");
  doc.text("KM:", margin + 110, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${service.carMileage} km`, margin + 125, y);

  y += 12;
  
  // Description Block
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, 170, 30, 'F');
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("RELATO DO CLIENTE:", margin + 5, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const splitRelato = doc.splitTextToSize(service.description, 160);
  doc.text(splitRelato, margin + 5, y);
  
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("DIAGNÓSTICO TÉCNICO:", margin + 5, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const splitDiag = doc.splitTextToSize(service.diagnosis || "Em análise", 160);
  doc.text(splitDiag, margin + 5, y);
  
  y += 15;

  // Parts Table Header
  doc.setFillColor(188, 19, 254); // Neon Purple instead of 79...
  doc.rect(margin, y, 170, 8, 'F');
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.text("ITEM / DESCRIÇÃO", margin + 5, y + 5.5);
  doc.text("QTD", margin + 105, y + 5.5);
  doc.text("UNIT. (R$)", margin + 125, y + 5.5);
  doc.text("TOTAL (R$)", margin + 155, y + 5.5);
  
  y += 8;
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  // Render Parts
  if (service.parts && service.parts.length > 0) {
    service.parts.forEach((part) => {
      checkPageBreak(10);
      doc.text(part.name, margin + 5, y + 6);
      doc.text(part.quantity.toString(), margin + 105, y + 6);
      doc.text(part.unitPrice.toFixed(2), margin + 125, y + 6);
      doc.text((part.quantity * part.unitPrice).toFixed(2), margin + 155, y + 6);
      y += 8;
      doc.setDrawColor(240);
      doc.line(margin, y, margin + 170, y);
    });
  } else {
    y += 8;
    doc.text("Nenhuma peça registrada.", margin + 5, y);
    y += 4;
  }

  // Labor
  checkPageBreak(15);
  if (service.laborCost > 0) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.text(service.laborDescription || "MÃO DE OBRA / SERVIÇOS", margin + 5, y + 6);
    doc.text("-", margin + 105, y + 6);
    doc.text("-", margin + 125, y + 6);
    doc.text(Number(service.laborCost).toFixed(2), margin + 155, y + 6);
    y += 8;
    doc.line(margin, y, margin + 170, y);
  }

  // Summary and Payments
  y += 10;
  checkPageBreak(50);
  const total = db.calculateTotal(service);
  const balance = total - (service.amountPaid || 0);

  doc.setFillColor(245, 245, 245);
  doc.rect(margin + 100, y, 70, 32, 'F');
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL:`, margin + 105, y + 8);
  doc.text(`R$ ${total.toFixed(2)}`, margin + 145, y + 8);

  y += 8;
  doc.setFont("helvetica", "normal");
  doc.text(`VALOR PAGO:`, margin + 105, y + 8);
  doc.text(`R$ ${(service.amountPaid || 0).toFixed(2)}`, margin + 145, y + 8);

  y += 8;
  doc.setFont("helvetica", "bold");
  if (balance > 0) {
    doc.setTextColor(200, 0, 0); // Bold Red for debt
  }
  doc.text(`A PAGAR:`, margin + 105, y + 8);
  doc.text(`R$ ${balance.toFixed(2)}`, margin + 145, y + 8);
  
  y += 10;
  doc.setTextColor(0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text(`Forma de Pagamento: ${service.paymentMethod || 'Não definido'}`, margin + 105, y + 8);

  y += 20;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text(`Garantia: ${service.warrantyInfo}`, margin, y);

  // Signature
  if (service.clientSignature) {
    y += 15;
    checkPageBreak(40);
    doc.setFont("helvetica", "bold");
    doc.text("ASSINATURA DO CLIENTE (AUTORIZAÇÃO):", margin, y);
    y += 5;
    doc.addImage(service.clientSignature, 'PNG', margin, y, 60, 25);
    y += 28;
    doc.setFontSize(7);
    doc.text("Documento assinado digitalmente via Oficina+ Gestão.", margin, y);
  }

  doc.save(`OS-${service.carPlate.toUpperCase()}-${service.id.slice(0,4)}.pdf`);
};

const shareServiceWhatsApp = (service: ServiceRecord, settings: WorkshopSettings) => {
  const total = db.calculateTotal(service).toFixed(2);
  const balance = (db.calculateTotal(service) - (service.amountPaid || 0)).toFixed(2);
  let phone = service.ownerPhone.replace(/\D/g, '');
  if (phone.length >= 10 && phone.length <= 11) phone = `55${phone}`;
  
  const agendamento = service.scheduledDate ? `*Agendamento:* ${service.scheduledDate.split('-').reverse().join('/')} às ${service.scheduledTime || '--:--'}%0A` : '';
  const finance = balance !== "0.00" ? `*Valor Pago:* R$ ${service.amountPaid.toFixed(2)}%0A*RESTANTE A RECEBER:* R$ ${balance}%0A` : `*Pagamento:* Total de R$ ${total} Pago via ${service.paymentMethod}%0A`;

  const message = `Olá *${service.ownerName}*, aqui está o resumo do serviço do seu *${service.carModel}* (${service.carPlate.toUpperCase()}).%0A%0A*Status:* ${service.status}%0A${agendamento}*KM:* ${service.carMileage}%0A*Total:* R$ ${total}%0A${finance}%0AAtenciosamente,%0A*${settings.name}*%0AContato: ${settings.phone}`;
  
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
        logo={settings.logo}
        rightAction={
          <div className="flex items-center gap-2">
            <button onClick={onSettings} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Settings size={20} />
            </button>
            <ThemeToggle />
            <button onClick={onNew} className="bg-gradient-to-r from-neon-blue to-neon-purple text-white p-3 rounded-2xl shadow-neon-blue animate-pulse">
              <Plus size={24} />
            </button>
          </div>
        }
      />
      
      <div className="p-5 space-y-6">
        {settings.logo && (
          <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-[28px] shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 animate-enter">
            <div className="relative">
              <img src={settings.logo} alt="Logo" className="w-14 h-14 object-contain rounded-2xl shadow-neon-blue border border-neon-blue/20" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">{settings.name}</h2>
              <p className="text-[9px] font-bold text-neon-blue uppercase tracking-widest opacity-80">Oficina Digital Ativa</p>
            </div>
          </div>
        )}
        <div className="relative group animate-enter">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
             <Search className="text-neon-blue" size={20} />
          </div>
          <input 
            type="text" 
            placeholder="Buscar placa, nome..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 rounded-2xl border-none shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 focus:ring-2 focus:ring-neon-blue transition-all outline-none"
          />
        </div>

        <div className="grid gap-4">
          {filtered.length === 0 && (
            <div className="py-20 text-center space-y-4 animate-enter">
              <div className="w-20 h-20 bg-neon-blue/10 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto">
                 <Car size={32} className="text-neon-blue" />
              </div>
              <p className="text-slate-400 font-medium">Nenhum serviço encontrado.</p>
              <Button onClick={onNew} variant="outline" size="sm">Adicionar Primeiro</Button>
            </div>
          )}
          {filtered.map((service, index) => {
            const total = db.calculateTotal(service);
            const balance = total - (service.amountPaid || 0);
            return (
              <Card key={service.id} onClick={() => onSelect(service.id)} className="border-l-[6px] border-l-neon-blue animate-enter focus-within:shadow-neon-blue transition-all" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{service.carModel}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 inline-block px-2 py-0.5 rounded-md">{service.carPlate.toUpperCase()}</p>
                      {balance > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-red-600 px-2 py-0.5 rounded-md shadow-sm">
                          <AlertTriangle size={10} /> FALTA R$ {balance.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full ${STATUS_BADGE_STYLES[service.status]}`}>{service.status}</span>
                </div>
                
                <div className="flex justify-between items-end mt-4">
                  <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-full bg-neon-blue/10 dark:bg-slate-800 flex items-center justify-center text-neon-blue font-bold text-xs">{service.ownerName.charAt(0)}</div>
                     <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{service.ownerName.split(' ')[0]}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 font-medium">Total Geral</p>
                    <p className="text-lg font-extrabold text-neon-purple dark:text-neon-blue">R$ {total.toFixed(2)}</p>
                  </div>
                </div>
              </Card>
            );
          })}
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
    paymentMethod: 'Nenhum',
    amountPaid: 0,
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

  const removePart = (id: string) => {
    setFormData(prev => ({ ...prev, parts: prev.parts.filter(p => p.id !== id) }));
  };

  const total = db.calculateTotal(formData);
  const balance = total - (formData.amountPaid || 0);

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
            <h3 className="text-lg font-bold flex items-center gap-2"><DollarSign className="text-indigo-500" size={20}/> Orçamento e Pagamento</h3>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Input placeholder="Peça" value={tempPart.name} onChange={e => setTempPart({...tempPart, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Input type="number" placeholder="Qtd" value={tempPart.quantity} onChange={e => setTempPart({...tempPart, quantity: Number(e.target.value)})} />
                <Input type="number" placeholder="Unit. R$" value={tempPart.unitPrice} onChange={e => setTempPart({...tempPart, unitPrice: Number(e.target.value)})} />
              </div>
              <Button onClick={addPart} fullWidth className="mt-3" size="sm">Adicionar Peça</Button>
            </div>
            
            <div className="space-y-3">
              {formData.parts.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm shadow-sm">
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 dark:text-slate-100">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.quantity} x R$ {p.unitPrice.toFixed(2)}</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className="font-extrabold text-indigo-600">R$ {(p.quantity * p.unitPrice).toFixed(2)}</span>
                    <button onClick={() => removePart(p.id)} className="p-2 text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
            </div>

            <Input label="Mão de Obra (R$)" type="number" value={formData.laborCost} onChange={e => handleChange('laborCost', Number(e.target.value))} />
            
            <div className="space-y-4 pt-4 border-t dark:border-slate-800">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Banknote size={16} /> Fluxo de Pagamento
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <Input label="Valor Recebido (R$)" type="number" value={formData.amountPaid} onChange={e => handleChange('amountPaid', Number(e.target.value))} />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Forma</label>
                  <select 
                    value={formData.paymentMethod} 
                    onChange={e => handleChange('paymentMethod', e.target.value)}
                    className="px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-300 dark:focus:border-indigo-500/50 outline-none transition-all font-medium text-slate-800 dark:text-slate-100"
                  >
                    <option value="Nenhum">Nenhum</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="PIX">PIX</option>
                    <option value="Cartão">Cartão</option>
                    <option value="Misto">Misto</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-950 text-white p-5 rounded-3xl space-y-2 shadow-2xl border border-white/5">
                <div className="flex justify-between items-center text-xs opacity-60">
                  <span>TOTAL CALCULADO</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>VALOR PAGO</span>
                  <span className="text-emerald-400 font-bold">R$ {(formData.amountPaid || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/10">
                  <span className="font-bold">RESTANTE A RECEBER</span>
                  <span className={`text-2xl font-black ${balance > 0 ? 'text-red-500' : 'text-emerald-400'}`}>
                    R$ {balance.toFixed(2)}
                  </span>
                </div>
              </div>
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
}> = ({ service, settings, onBack, onEdit }) => {
  const total = db.calculateTotal(service);
  const balance = total - (service.amountPaid || 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <Header title={service.carModel} subtitle={service.carPlate.toUpperCase()} logo={settings.logo} onBack={onBack} rightAction={<Button variant="ghost" size="sm" onClick={onEdit}>Editar</Button>} />
      <div className="p-5 space-y-6 animate-enter">
        <div className={`p-6 rounded-3xl ${STATUS_COLORS[service.status]} flex flex-col items-center gap-2 shadow-sm`}>
          <h2 className="text-2xl font-extrabold">{service.status}</h2>
          <p className="text-sm opacity-80">{service.entryDate.split('-').reverse().join('/')}</p>
        </div>

        {service.scheduledDate && (
          <Card className="bg-indigo-50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800">
             <div className="flex items-center gap-3 text-indigo-700 dark:text-indigo-300">
                <Calendar size={20} />
                <div>
                  <p className="text-[10px] uppercase font-bold opacity-70">Agendamento para o Cliente</p>
                  <p className="font-bold">{service.scheduledDate.split('-').reverse().join('/')} às {service.scheduledTime || '--:--'}</p>
                </div>
             </div>
          </Card>
        )}

        {balance > 0 && (
          <div className="bg-red-50 border border-red-100 dark:bg-red-950/20 dark:border-red-900/50 p-4 rounded-3xl flex items-center gap-4 animate-pulse">
            <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white shrink-0">
               <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">Pagamento Pendente</p>
              <p className="text-lg font-black text-red-700 dark:text-red-300">FALTA RECEBER R$ {balance.toFixed(2)}</p>
            </div>
          </div>
        )}

        <Card className="space-y-4">
           <h3 className="font-bold flex items-center gap-2 text-indigo-600"><User size={18}/> Cliente e Veículo</h3>
           <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{service.ownerName}</p>
              <p className="text-xs text-slate-400">{service.ownerPhone}</p>
              <p className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded inline-block mt-1">{service.carMileage} km rodados</p>
           </div>
        </Card>
        
        <Card className="space-y-4">
           <h3 className="font-bold flex items-center gap-2 text-indigo-600"><Wrench size={18}/> Diagnóstico</h3>
           <div>
             <p className="text-xs font-bold text-slate-400 uppercase mb-1">O QUE FOI RELATADO:</p>
             <p className="text-sm text-slate-700 dark:text-slate-300">{service.description}</p>
           </div>
           {service.diagnosis && (
             <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
               <p className="text-xs font-bold text-slate-400 uppercase mb-1">CONSTATADO PELA OFICINA:</p>
               <p className="text-sm italic text-indigo-600 dark:text-indigo-400 font-medium">{service.diagnosis}</p>
             </div>
           )}
        </Card>

        <div className="space-y-2">
          <h3 className="font-bold text-slate-400 text-xs uppercase px-1">Resumo Financeiro</h3>
          <Card className="divide-y divide-slate-100 dark:divide-slate-800 p-0 overflow-hidden shadow-xl border-2 border-slate-900/5">
            {service.parts.map(p => (
               <div key={p.id} className="flex justify-between items-center p-4">
                 <span className="text-sm text-slate-600 dark:text-slate-400">{p.quantity}x {p.name}</span>
                 <span className="text-sm font-bold">R$ {(p.quantity * p.unitPrice).toFixed(2)}</span>
               </div>
            ))}
            {service.laborCost > 0 && (
               <div className="flex justify-between items-center p-4 bg-slate-50/50 dark:bg-slate-800/20">
                 <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Mão de Obra</span>
                 <span className="text-sm font-bold">R$ {Number(service.laborCost).toFixed(2)}</span>
               </div>
            )}
            
            <div className="p-5 bg-slate-950 text-white space-y-3">
              <div className="flex justify-between items-center text-xs opacity-50">
                <span>Total Bruto</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs opacity-50">
                <span>Total Recebido ({service.paymentMethod})</span>
                <span className="text-emerald-400 font-medium">R$ {(service.amountPaid || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-white/10">
                <span className="font-bold text-sm">RESTANTE A RECEBER</span>
                <span className={`text-2xl font-black ${balance > 0 ? 'text-red-500' : 'text-emerald-400'}`}>
                  R$ {balance.toFixed(2)}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {service.clientSignature && (
          <div className="space-y-2">
            <h3 className="font-bold text-slate-400 text-xs uppercase px-1">Autorização Digital</h3>
            <Card className="flex items-center justify-center p-2 bg-white border-2 border-dashed">
              <img src={service.clientSignature} className="w-full h-auto max-h-32 object-contain" />
            </Card>
          </div>
        )}
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-slate-900/90 border-t flex gap-3 shadow-2xl">
        <Button onClick={() => shareServiceWhatsApp(service, settings)} className="flex-1 bg-[#25D366] text-white border-none"><MessageCircle size={20}/> WhatsApp</Button>
        <Button onClick={() => generateServicePDF(service, settings)} className="flex-1 bg-indigo-600 text-white border-none"><FileDown size={20} /> Orçamento PDF</Button>
      </div>
    </div>
  );
};

const SettingsPanel: React.FC<{
  settings: WorkshopSettings;
  onSave: (settings: WorkshopSettings) => void;
  onBack: () => void;
}> = ({ settings, onSave, onBack }) => {
  const [localSettings, setLocalSettings] = useState<WorkshopSettings>(settings);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalSettings(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <Header title="Configurações" onBack={onBack} logo={settings.logo} />
      <div className="p-5 space-y-6 animate-enter">
         <Card className="space-y-4">
           <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl gap-3">
             <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Logo da Oficina</label>
             {localSettings.logo ? (
               <div className="relative group">
                 <img src={localSettings.logo} className="w-32 h-32 object-contain rounded-xl" alt="Logo" />
                 <button 
                   onClick={() => setLocalSettings(prev => ({ ...prev, logo: undefined }))}
                   className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"
                 >
                   <X size={16} />
                 </button>
               </div>
             ) : (
               <div className="flex flex-col items-center gap-2">
                 <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
                   <ImageIcon size={32} />
                 </div>
                 <label className="cursor-pointer">
                   <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-xl flex items-center gap-2">
                     <Upload size={16} /> Subir Logo
                   </span>
                   <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                 </label>
               </div>
             )}
           </div>
           
           <Input label="Nome da Oficina" value={localSettings.name} onChange={e => setLocalSettings({...localSettings, name: e.target.value})} />
           <Input label="CNPJ" value={localSettings.cnpj || ''} onChange={e => setLocalSettings({...localSettings, cnpj: e.target.value})} />
           <Input label="Telefone de Contato" value={localSettings.phone} onChange={e => setLocalSettings({...localSettings, phone: e.target.value})} />
           <Input label="Endereço Completo" value={localSettings.address} onChange={e => setLocalSettings({...localSettings, address: e.target.value})} />
         </Card>
         <Button fullWidth onClick={() => onSave(localSettings)}>Salvar Alterações</Button>
         <p className="text-center text-xs text-slate-400 px-10 leading-relaxed italic">Essas informações aparecerão no cabeçalho de todos os orçamentos em PDF gerados.</p>
      </div>
    </div>
  );
};

// --- Agenda View ---

const AgendaView: React.FC<{
  services: ServiceRecord[];
  settings: WorkshopSettings;
  onSelect: (id: string) => void;
  onNew: () => void;
}> = ({ services, settings, onSelect, onNew }) => {
  const [search, setSearch] = useState('');
  
  // Sort and group by date
  const sortedServices = [...services].sort((a, b) => {
    const dateA = a.scheduledDate || a.entryDate;
    const dateB = b.scheduledDate || b.entryDate;
    return dateB.localeCompare(dateA); // Newest first
  });

  const filtered = sortedServices.filter(s => 
    s.carPlate.toLowerCase().includes(search.toLowerCase()) ||
    s.ownerName.toLowerCase().includes(search.toLowerCase()) ||
    s.carModel.toLowerCase().includes(search.toLowerCase())
  );

  const grouped: { [key: string]: ServiceRecord[] } = {};
  filtered.forEach(s => {
    const date = s.scheduledDate || s.entryDate;
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(s);
  });

  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 transition-colors">
      <Header 
        title="Agenda" 
        subtitle="Cronograma de Serviços"
        logo={settings.logo}
        rightAction={<ThemeToggle />}
      />
      
      <div className="p-5 space-y-6">
        <div className="relative group animate-enter">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
             <Search className="text-neon-blue" size={20} />
          </div>
          <input 
            type="text" 
            placeholder="Buscar na agenda..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 rounded-2xl border-none shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 focus:ring-2 focus:ring-neon-blue transition-all outline-none"
          />
        </div>

        <div className="space-y-8">
          {dates.length === 0 && (
            <div className="py-20 text-center space-y-4 animate-enter">
              <div className="w-20 h-20 bg-neon-blue/10 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto">
                 <Calendar size={32} className="text-neon-blue" />
              </div>
              <p className="text-slate-400 font-medium">Nenhum compromisso encontrado.</p>
              <Button onClick={onNew} variant="outline" size="sm">Agendar Serviço</Button>
            </div>
          )}

          {dates.map((date, dateIdx) => (
            <div key={date} className="animate-enter" style={{ animationDelay: `${dateIdx * 100}ms` }}>
              <div className="flex items-center gap-2 mb-4 sticky top-20 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm py-2 z-10">
                <span className="w-2 h-2 rounded-full bg-neon-purple shadow-neon-purple animate-pulse"></span>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest text-xs">
                  {date.split('-').reverse().join('/')}
                </h3>
              </div>

              <div className="space-y-3">
                {grouped[date].map((service) => (
                  <Card key={service.id} onClick={() => onSelect(service.id)} className="p-4 relative overflow-hidden group">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-neon-purple group-hover:text-white transition-all shadow-sm group-hover:shadow-neon-purple">
                          {service.scheduledTime ? <Clock size={20} /> : <Wrench size={20} />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{service.carModel}</p>
                          <p className="text-xs text-slate-400 font-medium italic">{service.ownerName} • {service.carPlate.toUpperCase()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {service.scheduledTime && (
                           <p className="text-neon-purple dark:text-neon-blue font-black text-sm mb-1">{service.scheduledTime}</p>
                        )}
                        <span className={`text-[9px] font-bold px-2 py-1 rounded-md ${STATUS_BADGE_STYLES[service.status]}`}>{service.status}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- CRM / Kanban View ---

const CRMView: React.FC<{
  settings: WorkshopSettings;
  onBack: () => void;
}> = ({ settings, onBack }) => {
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<CRMLead | null>(null);
  const [formData, setFormData] = useState<Partial<CRMLead>>({
    name: '', phone: '', vehicle: '', interest: '', status: LeadStatus.NEW, notes: ''
  });

  const loadLeads = async () => {
    const data = await db.getLeads();
    setLeads(data);
  };

  useEffect(() => { loadLeads(); }, []);

  const handleSaveLead = async () => {
    if (!formData.name || !formData.phone) return;
    const lead: CRMLead = (editingLead ? { ...editingLead, ...formData } : {
      id: db.generateId(),
      name: formData.name,
      phone: formData.phone,
      vehicle: formData.vehicle || '',
      interest: formData.interest || '',
      status: formData.status || LeadStatus.NEW,
      notes: formData.notes || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }) as CRMLead;

    await db.saveLead(lead);
    setShowForm(false);
    setEditingLead(null);
    setFormData({ name: '', phone: '', vehicle: '', interest: '', status: LeadStatus.NEW, notes: '' });
    loadLeads();
  };

  const handleDeleteLead = async (id: string) => {
    if (confirm('Deseja excluir este lead?')) {
      await db.deleteLead(id);
      loadLeads();
    }
  };

  const moveLead = async (lead: CRMLead, newStatus: LeadStatus) => {
    await db.saveLead({ ...lead, status: newStatus, updatedAt: Date.now() });
    loadLeads();
  };

  const columns = [
    { status: LeadStatus.NEW, label: 'Novo', color: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10' },
    { status: LeadStatus.NEGOTIATING, label: 'Negócio', color: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/10' },
    { status: LeadStatus.FOLLOW_UP, label: 'Retorno', color: 'bg-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/10' },
    { status: LeadStatus.CONVERTED, label: 'Fechado', color: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/10' },
    { status: LeadStatus.LOST, label: 'Perdido', color: 'bg-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/10' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 transition-colors overflow-hidden flex flex-col">
      <Header 
        title="CRM Kanban" 
        subtitle="Gestão de Leads"
        logo={settings.logo}
        onBack={onBack}
        rightAction={
          <button 
            onClick={() => { setEditingLead(null); setFormData({ name: '', phone: '', vehicle: '', interest: '', status: LeadStatus.NEW, notes: '' }); setShowForm(true); }}
            className="bg-neon-blue text-white p-2.5 rounded-xl shadow-neon-blue"
          >
            <Plus size={20} />
          </button>
        }
      />

      <div className="flex-1 overflow-x-auto p-4 flex gap-4 snap-x">
        {columns.map((col) => (
          <div key={col.status} className={`w-72 shrink-0 flex flex-col gap-4 snap-center`}>
            <div className="flex items-center justify-between px-2">
               <div className="flex items-center gap-2">
                 <span className={`w-3 h-3 rounded-full ${col.color}`}></span>
                 <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-xs">{col.label}</h3>
               </div>
               <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500">
                 {leads.filter(l => l.status === col.status).length}
               </span>
            </div>
            
            <div className={`flex-1 rounded-3xl p-3 space-y-3 min-h-[50vh] ${col.bg} border-2 border-dashed border-white dark:border-slate-900`}>
              {leads.filter(l => l.status === col.status).map((lead) => (
                <Card 
                  key={lead.id} 
                  className="p-4 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer border-none bg-white dark:bg-slate-900"
                  onClick={() => { setEditingLead(lead); setFormData(lead); setShowForm(true); }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-slate-900 dark:text-slate-100">{lead.name}</p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead.id); }}
                      className="text-slate-300 hover:text-red-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                      <MessageCircle size={10} /> {lead.phone}
                    </p>
                    {lead.vehicle && (
                      <p className="text-[10px] text-neon-blue font-bold uppercase flex items-center gap-1">
                        <Car size={10} /> {lead.vehicle}
                      </p>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800 flex justify-between gap-1 overflow-x-auto no-scrollbar">
                    {columns.filter(c => c.status !== lead.status).map(c => (
                      <button 
                        key={c.status}
                        onClick={(e) => { e.stopPropagation(); moveLead(lead, c.status); }}
                        className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${c.color} text-white opacity-40 hover:opacity-100 transition-opacity whitespace-nowrap`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-enter border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 italic">{editingLead ? 'Editar Lead' : 'Novo Lead'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 border border-slate-100 dark:border-slate-800 rounded-full"><X size={20}/></button>
            </div>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar py-2">
              <Input label="Nome do Cliente" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <Input label="Telefone / WhatsApp" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              <Input label="Veículo de Interesse" value={formData.vehicle} onChange={e => setFormData({...formData, vehicle: e.target.value})} />
              <TextArea label="Anotações / Interesse" value={formData.interest} onChange={e => setFormData({...formData, interest: e.target.value})} />
              
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Estágio no Funil</label>
                <div className="flex flex-wrap gap-2">
                   {columns.map(c => (
                     <button 
                      key={c.status}
                      onClick={() => setFormData({...formData, status: c.status})}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-full border-2 transition-all ${formData.status === c.status ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 border-transparent'}`}
                     >
                       {c.label}
                     </button>
                   ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancelar</Button>
              <Button variant="success" onClick={handleSaveLead} className="flex-[2]">Salvar Lead</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Clients View ---

const ClientsView: React.FC<{
  services: ServiceRecord[];
  settings: WorkshopSettings;
  onSelectService: (id: string) => void;
}> = ({ services, settings, onSelectService }) => {
  const [search, setSearch] = useState('');
  
  // Extract unique clients
  const clientsMap = new Map<string, { 
    name: string, 
    phone: string, 
    services: ServiceRecord[],
    lastVisit: string
  }>();

  services.forEach(s => {
    const key = `${s.ownerName}-${s.ownerPhone}`.toLowerCase();
    if (!clientsMap.has(key)) {
      clientsMap.set(key, { 
        name: s.ownerName, 
        phone: s.ownerPhone, 
        services: [],
        lastVisit: s.entryDate
      });
    }
    const client = clientsMap.get(key)!;
    client.services.push(s);
    if (s.entryDate > client.lastVisit) client.lastVisit = s.entryDate;
  });

  const clients = Array.from(clientsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  
  const filtered = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 transition-colors">
      <Header 
        title="Clientes" 
        subtitle="Base de Dados de Clientes"
        logo={settings.logo}
        rightAction={<ThemeToggle />}
      />
      
      <div className="p-5 space-y-6">
        <div className="relative group animate-enter">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
             <Search className="text-neon-blue" size={20} />
          </div>
          <input 
            type="text" 
            placeholder="Buscar por nome ou telefone..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 rounded-2xl border-none shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 focus:ring-2 focus:ring-neon-blue transition-all outline-none"
          />
        </div>

        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="py-20 text-center opacity-40">
              <Contact size={48} className="mx-auto mb-4" />
              <p className="font-bold">Nenhum cliente cadastrado ainda.</p>
            </div>
          ) : (
            filtered.map((client, idx) => (
              <Card key={idx} className="p-5 animate-enter" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-neon-blue/10 dark:bg-neon-blue/20 flex items-center justify-center text-neon-blue">
                      <User size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{client.name}</h3>
                      <p className="text-sm font-medium text-slate-400 flex items-center gap-1">
                        <MessageCircle size={14} /> {client.phone}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black bg-neon-purple/10 dark:bg-neon-purple/40 text-neon-purple dark:text-neon-blue px-2 py-1 rounded-full uppercase">
                      {client.services.length} {client.services.length === 1 ? 'Serviço' : 'Serviços'}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">Último: {client.lastVisit.split('-').reverse().join('/')}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-50 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Veículos vinculados:</p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(client.services.map(s => `${s.carModel} (${s.carPlate.toUpperCase()})`))).map((v, i) => (
                      <span key={i} className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <Car size={12} /> {v}
                      </span>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => {
                    onSelectService(client.services[client.services.length - 1].id);
                  }}
                  className="w-full mt-4 py-2 text-xs font-bold text-neon-blue dark:text-neon-blue hover:bg-neon-blue/10 rounded-xl transition-all"
                >
                  Ver Último Serviço
                </button>
              </Card>
            ))
          )}
        </div>
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


// ── HermesView — Chat com IA ──────────────────────────────────────────────────
const HermesView: React.FC<{ settings: WorkshopSettings; onBack: () => void }> = ({ settings, onBack }) => {
  const [messages, setMessages] = React.useState<HermesMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: HermesMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const { reply } = await hermesChat(text, [...messages, userMsg]);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      const msg = e?.response?.status === 429 || e?.message?.includes('429')
        ? '🚫 Limite de mensagens do seu plano atingido este mês. Contate o administrador.'
        : `Erro: ${e.message}`;
      setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-950">
      <Header title="Assistente IA" subtitle={settings.name} logo={settings.logo} onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center pt-10 px-4">
            <div className="w-20 h-20 rounded-3xl bg-blue-500/10 flex items-center justify-center mb-4">
              <Bot size={40} className="text-blue-500" />
            </div>
            <p className="font-bold text-lg text-slate-700 dark:text-slate-200">Olá! Sou o assistente da</p>
            <p className="font-black text-xl text-blue-500 mb-1">{settings.name}</p>
            <p className="text-sm text-slate-400 mb-6">Posso te ajudar com agendamentos, clientes, lembretes e muito mais.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['📅 Agendar serviço', '👤 Buscar cliente', '📋 Tarefas do dia', '❓ Tirar dúvida'].map(chip => (
                <button key={chip} onClick={() => setInput(chip.slice(3))}
                  className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700">
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
              m.role === 'user'
                ? 'bg-blue-500 text-white rounded-br-none'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-none px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-3 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex gap-2">
        <input
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white"
          placeholder="Digite sua mensagem..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          disabled={loading}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-xl px-4 py-2.5 transition-all"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};


// ── AdminView: Gerenciar módulos por tenant (apenas super_admin) ──────────────
const MODULE_LABELS: Record<string, string> = {
  crm: 'CRM', agenda: 'Agenda', kanban: 'Kanban', whatsapp: 'WhatsApp',
  followup: 'Follow-up', hermes: 'Hermes IA', instagram: 'Instagram', youtube: 'YouTube',
};

interface TenantWithModules {
  id: number; name: string; slug: string; active: boolean;
  modules: ModulesMap;
}

const AdminView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [tenants, setTenants] = useState<TenantWithModules[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [hermesUsage, setHermesUsage] = useState<Record<number, any>>({});

  const loadHermesUsage = async (tenantId: number) => {
    try {
      const u = await adminGetHermesUsage(tenantId);
      setHermesUsage(prev => ({ ...prev, [tenantId]: u }));
    } catch {}
  };

  const changePlan = async (tenantId: number, plan: string) => {
    setSaving(`plan-${tenantId}`);
    try {
      const u = await adminSetHermesPlan(tenantId, plan);
      setHermesUsage(prev => ({ ...prev, [tenantId]: u }));
      setMsg(`✅ Plano alterado para ${u.plan_label}`);
      setTimeout(() => setMsg(null), 3000);
    } catch { setMsg('Erro ao alterar plano.'); }
    finally { setSaving(null); }
  };

  const resetUsage = async (tenantId: number) => {
    setSaving(`reset-${tenantId}`);
    try {
      const u = await adminResetHermesUsage(tenantId);
      setHermesUsage(prev => ({ ...prev, [tenantId]: u }));
      setMsg('🔄 Contador zerado!');
      setTimeout(() => setMsg(null), 3000);
    } catch { setMsg('Erro ao zerar contador.'); }
    finally { setSaving(null); }
  };

  useEffect(() => {
    adminListTenants()
      .then(data => {
        const ts = (data as TenantWithModules[]).filter(t => t.id !== 0);
        setTenants(ts);
        ts.forEach(t => loadHermesUsage(t.id));
      })
      .catch(() => setMsg('Erro ao carregar tenants.'))
      .finally(() => setLoading(false));
  }, []);

  const toggleActive = async (tenant: TenantWithModules) => {
    const newActive = !tenant.active;
    setSaving(`active-${tenant.id}`);
    try {
      await adminUpdateTenant(tenant.id, { active: newActive });
      setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, active: newActive } : t));
      setMsg(newActive ? `✅ ${tenant.name} reativado.` : `🔒 ${tenant.name} bloqueado.`);
      setTimeout(() => setMsg(null), 3000);
    } catch {
      setMsg('Erro ao alterar status do cliente.');
    } finally {
      setSaving(null);
    }
  };

  const toggle = async (tenantId: number, mod: string, cur: boolean) => {
    const key = `${tenantId}-${mod}`;
    setSaving(key);
    try {
      const updated = await adminToggleModule(tenantId, mod, !cur);
      setTenants(prev => prev.map(t =>
        t.id === tenantId ? { ...t, modules: updated as ModulesMap } : t
      ));
      setMsg(`${MODULE_LABELS[mod] || mod} ${!cur ? 'ativado' : 'desativado'} para tenant.`);
      setTimeout(() => setMsg(null), 3000);
    } catch {
      setMsg('Erro ao atualizar módulo.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-8">
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <Shield size={20} className="text-indigo-500" />
        <div>
          <h1 className="font-bold text-slate-800 dark:text-white text-base">Admin Master</h1>
          <p className="text-xs text-slate-500">Módulos por cliente</p>
        </div>
      </div>

      {msg && (
        <div className="mx-4 mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-xl text-indigo-700 dark:text-indigo-300 text-sm">
          {msg}
        </div>
      )}

      <div className="px-4 mt-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">Nenhum cliente cadastrado ainda.</div>
        ) : (
          tenants.map(tenant => (
            <div key={tenant.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white text-sm">{tenant.name}</p>
                  <p className="text-xs text-slate-500">{tenant.slug}</p>
                </div>
                <button
                  onClick={() => toggleActive(tenant)}
                  disabled={!!saving}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-semibold transition-all border ${
                    tenant.active
                      ? 'bg-green-100 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800'
                      : 'bg-red-100 text-red-700 border-red-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200'
                  }`}
                  title={tenant.active ? 'Clique para bloquear' : 'Clique para reativar'}
                >
                  {saving === `active-${tenant.id}` ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : tenant.active ? (
                    <>{'🟢'} ativo</>
                  ) : (
                    <>{'🔴'} bloqueado</>
                  )}
                </button>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {Object.keys(MODULE_LABELS).map(mod => {
                  const enabled = tenant.modules?.[mod as keyof ModulesMap] ?? false;
                  const key = `${tenant.id}-${mod}`;
                  const isSaving = saving === key;
                  return (
                    <div key={mod} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{MODULE_LABELS[mod]}</span>
                      <button
                        onClick={() => toggle(tenant.id, mod, enabled)}
                        disabled={!!saving}
                        className="transition-all"
                      >
                        {isSaving ? (
                          <Loader2 size={22} className="animate-spin text-slate-400" />
                        ) : enabled ? (
                          <ToggleRight size={28} className="text-indigo-500" />
                        ) : (
                          <ToggleLeft size={28} className="text-slate-300 dark:text-slate-600" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
              {/* Hermes IA — plano e consumo */}
              {hermesUsage[tenant.id] && (
                <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Hermes IA — Consumo</p>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {hermesUsage[tenant.id].messages_used} / {hermesUsage[tenant.id].messages_limit} msgs
                    </span>
                    <span className="text-xs font-bold text-indigo-500">{hermesUsage[tenant.id].percent}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-3">
                    <div
                      className={`h-2 rounded-full transition-all ${hermesUsage[tenant.id].percent >= 90 ? 'bg-red-500' : hermesUsage[tenant.id].percent >= 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                      style={{ width: `${hermesUsage[tenant.id].percent}%` }}
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <select
                      value={hermesUsage[tenant.id].plan}
                      onChange={e => changePlan(tenant.id, e.target.value)}
                      disabled={!!saving}
                      className="flex-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-1.5"
                    >
                      <option value="teste">🧪 Teste — 100 msgs</option>
                      <option value="basico">📦 Básico — 1.000 msgs</option>
                      <option value="pro">🚀 Pro — 5.000 msgs</option>
                      <option value="ilimitado">♾️ Ilimitado</option>
                    </select>
                    <button
                      onClick={() => resetUsage(tenant.id)}
                      disabled={!!saving}
                      className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-600 border border-slate-200 dark:border-slate-700 px-2 py-1.5 rounded-lg transition-all"
                      title="Zerar contador"
                    >
                      {saving === `reset-${tenant.id}` ? '...' : '🔄 Zerar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const App: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settings, setSettings] = useState<WorkshopSettings | null>(null);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modules, setModules] = useState<ModulesMap | null>(null);
  const [me, setMe] = useState<UserOut | null>(null);
  const [suspended, setSuspended] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        const [s, mods, currentUser] = await Promise.all([
          db.getSettings(),
          getMyModules().catch((e: any) => { if (e?.status === 402 || e?.message?.includes('402')) throw Object.assign(new Error('suspended'), {status:402}); return null; }),
          getMe().catch(() => null)
        ]);
        if (currentUser) setMe(currentUser);
        setSettings(s);
        if (mods) setModules(mods);
        try {
          const sv = await db.getServices();
          setServices(sv);
        } catch (svcErr) {
          console.warn("Erro ao carregar serviços:", svcErr);
          setServices([]);
        }
      } catch (err: any) {
        if (err?.status === 402) { setSuspended(true); setIsLoading(false); return; }
        console.error("Erro na inicialização:", err);
      } finally {
        setIsLoading(false);
      }
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

  if (suspended) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-8 text-center">
        <div className="w-24 h-24 bg-red-500/20 rounded-3xl flex items-center justify-center mb-6">
          <span className="text-5xl">🔒</span>
        </div>
        <h1 className="text-2xl font-black mb-2">Acesso Suspenso</h1>
        <p className="text-slate-400 mb-6 max-w-xs">
          Sua assinatura está suspensa. Entre em contato com o administrador para regularizar o acesso.
        </p>
        <a
          href={`https://wa.me/${SUPORTE_WHATSAPP}?text=Ol%C3%A1!%20Preciso%20regularizar%20minha%20assinatura.`}
          className="bg-[#25D366] text-white font-bold px-6 py-3 rounded-2xl flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <MessageCircle size={20} /> Falar no WhatsApp
        </a>
        <button
          onClick={() => { setSuspended(false); setIsLoading(true); }}
          className="mt-4 text-slate-500 text-sm underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mb-6 shadow-2xl backdrop-blur-md">
           <Wrench size={48} className="animate-bounce" />
        </div>
        <h1 className="text-3xl font-extrabold mb-2 tracking-tight">Oficina+</h1>
        <p className="opacity-80 font-medium">Iniciando seu sistema de gestão...</p>
        <Loader2 className="mt-8 animate-spin opacity-40" size={32} />
      </div>
    );
  }

  if (!settings) return <div className="p-10 text-center">Erro crítico: Não foi possível carregar as configurações.</div>;

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
      {view === 'AGENDA' && (
        <AgendaView 
          services={services}
          settings={settings}
          onNew={() => { setSelectedId(null); setView('CREATE_EDIT'); }}
          onSelect={(id) => { setSelectedId(id); setView('DETAILS'); }}
        />
      )}
      {view === 'CRM' && (
        <CRMView 
          settings={settings}
          onBack={() => setView('DASHBOARD')}
        />
      )}
      {view === 'CLIENTS' && (
        <ClientsView 
          services={services}
          settings={settings}
          onSelectService={(id) => { setSelectedId(id); setView('DETAILS'); }}
        />
      )}

      {view === 'ADMIN' && (
        <AdminView onBack={() => setView('DASHBOARD')} />
      )}

      {view === 'HERMES' && settings && (
        <HermesView
          settings={settings}
          onBack={() => setView('DASHBOARD')}
        />
      )}

      {/* Bottom Navigation */}
      {(view === 'DASHBOARD' || view === 'AGENDA' || view === 'CRM' || view === 'CLIENTS' || view === 'ADMIN') && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 flex justify-around bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 z-50">
          <button 
            onClick={() => setView('DASHBOARD')}
            className={`flex flex-col items-center gap-1 transition-all ${view === 'DASHBOARD' ? 'text-neon-blue scale-110' : 'text-slate-400 opacity-60'}`}
          >
            <Wrench size={22} className={view === 'DASHBOARD' ? 'fill-neon-blue/10' : ''} />
            <span className="text-[10px] font-bold">Serviços</span>
          </button>
          
          <button 
            onClick={() => setView('AGENDA')}
            className={`flex flex-col items-center gap-1 transition-all ${view === 'AGENDA' ? 'text-neon-blue scale-110' : 'text-slate-400 opacity-60'}`}
          >
            <Calendar size={22} className={view === 'AGENDA' ? 'fill-neon-blue/10' : ''} />
            <span className="text-[10px] font-bold">Agenda</span>
          </button>

          <button 
            onClick={() => setView('CRM')}
            className={`flex flex-col items-center gap-1 transition-all ${view === 'CRM' ? 'text-neon-blue scale-110' : 'text-slate-400 opacity-60'}`}
          >
            <div className="relative">
              <Users size={22} className={view === 'CRM' ? 'fill-neon-blue/10' : ''} />
            </div>
            <span className="text-[10px] font-bold">CRM</span>
          </button>

          <button 
            onClick={() => setView('CLIENTS')}
            className={`flex flex-col items-center gap-1 transition-all ${view === 'CLIENTS' ? 'text-neon-blue scale-110' : 'text-slate-400 opacity-60'}`}
          >
            <Contact size={22} className={view === 'CLIENTS' ? 'fill-neon-blue/10' : ''} />
            <span className="text-[10px] font-bold">Clientes</span>
          </button>
          

          {modules?.hermes && (
            <button 
              onClick={() => setView('HERMES')}
              className={`flex flex-col items-center gap-1 transition-all ${view === 'HERMES' ? 'text-neon-blue scale-110' : 'text-slate-400 opacity-60'}`}
            >
              <Bot size={22} className={view === 'HERMES' ? 'fill-neon-blue/10' : ''} />
              <span className="text-[10px] font-bold">Hermes</span>
            </button>
          )}
          {me?.role === 'super_admin' && (
            <button
              onClick={() => setView('ADMIN')}
              className={`flex flex-col items-center gap-1 transition-all ${view === 'ADMIN' ? 'text-indigo-500 scale-110' : 'text-slate-400 opacity-60 hover:opacity-100'}`}
            >
              <Shield size={22} />
              <span className="text-[10px] font-bold">Admin</span>
            </button>
          )}
          <button 
            onClick={() => setView('SETTINGS')}
            className={`flex flex-col items-center gap-1 text-slate-400 opacity-60 hover:opacity-100 transition-all`}
          >
            <Settings size={22} />
            <span className="text-[10px] font-bold">Ajustes</span>
          </button>

          {onLogout && (
            <button
              onClick={() => { if (confirm('Sair da conta?')) onLogout(); }}
              className="flex flex-col items-center gap-1 text-slate-400 opacity-60 hover:opacity-100 hover:text-red-400 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              <span className="text-[10px] font-bold">Sair</span>
            </button>
          )}
        </div>
      )}
    </div>

  );
};

export default App;
