
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { WorkOrder, WorkStatus, FundingIDV, BidResult, PaymentResult } from './types';
import { INITIAL_IDVS, INITIAL_ORDERS } from './constants';
import Dashboard from './components/Dashboard';
import Catalog from './components/Catalog';
import WorkForm from './components/WorkForm';
import { IdvForm } from './components/IdvForm';
import IdvList from './components/IdvList';
import ChapterReport from './components/ChapterReport';
import ChaptersSummary from './components/ChaptersSummary';
import BidModal from './components/BidModal';
import PaymentModal from './components/PaymentModal';

interface AppState {
  idvs: FundingIDV[];
  orders: WorkOrder[];
}

const App: React.FC = () => {
  const [idvs, setIdvs] = useState<FundingIDV[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [history, setHistory] = useState<AppState[]>([]);
  const [historyPointer, setHistoryPointer] = useState(-1);
  const [view, setView] = useState<'dashboard' | 'idvs' | 'works' | 'add-idv' | 'add-work' | 'edit-work' | 'chapter-report' | 'chapters-summary'>('dashboard');
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [bidModalOrder, setBidModalOrder] = useState<WorkOrder | null>(null);
  const [paymentModalOrder, setPaymentModalOrder] = useState<WorkOrder | null>(null);
  const [prefilledChapter, setPrefilledChapter] = useState<string | null>(null);
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const [lastModifiedOrderId, setLastModifiedOrderId] = useState<string | null>(null);
  
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const existingChapters = useMemo(() => 
    Array.from(new Set(idvs.map(i => i.capitolo))).sort(),
  [idvs]);

  useEffect(() => {
    const saved = localStorage.getItem('ppb_office_data_v4');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setIdvs(parsed.idvs || []);
        setOrders(parsed.orders || []);
        setHistory([{ idvs: parsed.idvs || [], orders: parsed.orders || [] }]);
        setHistoryPointer(0);
      } catch (e) {
        initDefault();
      }
    } else {
      initDefault();
    }
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, []);

  // Timer per rimuovere l'evidenziazione pulsante dopo 5 secondi
  useEffect(() => {
    if (highlightedOrderId) {
      const timer = setTimeout(() => setHighlightedOrderId(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [highlightedOrderId]);

  const initDefault = () => {
    setIdvs(INITIAL_IDVS);
    setOrders(INITIAL_ORDERS);
    setHistory([{ idvs: INITIAL_IDVS, orders: INITIAL_ORDERS }]);
    setHistoryPointer(0);
  };

  const updateData = (newIdvs: FundingIDV[], newOrders: WorkOrder[]) => {
    setIdvs(newIdvs);
    setOrders(newOrders);
    
    const newState = { idvs: [...newIdvs], orders: [...newOrders] };
    setHistory(prev => {
      const newHistory = prev.slice(0, historyPointer + 1);
      newHistory.push(newState);
      return newHistory.slice(-30);
    });
    setHistoryPointer(prev => Math.min(prev + 1, 29));

    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem('ppb_office_data_v4', JSON.stringify(newState));
      setSaveStatus('saved');
    }, 1500);
  };

  const undo = () => {
    if (historyPointer > 0) {
      const prev = history[historyPointer - 1];
      setIdvs(prev.idvs);
      setOrders(prev.orders);
      setHistoryPointer(historyPointer - 1);
      localStorage.setItem('ppb_office_data_v4', JSON.stringify(prev));
      setSaveStatus('saved');
    }
  };

  const redo = () => {
    if (historyPointer < history.length - 1) {
      const next = history[historyPointer + 1];
      setIdvs(next.idvs);
      setOrders(next.orders);
      setHistoryPointer(historyPointer + 1);
      localStorage.setItem('ppb_office_data_v4', JSON.stringify(next));
      setSaveStatus('saved');
    }
  };

  const exportData = async () => {
    const dataStr = JSON.stringify({ idvs, orders }, null, 2);
    const suggestedName = `ARCHIVIO_CME_LOMB_PPB_${new Date().toISOString().split('T')[0]}.json`;

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName,
          types: [{
            description: 'File JSON di Backup',
            accept: { 'application/json': ['.json'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(dataStr);
        await writable.close();
        alert("Archivio salvato correttamente nella posizione scelta.");
      } catch (err) {
        console.error("Salvataggio annullato o errore:", err);
      }
    } else {
      const fileName = prompt("Salva Archivio con nome (cartella Download):", suggestedName);
      if (!fileName) return;
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.idvs && data.orders) {
          updateData(data.idvs, data.orders);
          alert("Dati importati con successo.");
          setView('dashboard');
        }
      } catch (err) { alert("File non valido."); }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const handleOpenChapterReport = (chapter: string) => {
    setSelectedChapter(chapter);
    setView('chapter-report');
    setIsMobileMenuOpen(false);
  };

  const handleNavigateToOrder = (orderId: string) => {
    setHighlightedOrderId(orderId);
    setLastModifiedOrderId(orderId);
    setView('works');
    setIsMobileMenuOpen(false);
  };

  const handleToggleLockIdv = (id: string) => {
    const newIdvs = idvs.map(i => i.id === id ? { ...i, locked: !i.locked } : i);
    updateData(newIdvs, orders);
  };

  const handleDeleteIdv = (id: string) => {
    if (confirm("Eliminare definitivamente questo fondo?")) {
      const newIdvs = idvs.filter(i => i.id !== id);
      updateData(newIdvs, orders);
    }
  };

  const handleToggleLockOrder = (id: string) => {
    const newOrders = orders.map(o => o.id === id ? { ...o, locked: !o.locked } : o);
    updateData(idvs, newOrders);
  };

  const handleDeleteOrder = (id: string) => {
    if (confirm("Eliminare definitivamente questa pratica?")) {
      const newOrders = orders.filter(o => o.id !== id);
      updateData(idvs, newOrders);
    }
  };

  const handleAddIdv = (idv: Partial<FundingIDV>) => {
    const newIdv: FundingIDV = {
      id: `idv-${Date.now()}`,
      idvCode: idv.idvCode || '',
      capitolo: idv.capitolo || '',
      amount: idv.amount || 0,
      motivation: idv.motivation || '',
      createdAt: new Date().toISOString(),
      locked: false
    };
    updateData([...idvs, newIdv], orders);
    setView('idvs');
  };

  const handleAddWork = (order: Partial<WorkOrder>) => {
    const newId = `o-${Date.now()}`;
    const newOrder: WorkOrder = {
      id: newId,
      orderNumber: `PRJ-${Math.floor(Math.random() * 10000)}`,
      description: order.description || '',
      estimatedValue: order.estimatedValue || 0,
      linkedIdvIds: order.linkedIdvIds || [],
      status: WorkStatus.PROGETTO,
      createdAt: new Date().toISOString(),
      projectPdf: order.projectPdf
    };
    updateData(idvs, [...orders, newOrder]);
    setPrefilledChapter(null);
    setHighlightedOrderId(newId);
    setLastModifiedOrderId(newId);
    setView('works');
  };

  const handleUpdateStatus = (order: WorkOrder, nextStatus: WorkStatus) => {
    if (nextStatus === WorkStatus.AFFIDAMENTO) setBidModalOrder(order);
    else if (nextStatus === WorkStatus.PAGAMENTO) setPaymentModalOrder(order);
  };

  const handleSaveBid = (bid: BidResult) => {
    if (!bidModalOrder) return;
    const newOrders = orders.map(o => o.id === bidModalOrder.id ? { 
      ...o, 
      status: WorkStatus.AFFIDAMENTO, 
      winner: bid.winner, 
      contractValue: bid.bidValue, 
      contractPdf: bid.contractPdf 
    } : o);
    updateData(idvs, newOrders);
    setHighlightedOrderId(bidModalOrder.id);
    setLastModifiedOrderId(bidModalOrder.id);
    setBidModalOrder(null);
  };

  const handleSavePayment = (payment: PaymentResult) => {
    if (!paymentModalOrder) return;
    const newOrders = orders.map(o => o.id === paymentModalOrder.id ? { 
      ...o, 
      status: WorkStatus.PAGAMENTO, 
      paidValue: payment.paidValue, 
      invoicePdf: payment.invoicePdf,
      creGenerated: payment.creGenerated,
      creDate: payment.creDate
    } : o);
    updateData(idvs, newOrders);
    setHighlightedOrderId(paymentModalOrder.id);
    setLastModifiedOrderId(paymentModalOrder.id);
    setPaymentModalOrder(null);
  };

  const handleAddWorkForChapter = (chapter: string) => {
    setPrefilledChapter(chapter);
    setView('add-work');
  };

  const navigateTo = (v: typeof view) => {
    setView(v);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-[#f8fafc] font-['Inter'] text-slate-900 overflow-hidden relative">
      
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Responsive */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 w-80 bg-[#0f172a] text-white p-8 flex flex-col border-r border-slate-800 shadow-2xl z-50 transition-transform duration-300 transform
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="mb-12 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center font-black text-3xl shadow-2xl shadow-indigo-900/50">L</div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none uppercase">CME Lombardia</h1>
              <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-[0.15em] mt-1.5 opacity-80">Gestione PPB - Ufficio Tecnico</p>
            </div>
          </div>
          <button className="lg:hidden text-slate-400 p-2" onClick={() => setIsMobileMenuOpen(false)}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <nav className="space-y-3 flex-1">
          <button onClick={() => navigateTo('dashboard')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 ${view === 'dashboard' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/40' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <span className="text-xs font-black uppercase tracking-widest">Analisi Generale</span>
          </button>
          <button onClick={() => navigateTo('chapters-summary')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 ${view === 'chapters-summary' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/40' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <span className="text-xs font-black uppercase tracking-widest">Riepilogo Capitoli</span>
          </button>
          <button onClick={() => navigateTo('idvs')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 ${view === 'idvs' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/40' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <span className="text-xs font-black uppercase tracking-widest">Registro Fondi</span>
          </button>
          <button onClick={() => navigateTo('works')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 ${view === 'works' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/40' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <span className="text-xs font-black uppercase tracking-widest">Registro Lavori</span>
          </button>
        </nav>

        {/* Copyright Section */}
        <div className="mt-auto pt-8 border-t border-slate-800/50 space-y-4">
          <div className="flex flex-col items-center text-center">
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] leading-relaxed">
              &copy; 2025 - Sviluppato per CME Lombardia
            </p>
            <p className="text-[9px] text-indigo-400 font-black uppercase tracking-[0.1em] mt-1">
              Creato dall'Ing. Gimondo Domenico
            </p>
          </div>
          
          <div className="opacity-30 text-[8px] font-black uppercase tracking-widest text-center text-slate-500">
            Versione Sistema 4.8.0
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        <header className="bg-white/95 backdrop-blur-xl px-6 lg:px-10 py-4 lg:py-6 flex justify-between items-center border-b border-slate-200 sticky top-0 z-30 shadow-sm shrink-0">
          <div className="flex items-center gap-4 lg:gap-10">
            {/* Mobile Hamburger Toggle */}
            <button 
              className="lg:hidden p-2.5 bg-slate-100 text-slate-600 rounded-xl active:scale-90 transition-all border border-slate-200"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16m-7 6h7" /></svg>
            </button>

            <h2 className="text-sm lg:text-xl font-black text-slate-900 uppercase tracking-tighter truncate max-w-[150px] lg:max-w-none">
              {view === 'dashboard' && 'Quadro Operativo'}
              {view === 'chapters-summary' && 'Bilancio Per Capitolo'}
              {view === 'idvs' && 'Registro Fondi'}
              {view === 'works' && 'Registro Lavori'}
              {view === 'add-idv' && 'Nuovo Fondo'}
              {view === 'add-work' && 'Nuova Esigenza'}
              {view === 'edit-work' && 'Gestione Pratica'}
              {view === 'chapter-report' && `Capitolo ${selectedChapter}`}
            </h2>
            
            <div className="hidden sm:flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button onClick={undo} disabled={historyPointer <= 0} className={`p-2.5 rounded-xl transition-all ${historyPointer <= 0 ? 'text-slate-300' : 'text-slate-600 hover:bg-white hover:shadow-md active:scale-90 hover:text-indigo-600'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l5-5m-5 5l5 5" /></svg>
              </button>
              <button onClick={redo} disabled={historyPointer >= history.length - 1} className={`p-2.5 rounded-xl transition-all ${historyPointer >= history.length - 1 ? 'text-slate-300' : 'text-slate-600 hover:bg-white hover:shadow-md active:scale-90 hover:text-indigo-600'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a8 8 0 00-8 8v2M21 10l-5-5m5 5l-5 5" /></svg>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-6">
            <div className="hidden md:flex items-center gap-3 px-5 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
              <div className={`w-3 h-3 rounded-full shadow-lg transition-all duration-700 ${saveStatus === 'saving' ? 'bg-amber-500 animate-pulse scale-110 shadow-amber-500/30' : 'bg-emerald-500 shadow-emerald-500/40'}`}></div>
              <span className={`text-[10px] font-black uppercase tracking-[0.1em] ${saveStatus === 'saving' ? 'text-amber-600' : 'text-emerald-700'}`}>
                {saveStatus === 'saving' ? 'Sincronizzazione...' : 'Database Sincronizzato'}
              </span>
            </div>

            <div className="flex items-center gap-2 lg:gap-3">
              <button onClick={exportData} className="p-2.5 lg:px-5 lg:py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl hover:text-indigo-600 hover:border-indigo-200 shadow-sm active:scale-95 flex items-center gap-3 group transition-all" title="Salva con nome">
                <svg className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293z" />
                  <path d="M5 3a2 2 0 00-2 2v2h14V5a2 2 0 00-2-2H5z" />
                </svg>
                <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest">Salva</span>
              </button>
              
              <label className="p-2.5 lg:px-5 lg:py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl hover:text-amber-600 hover:border-amber-200 cursor-pointer shadow-sm active:scale-95 flex items-center gap-3 group transition-all" title="Apri file">
                <svg className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest">Apri</span>
                <input type="file" accept=".json" onChange={importData} className="hidden" />
              </label>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-12 bg-[#f8fafc]">
          <div className="max-w-[1500px] mx-auto h-full">
            {view === 'dashboard' && <Dashboard idvs={idvs} orders={orders} onChapterClick={handleOpenChapterReport} />}
            {view === 'chapters-summary' && <ChaptersSummary idvs={idvs} orders={orders} onChapterClick={handleOpenChapterReport} />}
            {view === 'idvs' && (
              <IdvList 
                idvs={idvs} 
                orders={orders} 
                onChapterClick={handleOpenChapterReport} 
                onAdd={() => setView('add-idv')} 
                onToggleLock={handleToggleLockIdv}
                onDelete={handleDeleteIdv}
              />
            )}
            {view === 'works' && (
              <Catalog 
                orders={orders} 
                idvs={idvs} 
                onChapterClick={handleOpenChapterReport}
                onAction={handleUpdateStatus}
                onEdit={(o) => { setEditingOrder(o); setView('edit-work'); }}
                onToggleLock={handleToggleLockOrder}
                onDelete={handleDeleteOrder}
                onAdd={() => setView('add-work')}
                highlightedOrderId={highlightedOrderId}
                lastModifiedOrderId={lastModifiedOrderId}
              />
            )}
            {view === 'add-idv' && <IdvForm existingChapters={existingChapters} onSubmit={handleAddIdv} onCancel={() => setView('idvs')} />}
            {(view === 'add-work' || view === 'edit-work') && (
              <WorkForm 
                idvs={idvs} 
                orders={orders}
                existingChapters={existingChapters}
                initialData={editingOrder || undefined}
                prefilledChapter={prefilledChapter || undefined}
                onSubmit={editingOrder ? (data) => {
                  const updated = orders.map(o => o.id === editingOrder.id ? { ...o, ...data } : o);
                  updateData(idvs, updated);
                  setHighlightedOrderId(editingOrder.id);
                  setLastModifiedOrderId(editingOrder.id);
                  setEditingOrder(null);
                  setView('works');
                } : handleAddWork}
                onCancel={() => { setEditingOrder(null); setPrefilledChapter(null); setView('works'); }}
              />
            )}
            {view === 'chapter-report' && selectedChapter && (
              <ChapterReport 
                chapter={selectedChapter}
                idvs={idvs.filter(i => i.capitolo === selectedChapter)}
                orders={orders}
                allIdvs={idvs}
                onBack={() => setView('chapters-summary')}
                onAddWork={() => handleAddWorkForChapter(selectedChapter)}
                onOrderClick={handleNavigateToOrder}
              />
            )}
          </div>
        </div>
      </main>

      {bidModalOrder && (
        <BidModal 
          order={bidModalOrder} 
          onSave={handleSaveBid} 
          onClose={() => setBidModalOrder(null)} 
        />
      )}
      {paymentModalOrder && (
        <PaymentModal 
          order={paymentModalOrder} 
          onSave={handleSavePayment} 
          onClose={() => setPaymentModalOrder(null)} 
        />
      )}
    </div>
  );
};

export default App;
