
import React, { useMemo, useEffect, useRef } from 'react';
import { WorkOrder, WorkStatus, FundingIDV } from '../types';
import { calculateAllResiduals } from './WorkForm';
import { getChapterColor } from './ChaptersSummary';

interface CatalogProps {
  orders: WorkOrder[];
  idvs: FundingIDV[];
  onAction: (order: WorkOrder, nextStatus: WorkStatus) => void;
  onEdit: (order: WorkOrder) => void;
  onToggleLock: (orderId: string) => void;
  onDelete: (orderId: string) => void;
  onAdd: () => void;
  onChapterClick: (chapter: string) => void;
  highlightedOrderId?: string | null;
  lastModifiedOrderId?: string | null;
}

const Catalog: React.FC<CatalogProps> = ({ 
  orders, 
  idvs, 
  onAction, 
  onEdit, 
  onToggleLock, 
  onDelete, 
  onAdd, 
  onChapterClick, 
  highlightedOrderId,
  lastModifiedOrderId
}) => {
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const currentResiduals = useMemo(() => calculateAllResiduals(idvs, orders), [idvs, orders]);

  const sortedOrders = useMemo(() => 
    [...orders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  [orders]);

  useEffect(() => {
    if (highlightedOrderId && rowRefs.current[highlightedOrderId]) {
      setTimeout(() => {
        rowRefs.current[highlightedOrderId]?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
    }
  }, [highlightedOrderId]);

  const getOrderIdvs = (ids: string[]) => {
    return idvs.filter(i => ids.includes(i.id)).map(i => i.idvCode).join(', ');
  };

  const getChapterResidual = (order: WorkOrder) => {
    const chapter = idvs.find(i => order.linkedIdvIds.includes(i.id))?.capitolo;
    if (!chapter) return 0;
    return idvs
      .filter(i => i.capitolo === chapter)
      .reduce((sum, i) => sum + (currentResiduals[i.id] || 0), 0);
  };

  const handleViewPdf = (pdf: { name: string, data: string }) => {
    try {
      const base64Content = pdf.data.split(',')[1];
      const binaryString = window.atob(base64Content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) { bytes[i] = binaryString.charCodeAt(i); }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(blob);
      const newWindow = window.open(fileURL, '_blank');
      if (newWindow) newWindow.focus();
    } catch (error) { alert("Impossibile visualizzare il file PDF."); }
  };

  const handlePrintCre = (order: WorkOrder) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const totalValue = order.paidValue || order.contractValue || 0;
    const imponibile = totalValue / 1.22;
    const iva = totalValue - imponibile;
    const dateStr = order.creDate || new Date().toLocaleDateString('it-IT');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <title>Certificato di Regolare Esecuzione - ${order.orderNumber}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');
          body { font-family: 'Libre Baskerville', serif; padding: 2cm; line-height: 1.5; color: #000; }
          .header { text-align: center; border-bottom: 2pt solid #000; padding-bottom: 20px; margin-bottom: 40px; }
          .ministero { font-size: 14pt; font-weight: bold; text-transform: uppercase; }
          .cert-title { text-align: center; font-size: 20pt; font-weight: bold; margin: 40px 0; text-decoration: underline; text-transform: uppercase; }
          .section { margin-bottom: 25px; }
          .label { font-weight: bold; min-width: 150px; display: inline-block; }
          .table-economica { width: 100%; margin: 30px 0; border-collapse: collapse; }
          .table-economica td { padding: 10px; border: 1px solid #000; }
          .footer { margin-top: 80px; display: flex; justify-content: space-between; }
          .signature-box { text-align: center; width: 300px; }
          @media print { .no-print { display: none; } }
          .btn-print { position: fixed; top: 20px; right: 20px; background: #000; color: #fff; padding: 15px 30px; border: none; font-weight: bold; cursor: pointer; }
        </style>
      </head>
      <body>
        <button class="btn-print no-print" onclick="window.print()">STAMPA DOCUMENTO UFFICIALE</button>
        <div class="header">
          <div class="ministero">Ministero della Difesa</div>
          <div>Esercito Italiano - Comando Militare Esercito "Lombardia"</div>
        </div>
        <div class="cert-title">Certificato di Regolare Esecuzione</div>
        <div class="section">
          <div><span class="label">Descrizione:</span> ${order.description}</div>
          <div><span class="label">Pratica:</span> ${order.orderNumber}</div>
          <div><span class="label">Ditta:</span> <strong>${order.winner || 'N.D.'}</strong></div>
        </div>
        <table class="table-economica">
          <tr><td>Imponibile Netto</td><td style="text-align: right;">€ ${imponibile.toLocaleString('it-IT', {minimumFractionDigits: 2})}</td></tr>
          <tr><td>IVA (22%)</td><td style="text-align: right;">€ ${iva.toLocaleString('it-IT', {minimumFractionDigits: 2})}</td></tr>
          <tr style="font-weight: bold;"><td>TOTALE LIQUIDATO</td><td style="text-align: right;">€ ${totalValue.toLocaleString('it-IT', {minimumFractionDigits: 2})}</td></tr>
        </table>
        <div class="section" style="font-size: 10pt; font-style: italic;">
          Si attesta la regolarità contributiva (DURC) e l'assenza di pendenze o debiti verso terzi da parte della ditta esecutrice. I lavori sono conformi alle specifiche tecniche.
        </div>
        <div class="footer">
          <div>Milano, lì ${dateStr}</div>
          <div class="signature-box">IL RESPONSABILE DEL PROCEDIMENTO<br><br><br><br>__________________________</div>
        </div>
      </body>
      </html>`;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const WorkflowTimeline = ({ order }: { order: WorkOrder }) => {
    const phases = [
      { id: 1, label: 'Progetto', key: WorkStatus.PROGETTO, color: 'amber', value: order.estimatedValue },
      { id: 2, label: 'Affidamento', key: WorkStatus.AFFIDAMENTO, color: 'indigo', value: order.contractValue },
      { id: 3, label: 'Liquidazione', key: WorkStatus.PAGAMENTO, color: 'emerald', value: order.paidValue }
    ];

    const getPhaseState = (phaseKey: WorkStatus) => {
      if (order.status === phaseKey) return 'current';
      const statusOrder = [WorkStatus.PROGETTO, WorkStatus.AFFIDAMENTO, WorkStatus.PAGAMENTO];
      const currentIndex = statusOrder.indexOf(order.status);
      const phaseIndex = statusOrder.indexOf(phaseKey);
      if (phaseIndex < currentIndex) return 'completed';
      return 'future';
    };

    const isPhaseClickable = (phaseKey: WorkStatus) => {
      if (order.locked) return false;
      if (phaseKey === WorkStatus.PROGETTO) return true;
      if (phaseKey === WorkStatus.AFFIDAMENTO) return true;
      if (phaseKey === WorkStatus.PAGAMENTO) {
        return order.status !== WorkStatus.PROGETTO;
      }
      return false;
    };

    const handlePhaseClick = (phaseKey: WorkStatus) => {
      if (!isPhaseClickable(phaseKey)) return;
      if (phaseKey === WorkStatus.PROGETTO) onEdit(order);
      else if (phaseKey === WorkStatus.AFFIDAMENTO) onAction(order, WorkStatus.AFFIDAMENTO);
      else if (phaseKey === WorkStatus.PAGAMENTO) onAction(order, WorkStatus.PAGAMENTO);
    };

    return (
      <div className="flex items-center gap-0 min-w-[450px] pt-8 pb-4">
        {phases.map((p, i) => {
          const state = getPhaseState(p.key);
          const isActive = state === 'current' || state === 'completed';
          const isCurrent = state === 'current';
          const isClickable = isPhaseClickable(p.key);
          
          return (
            <React.Fragment key={p.id}>
              <div className="flex flex-col items-center relative group/phase">
                
                {/* Popover Informativo su Hover */}
                <div className="absolute bottom-full mb-10 opacity-0 group-hover/phase:opacity-100 group-hover/phase:-translate-y-1 pointer-events-none transition-all duration-300 z-50 w-64">
                  <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl shadow-indigo-500/20 text-left">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-${p.color}-500/20 text-${p.color}-400`}>
                        {p.label}
                      </span>
                      <span className="text-[10px] font-black text-white/40">STEP {p.id}</span>
                    </div>

                    {p.id === 1 && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Stima Iniziale</p>
                          <p className="text-lg font-black text-white">€{order.estimatedValue.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Copertura Fondi</p>
                          <p className="text-[10px] font-bold text-indigo-400 mt-0.5">{getOrderIdvs(order.linkedIdvIds)}</p>
                        </div>
                      </div>
                    )}

                    {p.id === 2 && (
                      <div className="space-y-3">
                        {order.winner ? (
                          <>
                            <div>
                              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Ditta Aggiudicataria</p>
                              <p className="text-[11px] font-black text-white uppercase leading-tight mt-0.5">{order.winner}</p>
                            </div>
                            <div className="flex justify-between items-end border-t border-white/5 pt-2">
                              <div>
                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Contratto</p>
                                <p className="text-sm font-black text-white">€{(order.contractValue || 0).toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">Risparmio</p>
                                <p className="text-[11px] font-black text-emerald-400">€{(order.estimatedValue - (order.contractValue || 0)).toLocaleString()}</p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <p className="text-[10px] text-slate-500 italic">Dati non ancora inseriti</p>
                        )}
                      </div>
                    )}

                    {p.id === 3 && (
                      <div className="space-y-3">
                        {order.paidValue ? (
                          <>
                            <div>
                              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Liquidato Finale</p>
                              <p className="text-lg font-black text-emerald-400">€{order.paidValue.toLocaleString()}</p>
                            </div>
                            <div className="flex justify-between border-t border-white/5 pt-2">
                              <div>
                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Data CRE</p>
                                <p className="text-[10px] font-black text-white">{order.creDate || 'In attesa'}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Documento</p>
                                <p className="text-[10px] font-black text-white">Fattura Registrata</p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <p className="text-[10px] text-slate-500 italic">In attesa di liquidazione</p>
                        )}
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                       <div className={`w-1.5 h-1.5 rounded-full ${isActive ? `bg-${p.color}-500 shadow-[0_0_8px] shadow-${p.color}-500` : 'bg-slate-700'}`}></div>
                       <p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.1em]">
                         Stato: {state === 'completed' ? 'COMPLETATO' : state === 'current' ? 'IN CORSO' : 'IN CODA'}
                       </p>
                    </div>
                  </div>
                  {/* Triangolino Popover */}
                  <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-slate-900 absolute left-1/2 -translate-x-1/2"></div>
                </div>

                {/* Valore statico sopra (opzionale se c'è popover, ma lo teniamo per glance) */}
                <div className={`absolute -top-6 whitespace-nowrap transition-all duration-500 ${isActive ? 'opacity-100 -top-7' : 'opacity-30'}`}>
                  {p.value !== undefined ? (
                    <span className={`text-[10px] font-black bg-white px-2 py-0.5 rounded-lg border shadow-sm ${isActive ? `text-${p.color}-700 border-${p.color}-200` : 'text-slate-400 border-slate-100'}`}>
                      €{p.value.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-slate-300 italic">N.D.</span>
                  )}
                </div>

                <button 
                  type="button"
                  onClick={() => handlePhaseClick(p.key)}
                  disabled={!isClickable}
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-500 border-2
                    ${isActive 
                      ? `bg-${p.color}-600 border-${p.color}-600 text-white shadow-lg shadow-${p.color}-500/30` 
                      : 'bg-white border-slate-200 text-slate-300'}
                    ${isCurrent ? `ring-4 ring-${p.color}-100 scale-110 z-10` : ''}
                    ${isClickable 
                      ? 'cursor-pointer hover:scale-125 hover:rotate-12 active:scale-95' 
                      : 'cursor-not-allowed grayscale opacity-40'}
                  `}
                >
                  {state === 'completed' ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  ) : p.id}
                </button>
                
                <span className={`
                  absolute -bottom-6 whitespace-nowrap text-[8px] font-black uppercase tracking-tighter transition-colors
                  ${isActive ? `text-${p.color}-700` : 'text-slate-300'}
                  ${isClickable ? 'group-hover/phase:text-indigo-600' : ''}
                `}>
                  {p.label}
                </span>
              </div>

              {i < phases.length - 1 && (
                <div className="flex-1 px-1">
                  <div className={`h-[2px] w-full transition-all duration-700 ${state === 'completed' ? `bg-${phases[i+1].color}-600` : 'bg-slate-100'}`}></div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden relative flex flex-col h-full">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes highlight-pulse {
          0% { background-color: rgba(245, 158, 11, 0.05); }
          50% { background-color: rgba(245, 158, 11, 0.2); }
          100% { background-color: rgba(245, 158, 11, 0.05); }
        }
        .animate-highlight-glow {
          animation: highlight-pulse 2s infinite ease-in-out;
          box-shadow: inset 0 0 10px rgba(245, 158, 11, 0.1);
          border-left: 8px solid #f59e0b !important;
        }
        .last-modified-indicator {
          border-left: 8px solid #f97316 !important;
        }
        @keyframes shadow-pulse-amber {
          0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }
        .cre-button-highlight {
          animation: shadow-pulse-amber 2s infinite;
        }
      `}} />
      
      <div className="bg-slate-50 px-10 py-5 border-b border-slate-200 flex justify-between items-center flex-shrink-0 sticky top-0 z-30">
        <div>
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Registro Lavori Progressivo</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Avvicinati ai pallini per i dettagli rapidi • Clicca per gestire la fase</p>
        </div>
        <div className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">{orders.length} Pratiche</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead className="sticky top-0 z-20 shadow-sm">
            <tr className="bg-slate-100">
              <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center bg-slate-100">Prog.</th>
              <th className="px-10 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100">Dettaglio Intervento & Numero Pratica</th>
              <th className="px-10 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center bg-slate-100">Timeline Progressiva Workflow</th>
              <th className="px-10 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center bg-slate-100">Opzioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedOrders.map((o, index) => {
              const capRes = getChapterResidual(o);
              const chapter = idvs.find(i => o.linkedIdvIds.includes(i.id))?.capitolo;
              const color = chapter ? getChapterColor(chapter) : 'slate';
              const isHighlighted = o.id === highlightedOrderId;
              const isLastModified = o.id === lastModifiedOrderId;

              return (
                <tr 
                  key={o.id} 
                  ref={el => rowRefs.current[o.id] = el}
                  className={`hover:bg-slate-50/80 transition-all group ${o.locked ? 'bg-slate-50/50 opacity-80' : ''} ${isHighlighted ? 'animate-highlight-glow' : isLastModified ? 'last-modified-indicator' : ''}`}
                >
                  <td className="px-6 py-12 text-center align-top">
                    <span className="text-[11px] font-black text-slate-400">{index + 1}</span>
                  </td>
                  <td className="px-10 py-12 align-top">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2">
                        <span className="bg-[#0f172a] text-white text-[13px] font-black px-4 py-1.5 rounded-xl shadow-lg border-2 border-slate-700 tracking-wider">
                          {o.orderNumber}
                        </span>
                        {o.locked && <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg shadow-sm"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg></div>}
                      </div>

                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                          <p className={`text-base font-black leading-tight tracking-tight ${o.locked ? 'text-slate-500' : 'text-slate-900'}`}>{o.description}</p>
                          <div className="flex gap-2">
                            {o.projectPdf && <button onClick={() => handleViewPdf(o.projectPdf!)} className="text-amber-500 p-1 hover:bg-amber-50 rounded-lg transition-all hover:scale-110" title="Visualizza Progetto"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" /><path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg></button>}
                            {o.contractPdf && <button onClick={() => handleViewPdf(o.contractPdf!)} className="text-indigo-500 p-1 hover:bg-indigo-50 rounded-lg transition-all hover:scale-110" title="Visualizza Contratto"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg></button>}
                            {o.invoicePdf && <button onClick={() => handleViewPdf(o.invoicePdf!)} className="text-emerald-500 p-1 hover:bg-emerald-50 rounded-lg transition-all hover:scale-110" title="Visualizza Fattura"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" /></svg></button>}
                          </div>
                        </div>
                        <p className="text-[10px] font-black text-indigo-500/80 uppercase tracking-widest mt-1">Copertura IDV: {getOrderIdvs(o.linkedIdvIds)}</p>
                      </div>

                      <div className="flex items-center gap-3 mt-1">
                          {o.creGenerated && (
                            <button 
                              onClick={() => handlePrintCre(o)} 
                              className="cre-button-highlight bg-amber-500 text-slate-900 text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-[0.05em] flex items-center gap-2 transition-all hover:bg-amber-400 shadow-lg border-b-2 border-amber-700 active:scale-95"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg>
                              STAMPA CRE {o.creDate}
                            </button>
                          )}
                           <button 
                            onClick={() => chapter && onChapterClick(chapter)}
                            className={`flex items-center gap-1.5 text-[10px] font-black uppercase text-${color}-600 bg-${color}-50 px-3 py-1.5 rounded-xl hover:bg-${color}-600 hover:text-white transition-all shadow-sm border border-${color}-100`}
                           >
                             <span className="opacity-70">Cap. {chapter}</span>
                             <span className="w-px h-3 bg-current opacity-20"></span>
                             <span>Residuo: €{capRes.toLocaleString()}</span>
                           </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-12 text-center align-top">
                    <div className="inline-block">
                      <WorkflowTimeline order={o} />
                    </div>
                  </td>
                  <td className="px-10 py-12 text-center align-top">
                    <div className="flex items-center justify-center gap-3 pt-4">
                      <button onClick={() => onToggleLock(o.id)} className={`p-4 rounded-2xl transition-all shadow-sm ${o.locked ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 bg-white border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'}`} title="Blocca/Sblocca">{o.locked ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg> : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>}</button>
                      <button disabled={o.locked} onClick={() => onDelete(o.id)} className={`p-4 rounded-2xl transition-all shadow-sm ${o.locked ? 'text-slate-300 bg-slate-50' : 'text-slate-400 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'}`} title="Elimina"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button onClick={onAdd} className="fixed bottom-10 right-10 w-20 h-20 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-indigo-700 hover:scale-110 active:scale-95 transition-all z-50 group border-4 border-white">
        <svg className="w-10 h-10 group-hover:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
      </button>
    </div>
  );
};

export default Catalog;
