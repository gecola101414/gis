
import React, { useState } from 'react';
import { FundingIDV } from '../types';
import { VoiceInput } from './VoiceInput';

interface IdvFormProps {
  existingChapters: string[];
  onSubmit: (idv: Partial<FundingIDV>) => void;
  onCancel: () => void;
}

export const IdvForm: React.FC<IdvFormProps> = ({ existingChapters = [], onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<Partial<FundingIDV>>({
    idvCode: '',
    capitolo: '',
    amount: undefined, // Rimosso lo 0 iniziale
    motivation: ''
  });

  return (
    <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-3xl mx-auto">
      <div className="mb-10 flex items-center gap-4">
        <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-xl shadow-emerald-200">€</div>
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Caricamento Fondo</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Registrazione Nuovo Capitolo/IDV</p>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Codice Identificativo IDV</label>
            <VoiceInput
              value={formData.idvCode || ''}
              onChange={(v) => setFormData({...formData, idvCode: v})}
              placeholder="es. IDV-2024-X"
              required
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Capitolo di Spesa</label>
            <div className="relative">
              <input
                list="chapters"
                value={formData.capitolo || ''}
                onChange={(e) => setFormData({...formData, capitolo: e.target.value})}
                placeholder="Digita o seleziona..."
                required
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold"
              />
              <datalist id="chapters">
                {existingChapters.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Importo Totale Assegnato (€) - Supporta Voce</label>
          <VoiceInput
            type="number"
            value={formData.amount || ''}
            onChange={(v) => setFormData({...formData, amount: Number(v)})}
            placeholder="es. 50000"
            required
            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-black text-emerald-600 text-xl"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Descrizione Provenienza Fondi</label>
          <VoiceInput
            type="textarea"
            value={formData.motivation || ''}
            onChange={(v) => setFormData({...formData, motivation: v})}
            placeholder="Specifica delibera, anno e finalità..."
            required
            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none"
          />
        </div>

        <div className="flex justify-end gap-5 pt-6">
          <button type="button" onClick={onCancel} className="px-8 py-4 font-bold text-slate-400 hover:text-slate-600 transition-colors">Annulla</button>
          <button type="submit" className="px-10 py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all active:scale-95">Salva in Registro</button>
        </div>
      </form>
    </div>
  );
};
