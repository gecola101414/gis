
import React, { useState, useMemo } from 'react';
import { AppState, PlanningNeed, User, FundingIDV, UserRole } from '../types';
import { VoiceInput } from './VoiceInput';

interface PlanningModuleProps {
  state: AppState;
  onUpdate: (updates: Partial<AppState>) => void;
  currentUser: User;
  idvs: FundingIDV[];
}

const PlanningModule: React.FC<PlanningModuleProps> = ({ state, onUpdate, currentUser, idvs }) => {
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [editingNeed, setEditingNeed] = useState<Partial<PlanningNeed> | null>(null);
  
  // STATI PER DRAG & DROP
  const [draggedNeedId, setDraggedNeedId] = useState<string | null>(null);
  const [dragOverListId, setDragOverListId] = useState<string | 'brogliaccio' | null>(null);
  
  // STATI PER EDIT NOME LISTA
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');

  const suggestedChapters = useMemo(() => Array.from(new Set(idvs.map(i => i.capitolo))).sort(), [idvs]);
  const suggestedBarracks = useMemo(() => Array.from(new Set(state.planningNeeds.map(n => n.barracks))).filter(Boolean).sort(), [state.planningNeeds]);

  // CALCOLO TOTALI
  const totals = useMemo(() => {
    const res: Record<string, number> = { all: 0 };
    state.planningNeeds.forEach(n => {
      res.all += (n.projectValue || 0);
      if (n.listId) {
        res[n.listId] = (res[n.listId] || 0) + (n.projectValue || 0);
      }
    });
    return res;
  }, [state.planningNeeds]);

  const filteredNeeds = useMemo(() => {
    if (!activeListId) return state.planningNeeds;
    return state.planningNeeds.filter(n => n.listId === activeListId);
  }, [state.planningNeeds, activeListId]);

  const currentListTotal = activeListId ? (totals[activeListId] || 0) : totals.all;

  const handleSaveNeed = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingNeed) return;

    let updatedNeeds;
    if (editingNeed.id) {
      updatedNeeds = state.planningNeeds.map(n => n.id === editingNeed.id ? { ...n, ...editingNeed as PlanningNeed } : n);
    } else {
      const newNeed: PlanningNeed = {
        ...editingNeed as PlanningNeed,
        id: `need-${Date.now()}`,
        createdAt: new Date().toISOString(),
        ownerName: currentUser.username,
        locked: false,
        listId: activeListId || undefined 
      };
      updatedNeeds = [...state.planningNeeds, newNeed];
    }
    onUpdate({ planningNeeds: updatedNeeds });
    setEditingNeed(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'projectPdf' | 'quotationPdf') => {
    const file = e.target.files?.[0];
    if (!file || !editingNeed) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setEditingNeed({ ...editingNeed, [field]: { name: file.name, data: event.target?.result as string } });
    };
    reader.readAsDataURL(file);
  };

  const handleRenameList = () => {
    if (editingListId && editingListName.trim()) {
      onUpdate({ planningLists: state.planningLists.map(l => l.id === editingListId ? { ...l, name: editingListName.trim() } : l) });
      setEditingListId(null);
    }
  };

  const handlePromoteToList = (id: string, listId?: string) => {
    onUpdate({ planningNeeds: state.planningNeeds.map(n => n.id === id ? { ...n, listId } : n) });
  };

  // LOGICA DRAG AND DROP
  const handleDragStart = (e: React.DragEvent, needId: string) => {
    setDraggedNeedId(needId);
    e.dataTransfer.setData("needId", needId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (listId: string | 'brogliaccio') => {
    if (draggedNeedId) setDragOverListId(listId);
  };

  const handleDragLeave = () => {
    setDragOverListId(null);
  };

  const handleDropOnList = (e: React.DragEvent, listId: string | null) => {
    e.preventDefault();
    const needId = e.dataTransfer.getData("needId") || draggedNeedId;
    if (needId) {
      handlePromoteToList(needId, listId || undefined);
    }
    setDraggedNeedId(null);
    setDragOverListId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 h-full flex flex-col relative overflow-hidden">
      
      {/* NAVIGATION BAR - LISTE E TRASCINAMENTO */}
      <div className="sticky top-0 z-30 flex items-center gap-3 bg-white/80 backdrop-blur-md p-4 rounded-[2rem] shadow-sm border border-slate-100 overflow-x-auto no-scrollbar">
        <button 
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={() => handleDragEnter('brogliaccio')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDropOnList(e, null)}
          onClick={() => setActiveListId(null)}
          className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex-shrink-0 border-2 ${!activeListId ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-slate-50 text-slate-400 border-transparent hover:border-indigo-200'} ${dragOverListId === 'brogliaccio' ? 'border-emerald-500 ring-4 ring-emerald-500/20 bg-emerald-50 text-emerald-600' : ''}`}
        >
          📖 Brogliaccio (€{totals.all.toLocaleString()})
        </button>
        
        {state.planningLists.map(list => (
          <div key={list.id} className="relative group flex-shrink-0">
            {editingListId === list.id ? (
              <input 
                autoFocus
                className="px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-white border-2 border-indigo-500 outline-none shadow-inner w-48"
                value={editingListName}
                onChange={e => setEditingListName(e.target.value)}
                onBlur={handleRenameList}
                onKeyDown={e => e.key === 'Enter' && handleRenameList()}
              />
            ) : (
              <button 
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => handleDragEnter(list.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDropOnList(e, list.id)}
                onClick={() => {
                  if (activeListId === list.id) {
                    setEditingListId(list.id);
                    setEditingListName(list.name);
                  } else {
                    setActiveListId(list.id);
                  }
                }}
                className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${activeListId === list.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-slate-50 text-slate-400 border-transparent hover:border-indigo-200'} ${dragOverListId === list.id ? 'border-emerald-500 ring-4 ring-emerald-500/20 bg-emerald-50 text-emerald-600' : ''}`}
                title="Clicca per selezionare, clicca di nuovo per rinominare"
              >
                📂 {list.name} (€{(totals[list.id] || 0).toLocaleString()})
              </button>
            )}
            {currentUser.role === UserRole.ADMIN && editingListId !== list.id && (
              <button 
                onClick={(e) => { e.stopPropagation(); if(confirm("Eliminare la lista?")) onUpdate({ planningLists: state.planningLists.filter(l => l.id !== list.id), planningNeeds: state.planningNeeds.map(n => n.listId === list.id ? { ...n, listId: undefined } : n) }); }}
                className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-md border-2 border-white text-[10px]"
              >✕</button>
            )}
          </div>
        ))}
      </div>

      {/* AREA TABELLARE ESIGENZE */}
      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col">
        <div className="bg-slate-900 px-8 py-5 flex justify-between items-center relative flex-shrink-0">
           <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
           <div className="flex items-center gap-6">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter italic leading-none">
                {activeListId ? state.planningLists.find(l => l.id === activeListId)?.name : 'Brogliaccio Strategico'}
              </h3>
              <div className="bg-indigo-500 text-white px-4 py-1.5 rounded-full text-xs font-black shadow-lg shadow-indigo-500/20 italic">
                €{currentListTotal.toLocaleString()}
              </div>
           </div>
           <button 
            onClick={() => setEditingNeed({ description: '', chapter: suggestedChapters[0] || '', barracks: '', projectValue: 0 })}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-[9px] font-black uppercase hover:bg-indigo-700 shadow-lg active:scale-95 transition-all"
           >
             Nuova Esigenza +
           </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="grid grid-cols-1 gap-3">
            {filteredNeeds.map((need, idx) => {
              const assignedList = state.planningLists.find(l => l.id === need.listId);
              
              return (
                <div 
                  key={need.id} 
                  draggable={!need.locked}
                  onDragStart={(e) => handleDragStart(e, need.id)}
                  onClick={() => !need.locked && setEditingNeed(need)}
                  className={`group bg-white rounded-[1.8rem] border-2 transition-all flex items-center gap-6 relative active:scale-[0.99] overflow-hidden ${need.locked ? 'opacity-60 grayscale border-slate-50' : 'border-slate-50 hover:border-indigo-100 hover:shadow-lg cursor-grab'} ${draggedNeedId === need.id ? 'opacity-30 border-dashed border-indigo-400 scale-[0.98]' : ''}`}
                >
                  {/* REINFORCED GRAPHIC - BARRA COLORATA A SINISTRA (SOLO SE ASSEGNATO) */}
                  {need.listId && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-indigo-500 to-indigo-700 shadow-[2px_0_10px_rgba(79,70,229,0.2)]"></div>
                  )}

                  {/* NUMERATORE (VICINO ALLA BARRA DI STATO) */}
                  <div className={`w-10 h-10 ml-4 bg-slate-50 rounded-xl flex-shrink-0 flex items-center justify-center text-[10px] font-black text-slate-300 border border-slate-100 shadow-inner group-hover:bg-indigo-50 group-hover:text-indigo-400 transition-colors ${need.listId ? 'ml-6' : 'ml-4'}`}>
                    {idx + 1}
                  </div>

                  {/* INFO PRINCIPALI */}
                  <div className="w-80">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-slate-800 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase italic tracking-widest">Cap. {need.chapter}</span>
                      <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[8px] font-black uppercase italic tracking-widest truncate max-w-[120px]">{need.barracks || 'N/D'}</span>
                    </div>
                    <p className="text-sm font-black text-slate-800 italic tracking-tight truncate leading-none">{need.description}</p>
                    {assignedList && (
                      <span className="text-[7px] font-black text-indigo-400 uppercase tracking-widest mt-1 block italic">Allocato in: {assignedList.name}</span>
                    )}
                  </div>

                  {/* VALORI ECONOMICI (CENTRALI) */}
                  <div className="flex-1 grid grid-cols-2 gap-8 border-l border-slate-50 pl-8">
                     <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block italic">Stima Baseline</span>
                        <p className="text-lg font-black text-slate-800 tracking-tighter">€{need.projectValue.toLocaleString()}</p>
                     </div>
                     <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block italic">Offerta / Consuntivo</span>
                        <p className="text-lg font-black text-indigo-600 tracking-tighter">€{(need.quotationValue || 0).toLocaleString()}</p>
                     </div>
                  </div>

                  {/* AZIONI E SELECT (ESTREMA DESTRA) */}
                  <div className="flex items-center gap-4 ml-auto px-6 border-l border-slate-50 h-full py-4">
                     
                     {/* ICONE PDF (DISCRETE) */}
                     <div className="flex gap-1.5">
                        {need.projectPdf && <div className="w-6 h-6 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-[7px] font-black border border-emerald-100" title="Progetto PDF">P</div>}
                        {need.quotationPdf && <div className="w-6 h-6 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center text-[7px] font-black border border-amber-100" title="Preventivo PDF">Q</div>}
                     </div>

                     {/* SELECT ASSEGNAZIONE (MARGINE DESTRO) */}
                     <div className="w-40">
                        <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-1 italic text-right pr-1">Sottogruppo</label>
                        <select 
                          value={need.listId || ''} 
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handlePromoteToList(need.id, e.target.value || undefined)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-bold py-1.5 px-2 outline-none focus:border-indigo-500 text-slate-600 cursor-pointer appearance-none text-right"
                        >
                          <option value="">📖 Brogliaccio</option>
                          {state.planningLists.map(l => (
                            <option key={l.id} value={l.id}>📂 {l.name}</option>
                          ))}
                        </select>
                     </div>
                     
                     {/* BOTTONI DI SISTEMA */}
                     {currentUser.role === UserRole.ADMIN && (
                        <div className="flex gap-2 ml-2">
                           <button onClick={(e) => { e.stopPropagation(); onUpdate({ planningNeeds: state.planningNeeds.map(n => n.id === need.id ? { ...n, locked: !n.locked } : n) }); }} className={`p-2 rounded-xl border transition-all ${need.locked ? 'bg-slate-800 text-white' : 'bg-white text-slate-300 hover:text-indigo-600 hover:border-indigo-600'}`}>
                             {need.locked ? '🔒' : '🔓'}
                           </button>
                           {!need.locked && (
                             <button onClick={(e) => { e.stopPropagation(); if (window.confirm("Eliminare definitivamente?")) onUpdate({ planningNeeds: state.planningNeeds.filter(n => n.id !== need.id) }); }} className="p-2 bg-white text-slate-300 hover:text-rose-500 rounded-xl border hover:border-rose-100 transition-all">
                               🗑️
                             </button>
                           )}
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODALE DI EDITING FULL SCREEN */}
      {editingNeed && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-6xl h-full max-h-[800px] rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden relative border-4 border-indigo-600/20">
              <button onClick={() => setEditingNeed(null)} className="absolute top-8 right-8 w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-xl hover:bg-rose-500 hover:text-white transition-all z-20 shadow-lg">✕</button>

              <div className="p-12 pb-8 border-b border-slate-50 flex justify-between items-end">
                 <div>
                    <h3 className="text-5xl font-black text-slate-900 italic tracking-tighter uppercase leading-none">Dettaglio<br/><span className="text-indigo-600">Esigenza</span></h3>
                 </div>
              </div>
              
              <div className="flex-1 flex gap-12 p-12 overflow-y-auto no-scrollbar">
                 <div className="flex-1 space-y-10">
                    <div className="grid grid-cols-2 gap-10">
                       <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 mb-4 block italic tracking-widest ml-2">Capitolo Finanziario</label>
                          <input list="sugg-chapters" value={editingNeed.chapter} onChange={e => setEditingNeed({...editingNeed, chapter: e.target.value})} className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-black text-2xl text-indigo-600 outline-none focus:border-indigo-600 shadow-inner" />
                          <datalist id="sugg-chapters">{suggestedChapters.map(c => <option key={c} value={c}/>)}</datalist>
                       </div>
                       <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 mb-4 block italic tracking-widest ml-2">Infrastruttura / Caserma</label>
                          <input list="sugg-barracks" value={editingNeed.barracks || ''} onChange={e => setEditingNeed({...editingNeed, barracks: e.target.value})} placeholder="Es. Caserma Teulié" className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-black text-2xl outline-none focus:border-indigo-600 shadow-inner" />
                          <datalist id="sugg-barracks">{suggestedBarracks.map(b => <option key={b} value={b}/>)}</datalist>
                       </div>
                    </div>

                    <div>
                       <label className="text-[10px] font-black uppercase text-slate-400 mb-4 block italic tracking-widest ml-2">Descrizione Intervento</label>
                       <VoiceInput type="textarea" value={editingNeed.description || ''} onChange={v => setEditingNeed({...editingNeed, description: v})} placeholder="Descrivere i dettagli tecnici..." className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] font-bold text-xl outline-none focus:border-indigo-600 shadow-inner" />
                    </div>

                    <div className="grid grid-cols-2 gap-10">
                       <div className="bg-emerald-50/50 p-8 rounded-[2.5rem] border-2 border-emerald-100">
                          <label className="text-[10px] font-black uppercase text-emerald-600 mb-4 block italic tracking-widest">Valore Stimato Baseline (€)</label>
                          <VoiceInput type="number" value={editingNeed.projectValue || ''} onChange={v => setEditingNeed({...editingNeed, projectValue: Number(v)})} className="w-full bg-transparent border-b-2 border-emerald-200 outline-none font-black text-4xl text-emerald-700" />
                       </div>
                       <div className="bg-indigo-50/50 p-8 rounded-[2.5rem] border-2 border-indigo-100">
                          <label className="text-[10px] font-black uppercase text-indigo-600 mb-4 block italic tracking-widest">Quotazione Fornitore (€)</label>
                          <VoiceInput type="number" value={editingNeed.quotationValue || ''} onChange={v => setEditingNeed({...editingNeed, quotationValue: Number(v)})} className="w-full bg-transparent border-b-2 border-indigo-200 outline-none font-black text-4xl text-indigo-700" />
                       </div>
                    </div>
                 </div>

                 <div className="w-[360px] flex flex-col gap-8">
                    <div className="bg-slate-50 rounded-[2.5rem] p-8 border-2 border-slate-100 flex flex-col items-center gap-6 shadow-sm">
                       <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">Documentazione Digitale</h4>
                       <input type="file" accept="application/pdf" id="full-pdf-pro" className="hidden" onChange={e => handleFileUpload(e, 'projectPdf')} />
                       <label htmlFor="full-pdf-pro" className={`w-full p-8 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${editingNeed.projectPdf ? 'bg-emerald-600 text-white border-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-300'}`}>
                          <span className="text-2xl mb-2">{editingNeed.projectPdf ? '✓' : '📄'}</span>
                          <span className="text-[10px] font-black uppercase truncate w-full text-center px-4">{editingNeed.projectPdf ? 'Progetto Caricato' : 'Allega Progetto'}</span>
                       </label>
                       
                       <input type="file" accept="application/pdf" id="full-pdf-quo" className="hidden" onChange={e => handleFileUpload(e, 'quotationPdf')} />
                       <label htmlFor="full-pdf-quo" className={`w-full p-8 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${editingNeed.quotationPdf ? 'bg-indigo-600 text-white border-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-300'}`}>
                          <span className="text-2xl mb-2">{editingNeed.quotationPdf ? '✓' : '💰'}</span>
                          <span className="text-[10px] font-black uppercase truncate w-full text-center px-4">{editingNeed.quotationPdf ? 'Preventivo Caricato' : 'Allega Preventivo'}</span>
                       </label>
                    </div>
                    
                    <button onClick={() => handleSaveNeed()} className="w-full py-10 bg-indigo-600 text-white rounded-[2.5rem] text-2xl font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-700 transition-all border-b-8 border-indigo-900 italic active:translate-y-1 active:border-b-4">
                       MEMORIZZA RECORD
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default PlanningModule;
