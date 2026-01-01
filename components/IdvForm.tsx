
import React, { useState } from 'react';
import { FundingIDV, User, UserRole } from '../types';
import { VoiceInput } from './VoiceInput';

interface IdvFormProps {
  existingChapters: string[];
  users: User[];
  currentUser: User;
  onSubmit: (idv: Partial<FundingIDV>) => void;
  onCancel: () => void;
}

export const IdvForm: React.FC<IdvFormProps> = ({ existingChapters = [], users = [], currentUser, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<Partial<FundingIDV>>({
    idvCode: '',
    capitolo: '',
    amount: undefined,
    motivation: '',
    assignedToId: currentUser.id // Default assegnato al creatore
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const assignedUser = users.find(u => u.id === formData.assignedToId);
    onSubmit({
      ...formData,
      assignedToName: assignedUser ? assignedUser.username : currentUser.username
    });
  };

  const operationalUsers = users.filter(u => u.role !== UserRole.VIEWER);

  return (
    <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-10 flex items-center gap-6">
        <div className="w-16 h-16 bg-emerald-500 text-white rounded-[1.5rem] flex items-center justify-center text-3xl font-black shadow-xl shadow-emerald-100 italic">€</div>
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter italic">Caricamento Fondo</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">In automatico sarai tu il responsabile del fondo.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">Identificativo IDV</label>
            <VoiceInput
              value={formData.idvCode || ''}
              onChange={(v) => setFormData({...formData, idvCode: v})}
              placeholder="es. IDV-2024-X"
              required
              className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold focus:border-emerald-600"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">Capitolo Finanziario</label>
            <input
              list="chapters"
              value={formData.capitolo || ''}
              onChange={(e) => setFormData({...formData, capitolo: e.target.value})}
              placeholder="N. Capitolo..."
              required
              className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-indigo-600 focus:border-indigo-600"
            />
            <datalist id="chapters">
              {existingChapters.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">Importo Fondo (€)</label>
            <VoiceInput
              type="number"
              value={formData.amount || ''}
              onChange={(v) => setFormData({...formData, amount: Number(v)})}
              placeholder="0.00"
              required
              className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-emerald-600 text-xl focus:border-emerald-600"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3 italic">Responsabile Assegnato</label>
            <select
              value={formData.assignedToId}
              onChange={(e) => setFormData({...formData, assignedToId: e.target.value})}
              disabled={currentUser.role !== UserRole.ADMIN} // Solo l'admin può cambiare assegnazione
              className="w-full px-6 py-5 bg-indigo-50 border-2 border-indigo-200 rounded-2xl font-bold text-indigo-700 outline-none disabled:opacity-50"
            >
              {operationalUsers.map(u => (
                <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">Dettaglio / Motivazione</label>
          <VoiceInput
            type="textarea"
            value={formData.motivation || ''}
            onChange={(v) => setFormData({...formData, motivation: v})}
            placeholder="Specifica delibera e finalità..."
            required
            className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-200 rounded-2xl font-medium focus:border-emerald-600"
          />
        </div>

        <div className="flex justify-end gap-5 pt-8 border-t border-slate-100">
          <button type="button" onClick={onCancel} className="px-10 py-5 font-bold text-slate-400 hover:text-slate-600 uppercase text-[10px] tracking-widest">Annulla</button>
          <button type="submit" className="px-12 py-5 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-200 transition-all uppercase text-xs tracking-widest">Salva Fondo</button>
        </div>
      </form>
    </div>
  );
};
