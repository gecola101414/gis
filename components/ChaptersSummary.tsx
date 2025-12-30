
import React, { useMemo } from 'react';
import { FundingIDV, WorkOrder, WorkStatus } from '../types';

interface ChaptersSummaryProps {
  idvs: FundingIDV[];
  orders: WorkOrder[];
  onChapterClick: (chapter: string) => void;
}

export const getChapterColor = (chapter: string) => {
  const colors = ['indigo', 'emerald', 'amber', 'rose', 'cyan', 'violet', 'orange', 'blue', 'teal', 'fuchsia'];
  let hash = 0;
  for (let i = 0; i < chapter.length; i++) { hash = chapter.charCodeAt(i) + ((hash << 5) - hash); }
  return colors[Math.abs(hash) % colors.length];
};

const ChaptersSummary: React.FC<ChaptersSummaryProps> = ({ idvs, orders, onChapterClick }) => {
  
  const statsByChapter = useMemo(() => {
    const stats: Record<string, {
      capitolo: string,
      totalBudget: number,
      pds: number,
      committed: number,
      completed: number
    }> = {};
    
    idvs.forEach(idv => {
      const cap = idv.capitolo;
      if (!stats[cap]) {
        stats[cap] = { capitolo: cap, totalBudget: 0, pds: 0, committed: 0, completed: 0 };
      }
      stats[cap].totalBudget += idv.amount;
    });

    orders.forEach(o => {
      const linkedIdv = idvs.find(i => o.linkedIdvIds.includes(i.id));
      if (linkedIdv && stats[linkedIdv.capitolo]) {
        const cap = linkedIdv.capitolo;
        const val = (o.paidValue || o.contractValue || o.estimatedValue);
        
        stats[cap].pds += val;
        if (o.status === WorkStatus.AFFIDAMENTO || o.status === WorkStatus.PAGAMENTO) {
          stats[cap].committed += (o.contractValue || o.estimatedValue);
        }
        if (o.status === WorkStatus.PAGAMENTO) {
          stats[cap].completed += (o.paidValue || o.contractValue || o.estimatedValue);
        }
      }
    });

    return Object.values(stats).sort((a, b) => a.capitolo.localeCompare(b.capitolo));
  }, [idvs, orders]);

  const ConvergenceLine = ({ label, value, total, color, bg }: { label: string, value: number, total: number, color: string, bg: string }) => {
    const percent = Math.min(100, Math.max(0, (value / total) * 100));
    return (
      <div className="space-y-1">
        <div className="flex justify-between items-center px-1">
          <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">{label}</span>
          <span className={`text-[9px] font-black ${color}`}>€{value.toLocaleString()}</span>
        </div>
        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${bg}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Somma Pastello Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Convergenza Economica</h2>
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mt-1">Stato dei Capitoli verso il 100% dell'assegnato</p>
        </div>
        <div className="flex gap-10">
           <div className="text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Massa Totale</p>
              <p className="text-2xl font-black text-slate-800">€{statsByChapter.reduce((a, b) => a + b.totalBudget, 0).toLocaleString()}</p>
           </div>
           <div className="text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Completato</p>
              <p className="text-2xl font-black text-emerald-600">€{statsByChapter.reduce((a, b) => a + b.completed, 0).toLocaleString()}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {statsByChapter.map((c) => {
          const color = getChapterColor(c.capitolo);
          const completionRate = Math.round((c.completed / c.totalBudget) * 100);

          return (
            <div key={c.capitolo} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 hover:shadow-md transition-all group">
              <div className="flex items-center gap-6 mb-8">
                <button 
                  onClick={() => onChapterClick(c.capitolo)}
                  className={`w-16 h-16 rounded-[1.5rem] bg-${color}-50 text-${color}-700 border border-${color}-100 flex flex-col items-center justify-center shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all`}
                >
                  <span className="text-[8px] font-black opacity-60">CAP.</span>
                  <span className="text-2xl font-black">{c.capitolo}</span>
                </button>
                <div className="flex-1">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Budget Fondo</span>
                      <p className="text-2xl font-black text-slate-800">€{c.totalBudget.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                       <span className="text-[8px] font-black text-slate-400 uppercase">Avanzamento</span>
                       <p className={`text-xl font-black text-${color}-600`}>{completionRate}%</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <ConvergenceLine label="1. Previsto Impegno (PDS)" value={c.pds} total={c.totalBudget} color="text-amber-600" bg="bg-amber-400" />
                <ConvergenceLine label="2. Impegnato (Fase 2)" value={c.committed} total={c.totalBudget} color="text-indigo-600" bg="bg-indigo-500" />
                <ConvergenceLine label="3. Completato (Liquidato)" value={c.completed} total={c.totalBudget} color="text-emerald-600" bg="bg-emerald-500" />
              </div>

              <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
                 <span className="text-[8px] font-black uppercase text-slate-400">Residuo di Capitolo</span>
                 <span className={`text-sm font-black ${c.totalBudget - c.completed < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                   €{(c.totalBudget - c.completed).toLocaleString()}
                 </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChaptersSummary;
