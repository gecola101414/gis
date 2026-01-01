
import React, { useMemo, useState } from 'react';
import { FundingIDV, WorkOrder, WorkStatus } from '../types';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList
} from 'recharts';
// @ts-ignore
import pptxgen from 'pptxgenjs';
// @ts-ignore
import { toPng } from 'html-to-image';

interface DashboardProps {
  idvs: FundingIDV[];
  orders: WorkOrder[];
  onChapterClick: (chapter: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ idvs, orders, onChapterClick }) => {
  const [isExporting, setIsExporting] = useState(false);

  const statsByChapter = useMemo(() => {
    const stats: Record<string, {
      capitolo: string;
      totalBudget: number;
      pds: number;        
      committed: number;  
      completed: number;  
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

  const global = useMemo(() => {
    return statsByChapter.reduce((acc, curr) => ({
      total: acc.total + curr.totalBudget,
      pds: acc.pds + curr.pds,
      committed: acc.committed + curr.committed,
      completed: acc.completed + curr.completed
    }), { total: 0, pds: 0, committed: 0, completed: 0 });
  }, [statsByChapter]);

  const mainChartData = [
    { name: 'ASSEGNATO', valore: global.total, fill: '#f1f5f9', stroke: '#cbd5e1' },
    { name: 'PREVISTO (PDS)', valore: global.pds, fill: '#fef3c7', stroke: '#f59e0b' },
    { name: 'IMPEGNATO', valore: global.committed, fill: '#e0e7ff', stroke: '#6366f1' },
    { name: 'COMPLETATO', valore: global.completed, fill: '#dcfce7', stroke: '#10b981' },
  ];

  const generatePresentation = async () => {
    setIsExporting(true);
    try {
      const pres = new pptxgen();
      pres.title = "Presentazione Stato PPB - CME Lombardia";

      // Cattura Sezione Globale
      const globalNode = document.getElementById('global-overview-section');
      if (globalNode) {
        const dataUrl = await toPng(globalNode, { backgroundColor: '#f8fafc' });
        const slide = pres.addSlide();
        slide.background = { color: 'F8FAFC' };
        slide.addImage({ data: dataUrl, x: 0.5, y: 0.5, w: 9, h: 5 });
      }

      // Cattura Sezione Capitoli
      const chaptersNode = document.getElementById('chapters-grid-section');
      if (chaptersNode) {
        const dataUrl = await toPng(chaptersNode, { backgroundColor: '#f8fafc' });
        const slide = pres.addSlide();
        slide.background = { color: 'F8FAFC' };
        slide.addImage({ data: dataUrl, x: 0.2, y: 0.2, w: 9.6, h: 5.2 });
      }

      await pres.writeFile({ fileName: `PRESENTAZIONE_PPB_${new Date().toISOString().split('T')[0]}.pptx` });
    } catch (err) {
      console.error("Errore esportazione:", err);
      alert("Impossibile generare la presentazione.");
    } finally {
      setIsExporting(false);
    }
  };

  const formatEuro = (val: number) => `€ ${val.toLocaleString('it-IT')}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20 bg-[#f8fafc]">
      {/* Header pastello */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-6 bg-white rounded-[2rem] shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tighter uppercase leading-none">Panoramica Strategica</h1>
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mt-1">Convergenza Ciclo Finanziario PPB</p>
        </div>
        <button 
          onClick={generatePresentation}
          disabled={isExporting}
          className={`flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all active:scale-95 ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isExporting ? (
            <span className="text-[9px] font-black uppercase tracking-widest animate-pulse">Elaborazione...</span>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              <span className="text-[9px] font-black uppercase tracking-widest">Esporta Presentazione</span>
            </>
          )}
        </button>
      </div>

      {/* Sezione Globale da Fotografare */}
      <div id="global-overview-section" className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-4 bg-[#f8fafc] rounded-[3rem]">
        <div className="lg:col-span-3 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-10">Andamento Cumulativo Convergente delle Risorse</h3>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mainChartData} margin={{ top: 40, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} 
                  dy={15}
                />
                <YAxis hide domain={[0, global.total * 1.1]} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 800 }}
                  formatter={(value: number) => [formatEuro(value), 'Importo']}
                />
                <Bar dataKey="valore" radius={[12, 12, 0, 0]} barSize={90}>
                  {mainChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.stroke} strokeWidth={2.5} />
                  ))}
                  <LabelList 
                    dataKey="valore" 
                    position="top" 
                    formatter={formatEuro} 
                    style={{ fontSize: '11px', fontWeight: 900, fill: '#1e293b' }} 
                    offset={15}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { label: 'Somme Assegnate', val: global.total, color: 'text-slate-600', bg: 'bg-white', sub: 'Massa Totale' },
            { label: 'Previsto (PDS)', val: global.pds, color: 'text-amber-600', bg: 'bg-amber-50/50', sub: `${Math.round((global.pds/global.total)*100)}% del budget` },
            { label: 'Impegnato (Contratti)', val: global.committed, color: 'text-indigo-600', bg: 'bg-indigo-50/50', sub: `${Math.round((global.committed/global.total)*100)}% del budget` },
            { label: 'Completato (Liquidato)', val: global.completed, color: 'text-emerald-600', bg: 'bg-emerald-50/50', sub: `${Math.round((global.completed/global.total)*100)}% del budget` },
          ].map((item, i) => (
            <div key={i} className={`${item.bg} p-5 rounded-[1.5rem] border border-slate-100 flex flex-col justify-between h-[105px]`}>
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{item.label}</span>
              <p className={`text-xl font-black ${item.color}`}>{formatEuro(item.val)}</p>
              <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">{item.sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Griglia Capitoli Sintetica da Fotografare */}
      <div id="chapters-grid-section" className="p-4 bg-[#f8fafc] rounded-[3rem]">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 px-4">Focus Analitico per Capitolo di Spesa</h4>
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
                    <span className="text-[7px] font-black text-slate-300 uppercase">Residuo</span>
                    <p className="text-xs font-black text-slate-700">{formatEuro(c.totalBudget - c.completed)}</p>
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
                    <p className="text-[10px] font-black text-amber-700">{formatEuro(c.pds)}</p>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded-lg text-center">
                    <p className="text-[6px] font-black text-emerald-600 uppercase">COM</p>
                    <p className="text-[10px] font-black text-emerald-700">{formatEuro(c.completed)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
