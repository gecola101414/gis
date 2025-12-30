
import React, { useState, useMemo, useRef } from 'react';
import { WorkOrder, WorkStatus, FundingIDV } from '../types';
import { VoiceInput } from './VoiceInput';

interface WorkFormProps {
  idvs: FundingIDV[];
  orders: WorkOrder[];
  existingChapters: string[];
  onSubmit: (order: Partial<WorkOrder>) => void;
  onCancel: () => void;
  initialData?: WorkOrder;
  prefilledChapter?: string;
}

export const calculateAllResiduals = (idvs: FundingIDV[], orders: WorkOrder[], excludeOrderId?: string) => {
  const currentResiduals: Record<string, number> = {};
  idvs.forEach(idv => { currentResiduals[idv.id] = idv.amount; });

  const sortedOrders = [...orders]
    .filter(o => o.id !== excludeOrderId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  sortedOrders.forEach(order => {
    let costToCover = 0;
    if (order.status === WorkStatus.PAGAMENTO) costToCover = order.paidValue || 0;
    else if (order.status === WorkStatus.AFFIDAMENTO) costToCover = order.contractValue || 0;
    else costToCover = order.estimatedValue;

    (order.linkedIdvIds || []).forEach(idvId => {
      const available = currentResiduals[idvId] || 0;
      const taken = Math.min(costToCover, available);
      currentResiduals[idvId] -= taken;
      costToCover -= taken;
    });
  });

  return currentResiduals;
};

const WorkForm: React.FC<WorkFormProps> = ({ idvs = [], orders = [], existingChapters = [], onSubmit, onCancel, initialData, prefilledChapter }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedChapter, setSelectedChapter] = useState<string>(
    prefilledChapter || (initialData ? (idvs.find(i => initialData.linkedIdvIds?.includes(i.id))?.capitolo || '') : '')
  );
  
  const [formData, setFormData] = useState<Partial<WorkOrder>>(
    initialData || {
      description: '',
      estimatedValue: undefined,
      linkedIdvIds: [],
      status: WorkStatus.PROGETTO
    }
  );

  const idvResiduals = useMemo(() => calculateAllResiduals(idvs, orders, initialData?.id), [idvs, orders, initialData]);

  const filteredIdvs = useMemo(() => {
    return idvs.filter(i => i.capitolo === selectedChapter);
  }, [idvs, selectedChapter]);

  const chapterResidual = useMemo(() => {
    if (!selectedChapter) return 0;
    return idvs
      .filter(i => i.capitolo === selectedChapter)
      .reduce((sum, i) => sum + (idvResiduals[i.id] || 0), 0);
  }, [idvs, selectedChapter, idvResiduals]);

  const coverageAnalysis = useMemo(() => {
    let remainingCost = formData.estimatedValue || 0;
    const plan: { idvId: string, used: number, leftover: number, wasDepleted: boolean }[] = [];
    
    (formData.linkedIdvIds || []).forEach(id => {
      const available = idvResiduals[id] || 0;
      const taken = Math.min(remainingCost, available);
      remainingCost -= taken;
      plan.push({
        idvId: id,
        used: taken,
        leftover: available - taken,
        wasDepleted: (available - taken) === 0 && taken > 0
      });
    });

    return { plan, uncovered: remainingCost };
  }, [formData.estimatedValue, formData.linkedIdvIds, idvResiduals]);

  const toggleIdv = (id: string) => {
    const current = formData.linkedIdvIds || [];
    if (current.includes(id)) {
      setFormData({ ...formData, linkedIdvIds: current.filter(i => i !== id) });
    } else {
      setFormData({ ...formData, linkedIdvIds: [...current, id] });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData({ ...formData, projectPdf: { name: file.name, data: event.target?.result as string } });
    };
    reader.readAsDataURL(file);
  };

  const estimatedCost = formData.estimatedValue || 0;
  const newExpectedResidual = chapterResidual - estimatedCost;
  const isOutOfBudget = newExpectedResidual < 0;

  return (
    <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-4xl mx-auto">
      <div className="mb-8 border-b border-slate-50 pb-6">
        <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Fase Progetto (Stima)</h2>
        <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">In questa sezione gestisci solo i dati tecnici e la copertura finanziaria iniziale</p>
      </div>
      
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">1. Capitolo di Riferimento</label>
            <select 
              value={selectedChapter}
              onChange={(e) => { setSelectedChapter(e.target.value); setFormData({ ...formData, linkedIdvIds: [] }); }}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold"
            >
              <option value="">Scegli capitolo...</option>
              {existingChapters.map(c => <option key={c} value={c}>Capitolo {c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">2. Valore Stimato (€)</label>
            <VoiceInput
              type="number"
              value={formData.estimatedValue || ''}
              onChange={(v) => setFormData({ ...formData, estimatedValue: Number(v) })}
              placeholder="es. 15000"
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-black text-indigo-600 text-lg"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Disponibilità Reale</label>
            <div className={`w-full px-5 py-4 border-2 rounded-2xl flex flex-col justify-center ${isOutOfBudget ? 'bg-rose-50 border-rose-500' : 'bg-emerald-50 border-emerald-500'}`}>
              <p className="text-lg font-black leading-none text-slate-800">€{newExpectedResidual.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Descrizione Intervento</label>
            <VoiceInput
              type="textarea"
              value={formData.description || ''}
              onChange={(v) => setFormData({ ...formData, description: v })}
              placeholder="Inserisci i dettagli tecnici del lavoro..."
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-medium"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">PDF Progetto Protocollato</label>
            <input type="file" accept="application/pdf" onChange={handleFileChange} ref={fileInputRef} className="hidden" id="pdf-upload" />
            <label htmlFor="pdf-upload" className={`w-full h-[108px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all ${formData.projectPdf ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-indigo-300'}`}>
              <span className="text-[10px] font-black uppercase text-center px-4 truncate w-full">{formData.projectPdf ? formData.projectPdf.name : 'Carica Progetto'}</span>
            </label>
          </div>
        </div>

        {selectedChapter && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4">Seleziona Copertura Fondi (Cap. {selectedChapter})</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredIdvs.map((idv) => {
                const res = idvResiduals[idv.id];
                const isSelected = formData.linkedIdvIds?.includes(idv.id);
                return (
                  <button key={idv.id} type="button" disabled={res <= 0 && !isSelected} onClick={() => toggleIdv(idv.id)} className={`p-5 text-left rounded-3xl border-2 transition-all h-24 flex flex-col justify-between ${isSelected ? 'border-indigo-600 bg-indigo-50 shadow-lg' : 'border-slate-100 bg-white hover:border-indigo-200'}`}>
                    <span className="text-[10px] font-black uppercase text-indigo-600">{idv.idvCode}</span>
                    <span className="text-sm font-black text-slate-800">€{res.toLocaleString()}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-5 pt-8 border-t border-slate-100">
          <button type="button" onClick={onCancel} className="px-8 py-4 font-bold text-slate-400 hover:text-slate-600 transition-colors">Annulla</button>
          <button type="submit" disabled={!selectedChapter} className={`px-12 py-4 text-white font-black rounded-2xl shadow-xl transition-all ${!selectedChapter ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            Salva Dati Progetto
          </button>
        </div>
      </form>
    </div>
  );
};

export default WorkForm;
