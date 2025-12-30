
import React from 'react';
import { FundingIDV, WorkOrder } from '../types';
import { calculateAllResiduals } from './WorkForm';
import { getChapterColor } from './ChaptersSummary';

interface IdvListProps {
  idvs: FundingIDV[];
  orders: WorkOrder[];
  onChapterClick: (chapter: string) => void;
  onAdd: () => void;
  onToggleLock: (id: string) => void;
  onDelete: (id: string) => void;
}

const IdvList: React.FC<IdvListProps> = ({ idvs, orders, onChapterClick, onAdd, onToggleLock, onDelete }) => {
  const currentResiduals = calculateAllResiduals(idvs, orders);
  const sortedIdvs = [...idvs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="h-full flex flex-col space-y-8 pb-10">
      <div className="flex justify-between items-end px-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Registro Flussi Finanziari</h2>
          <p className="text-indigo-600 font-bold text-xs uppercase tracking-widest mt-1">Archivio Storico Progressivo IDV</p>
        </div>
        <div className="bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm text-right">
           <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Capacità Totale Sistema</span>
           <span className="text-2xl font-black text-slate-900 tracking-tighter">€{idvs.reduce((a, b) => a + b.amount, 0).toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {sortedIdvs.map((idv, index) => {
          const residual = currentResiduals[idv.id] ?? 0;
          const isDepleted = residual <= 0;
          const isLocked = idv.locked;
          const color = getChapterColor(idv.capitolo);

          return (
            <div 
              key={idv.id} 
              className={`group bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm transition-all hover:shadow-xl hover:border-${color}-200 flex items-center gap-6 ${
                isLocked ? 'opacity-60 bg-slate-50 border-transparent' : ''
              }`}
            >
              <div className="flex flex-col items-center">
                 <button 
                  onClick={() => onChapterClick(idv.capitolo)}
                  className={`w-16 h-16 rounded-2xl text-white flex flex-col items-center justify-center shadow-lg transition-colors bg-${color}-600 hover:bg-${color}-700`}
                 >
                   <span className="text-[8px] font-black opacity-50 uppercase">Cap.</span>
                   <span className="text-lg font-black">{idv.capitolo}</span>
                 </button>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{idv.idvCode}</h3>
                  {isLocked && <div className="p-1 bg-indigo-50 text-indigo-600 rounded-lg"><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg></div>}
                </div>
                <p className="text-xs font-medium text-slate-400 italic mt-0.5">"{idv.motivation}"</p>
                <p className="text-[9px] font-bold text-slate-300 uppercase mt-2 tracking-widest">Registrato il: {new Date(idv.createdAt).toLocaleDateString()}</p>
              </div>

              <div className={`text-right min-w-[150px] px-6 border-l border-slate-50`}>
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Residuo</span>
                <span className={`text-2xl font-black tracking-tighter ${isDepleted ? 'text-rose-500' : 'text-emerald-600'}`}>
                  €{residual.toLocaleString()}
                </span>
              </div>

              <div className="flex gap-2">
                 <button onClick={() => onToggleLock(idv.id)} className={`p-3 rounded-xl transition-all ${isLocked ? 'bg-indigo-100 text-indigo-700' : 'text-slate-300 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                    {isLocked ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>}
                 </button>
                 <button onClick={() => onDelete(idv.id)} disabled={isLocked} className={`p-3 rounded-xl transition-all ${isLocked ? 'text-slate-200' : 'text-slate-300 hover:bg-rose-50 hover:text-rose-600'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                 </button>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={onAdd} className="fixed bottom-10 right-10 w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-emerald-700 hover:scale-110 active:scale-95 transition-all z-50 group border-4 border-white">
        <svg className="w-8 h-8 group-hover:rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
      </button>
    </div>
  );
};

export default IdvList;
