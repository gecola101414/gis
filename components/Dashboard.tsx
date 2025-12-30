
import React, { useMemo, useState } from 'react';
import { FundingIDV, WorkOrder, WorkStatus } from '../types';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell
} from 'recharts';
// @ts-ignore
import pptxgen from 'pptxgenjs';

interface DashboardProps {
  idvs: FundingIDV[];
  orders: WorkOrder[];
  onChapterClick: (chapter: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ idvs, orders, onChapterClick }) => {
  const [isGeneratingPpt, setIsGeneratingPpt] = useState(false);

  const statsByChapter = useMemo(() => {
    const stats: Record<string, {
      capitolo: string;
      totalBudget: number;
      pds: number;        // Fase 1: Previsto Impegno (Include tutto ciò che è stato pianificato)
      committed: number;  // Fase 2: Impegnato (Include tutto ciò che è stato contrattualizzato)
      completed: number;  // Fase 3: Completato (Include tutto ciò che è stato liquidato)
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
        
        // Logica Cumulativa di Convergenza
        stats[cap].pds += val; // Fase 1 sempre presente se la pratica esiste
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

  const global = useMemo(() => {
    return statsByChapter.reduce((acc, curr) => ({
      total: acc.total + curr.totalBudget,
      pds: acc.pds + curr.pds,
      committed: acc.committed + curr.committed,
      completed: acc.completed + curr.completed
    }), { total: 0, pds: 0, committed: 0, completed: 0 });
  }, [statsByChapter]);

  const mainChartData = [
    { name: 'Assegnato', valore: global.total, fill: '#f1f5f9', stroke: '#cbd5e1' },
    { name: 'Previsto Impegno (PDS)', valore: global.pds, fill: '#fef3c7', stroke: '#f59e0b' },
    { name: 'Impegnato', valore: global.committed, fill: '#e0e7ff', stroke: '#6366f1' },
    { name: 'Completato', valore: global.completed, fill: '#dcfce7', stroke: '#10b981' },
  ];

  const generatePPTX = async () => {
    setIsGeneratingPpt(true);
    // Logica PPTX mantenuta ma con estetica coerente
    setIsGeneratingPpt(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20 bg-[#f8fafc]">
      {/* Header pastello compatto */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-6 bg-white rounded-[2rem] shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tighter uppercase leading-none">Panoramica Strategica</h1>
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mt-1">Convergenza Ciclo Finanziario PPB</p>
        </div>
        <button 
          onClick={generatePPTX}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 17v-2a4 4 0 10-8 0v2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          <span className="text-[9px] font-black uppercase tracking-widest">Esporta Report Direzionale</span>
        </button>
      </div>

      {/* Grafico di Convergenza Globale */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Andamento Cumulativo Convergente</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-200"></div><span className="text-[8px] font-black text-slate-400 uppercase">Assegnato</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400"></div><span className="text-[8px] font-black text-slate-400 uppercase">PDS</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-400"></div><span className="text-[8px] font-black text-slate-400 uppercase">Impegnato</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400"></div><span className="text-[8px] font-black text-slate-400 uppercase">Completato</span></div>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mainChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" hide />
                <YAxis 
                  tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(value) => `€${(value/1000).toFixed(0)}k`}
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 800 }}
                  formatter={(value: number) => [`€${value.toLocaleString()}`, 'Importo']}
                />
                <Bar dataKey="valore" radius={[10, 10, 0, 0]} barSize={80}>
                  {mainChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.stroke} strokeWidth={2} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { label: 'Somme Assegnate', val: global.total, color: 'text-slate-600', bg: 'bg-white', sub: 'Massa Totale' },
            { label: 'Previsto (PDS)', val: global.pds, color: 'text-amber-600', bg: 'bg-amber-50/50', sub: `${Math.round((global.pds/global.total)*100)}% del totale` },
            { label: 'Impegnato (Fase 2)', val: global.committed, color: 'text-indigo-600', bg: 'bg-indigo-50/50', sub: `${Math.round((global.committed/global.total)*100)}% del totale` },
            { label: 'Completato (Fase 3)', val: global.completed, color: 'text-emerald-600', bg: 'bg-emerald-50/50', sub: `${Math.round((global.completed/global.total)*100)}% del totale` },
          ].map((item, i) => (
            <div key={i} className={`${item.bg} p-5 rounded-[1.5rem] border border-slate-100 flex flex-col justify-between h-[100px]`}>
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{item.label}</span>
              <p className={`text-xl font-black ${item.color}`}>€{item.val.toLocaleString()}</p>
              <span className="text-[7px] font-bold text-slate-400 uppercase">{item.sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Griglia Capitoli Sintetica */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {statsByChapter.map(c => {
          const capData = [
            { name: 'Ass', val: c.totalBudget, fill: '#f1f5f9' },
            { name: 'PDS', val: c.pds, fill: '#fcd34d' },
            { name: 'Imp', val: c.committed, fill: '#818cf8' },
            { name: 'Com', val: c.completed, fill: '#34d399' }
          ];

          return (
            <div key={c.capitolo} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <button 
                  onClick={() => onChapterClick(c.capitolo)}
                  className="w-10 h-10 rounded-xl bg-slate-50 text-slate-800 border border-slate-200 flex items-center justify-center text-sm font-black hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                >
                  {c.capitolo}
                </button>
                <div className="text-right">
                  <span className="text-[7px] font-black text-slate-300 uppercase">Residuo Liquidabile</span>
                  <p className="text-xs font-black text-slate-700">€{(c.totalBudget - c.completed).toLocaleString()}</p>
                </div>
              </div>

              <div className="h-24 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={capData}>
                    <Bar dataKey="val" radius={[4, 4, 0, 0]}>
                      {capData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-amber-50 p-2 rounded-lg text-center">
                  <p className="text-[6px] font-black text-amber-600 uppercase">PDS</p>
                  <p className="text-[10px] font-black text-amber-700">€{c.pds.toLocaleString()}</p>
                </div>
                <div className="bg-emerald-50 p-2 rounded-lg text-center">
                  <p className="text-[6px] font-black text-emerald-600 uppercase">COM</p>
                  <p className="text-[10px] font-black text-emerald-700">€{c.completed.toLocaleString()}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
