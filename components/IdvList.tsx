
import React from 'react';
import { FundingIDV, WorkOrder, UserRole } from '../types';
import { calculateAllResiduals } from './WorkForm';
import { getChapterColor } from './ChaptersSummary';

interface IdvListProps {
  idvs: FundingIDV[];
  orders: WorkOrder[];
  onChapterClick: (chapter: string) => void;
  onAdd: () => void;
  onToggleLock: (id: string) => void;
  onDelete: (id: string) => void;
  userRole?: string;
}

const IdvList: React.FC<IdvListProps> = ({ idvs, orders, onChapterClick, onAdd, onToggleLock, onDelete, userRole }) => {
  const currentResiduals = calculateAllResiduals(idvs, orders);
  const sortedIdvs = [...idvs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const isAdmin = userRole === UserRole.ADMIN;

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-500">
      <div className="flex justify-between items-end px-4 mb-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">Registro Sorgenti Fondi</h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase italic">Elenco cronologico capitoli finanziati</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl border border-indigo-100 shadow-sm text-right">
           <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Massa Fondi Totale</span>
           <span className="text-xl font-black text-slate-800">€{idvs.reduce((a, b) => a + b.amount, 0).toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {sortedIdvs.map((idv, index) => {
          const residual = currentResiduals[idv.id] ?? 0;
          const color = getChapterColor(idv.capitolo);
          return (
            <div key={idv.id} className={`bg-white rounded-[1.5rem] p-4 border shadow-sm transition-all hover:shadow-md flex items-center gap-6 relative ${idv.locked ? 'opacity-60 border-slate-100 grayscale' : 'border-slate-100'}`}>
              
              {/* NUMERAZIONE CRONOLOGICA */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-indigo-600 text-white rounded flex items-center justify-center text-[10px] font-black border-2 border-white shadow-lg">
                {index + 1}
              </div>

              <button onClick={() => onChapterClick(idv.capitolo)} className={`w-14 h-14 ml-4 rounded-xl text-white flex flex-col items-center justify-center bg-${color}-500 hover:scale-105 active:scale-95 transition-all shadow-md`}>
                <span className="text-[7px] font-black opacity-60 uppercase">Cap.</span>
                <span className="text-md font-black leading-none">{idv.capitolo}</span>
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-black text-slate-800 tracking-tight italic">{idv.idvCode}</h3>
                  <div className="flex gap-1.5">
                    <span className="bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded text-[7px] font-black uppercase">👤 {idv.assignedToName}</span>
                  </div>
                </div>
                <p className="text-[11px] font-medium text-slate-400 italic mt-0.5 truncate max-w-xl">"{idv.motivation}"</p>
              </div>
              <div className="text-right min-w-[150px] px-6 border-l border-slate-50">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Residuo</span>
                <span className={`text-lg font-black tracking-tighter ${residual <= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>€{residual.toLocaleString()}</span>
              </div>
              
              {isAdmin && (
                <div className="flex gap-2">
                   <button onClick={() => onToggleLock(idv.id)} className={`p-3 rounded-lg transition-all ${idv.locked ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-300 hover:bg-indigo-500 hover:text-white'}`}>{idv.locked ? '🔒' : '🔓'}</button>
                   {!idv.locked && (
                      <button onClick={() => { if(confirm("Rimuovere definitivamente il fondo?")) onDelete(idv.id) }} className="p-3 bg-white text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg border border-slate-50 transition-all">🗑️</button>
                   )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {isAdmin && (
        <button onClick={onAdd} className="fixed bottom-20 right-14 w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-emerald-600 hover:scale-110 active:scale-90 transition-all z-50 border-4 border-white group">
          <svg className="w-10 h-10 group-hover:rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M12 4v16m8-8H4" /></svg>
        </button>
      )}
    </div>
  );
};
export default IdvList;
