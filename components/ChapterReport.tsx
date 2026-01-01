
import React, { useMemo } from 'react';
import { FundingIDV, WorkOrder, WorkStatus, UserRole, User } from '../types';
import { getChapterColor } from './ChaptersSummary';

interface ChapterReportProps {
  chapter: string;
  idvs: FundingIDV[];
  orders: WorkOrder[];
  allIdvs: FundingIDV[];
  onBack: () => void;
  onAddWork: () => void;
  onOrderClick?: (orderId: string) => void;
  userRole?: string;
  currentUser?: User;
}

const ChapterReport: React.FC<ChapterReportProps> = ({ chapter, idvs, orders, allIdvs, onBack, onAddWork, onOrderClick, userRole, currentUser }) => {
  const color = getChapterColor(chapter);
  const chapterIdvIds = useMemo(() => idvs.map(i => i.id), [idvs]);

  const canAddWork = useMemo(() => {
    if (userRole === UserRole.ADMIN) return true;
    if (userRole === UserRole.VIEWER) return false;
    return idvs.some(i => i.assignedToId === currentUser?.id || i.ownerId === currentUser?.id);
  }, [idvs, userRole, currentUser]);

  const linkedOrders = useMemo(() => {
    return orders.filter(o => 
      o.linkedIdvIds.some(id => chapterIdvIds.includes(id))
    );
  }, [orders, chapterIdvIds]);

  const stats = useMemo(() => {
    const totalBudget = idvs.reduce((a, b) => a + b.amount, 0);
    let totalImpegnato = 0;
    linkedOrders.forEach(o => {
      totalImpegnato += (o.paidValue || o.contractValue || o.estimatedValue);
    });
    return { totalBudget, totalAvailable: totalBudget - totalImpegnato, totalImpegnato };
  }, [idvs, linkedOrders]);

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500 overflow-hidden">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm group">
            <svg className="w-5 h-5 text-slate-500 group-hover:text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-${color}-600 text-white flex items-center justify-center text-lg font-black shadow-lg`}>
              {chapter}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none italic">Capitolo {chapter}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Situazione Capitolo</span>
              </div>
            </div>
          </div>
        </div>

        {canAddWork && (
          <button 
            onClick={onAddWork}
            className={`flex items-center gap-3 px-5 py-3 bg-${color}-600 text-white rounded-2xl shadow-lg hover:bg-${color}-700 transition-all active:scale-95 group`}
          >
            <div className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center group-hover:rotate-180 transition-transform">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M12 4v16m8-8H4" /></svg>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Pianifica Intervento</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6 flex-shrink-0">
        <div className="bg-slate-900 px-6 py-4 rounded-2xl text-white shadow-xl">
          <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-1 italic">Assegnazione Capitale</p>
          <p className="text-lg font-black tracking-tight">€{stats.totalBudget.toLocaleString()}</p>
        </div>
        <div className="bg-white px-6 py-4 rounded-2xl border-2 border-slate-100">
          <p className="text-slate-400 text-[8px] font-black uppercase tracking-widest mb-1 italic">Spesa Impegnata</p>
          <p className={`text-lg font-black text-${color}-600 tracking-tight`}>€{stats.totalImpegnato.toLocaleString()}</p>
        </div>
        <div className={`bg-white px-6 py-4 rounded-2xl border-2 border-${color}-600 shadow-xl shadow-${color}-50`}>
          <p className="text-slate-400 text-[8px] font-black uppercase tracking-widest mb-1 italic">Saldo Disponibile</p>
          <p className={`text-xl font-black ${stats.totalAvailable < 0 ? 'text-rose-600' : 'text-emerald-600'} tracking-tight`}>€{stats.totalAvailable.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic">Sorgenti Fondi (IDV)</h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white shadow-sm">
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Codice IDV</th>
                  <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right italic">Importo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {idvs.map(idv => (
                  <tr key={idv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-xs font-black text-slate-900">{idv.idvCode}</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-0.5 truncate max-w-[150px] italic">Responsabile: {idv.assignedToName}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-black text-slate-900">€{idv.amount.toLocaleString()}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex-[1.5] flex flex-col bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic">Interventi Registrati (Clicca per aprire)</h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white shadow-sm">
                <tr className="border-b border-slate-100 bg-white">
                  <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Pratica / Oggetto</th>
                  <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center italic">Stato</th>
                  <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right italic">Importo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {linkedOrders.map(o => (
                  <tr 
                    key={o.id} 
                    onClick={() => onOrderClick && onOrderClick(o.id)} 
                    className="hover:bg-indigo-50/80 transition-all cursor-pointer group active:scale-[0.98]"
                    title="Vedi nel Registro Lavori"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                           <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded group-hover:bg-indigo-600 group-hover:text-white transition-colors">{o.orderNumber}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 truncate max-w-[200px] italic group-hover:text-indigo-700 transition-colors">{o.description}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase border ${
                        o.status === WorkStatus.PAGAMENTO ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        {o.status.split(' ')[0]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-xs font-black text-slate-900 group-hover:text-indigo-900">
                        €{(o.paidValue || o.contractValue || o.estimatedValue).toLocaleString()}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChapterReport;
