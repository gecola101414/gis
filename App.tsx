
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  WorkOrder, WorkStatus, FundingIDV, User, UserRole, AppState, PlanningNeed, PlanningList 
} from './types';
import Dashboard from './components/Dashboard';
import Catalog from './components/Catalog';
import WorkForm from './components/WorkForm';
import { IdvForm } from './components/IdvForm';
import IdvList from './components/IdvList';
import BidModal from './components/BidModal';
import PaymentModal from './components/PaymentModal';
import ChapterReport from './components/ChapterReport';
import Manual from './components/Manual';
import PlanningModule from './components/PlanningModule';

const SYSTEM_SECRET = "CME_LOMB_SECURE_VAULT_2026_V21_MASTER";
const ENCRYPTION_PREFIX = "PPB_CRYPT_V21:";
const IDB_NAME = 'VaultDB';
const IDB_STORE = 'Handles';

const saveHandleToIDB = async (handle: any) => {
  const db = await new Promise<IDBDatabase>((res, rej) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  const tx = db.transaction(IDB_STORE, 'readwrite');
  tx.objectStore(IDB_STORE).put(handle, 'lastHandle');
  return new Promise(res => tx.oncomplete = res);
};

const getHandleFromIDB = async () => {
  const db = await new Promise<IDBDatabase>((res, rej) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  return new Promise<any>((res) => {
    const req = db.transaction(IDB_STORE).objectStore(IDB_STORE).get('lastHandle');
    req.onsuccess = () => res(req.result);
  });
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [state, setState] = useState<AppState | null>(null);
  const [undoHistory, setUndoHistory] = useState<AppState[]>([]); 
  const [redoHistory, setRedoHistory] = useState<AppState[]>([]);
  const [fileHandle, setFileHandle] = useState<any | null>(null);
  const [view, setView] = useState<'gateway' | 'login' | 'setup' | 'dashboard' | 'idvs' | 'works' | 'planning' | 'admin' | 'chapter-detail' | 'manual' | 'add-idv' | 'add-work'>('gateway');
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'remote-update'>('synced');
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const [savedHandleExists, setSavedHandleExists] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  
  const isWritingRef = useRef(false);
  const stateRef = useRef<AppState | null>(null);
  const lastModifiedRef = useRef<number>(0);

  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const [lastFileName, setLastFileName] = useState<string>(localStorage.getItem('vault_last_file_name') || '');
  const [rememberedUser, setRememberedUser] = useState<{u:string, p:string} | null>(
    JSON.parse(localStorage.getItem('vault_remember_me') || 'null')
  );

  useEffect(() => {
    getHandleFromIDB().then(h => { if(h) setSavedHandleExists(true); });
  }, []);

  const encrypt = (data: any): string => {
    try {
      const text = JSON.stringify(data);
      const uint8 = new TextEncoder().encode(text);
      const keyUint8 = new TextEncoder().encode(SYSTEM_SECRET);
      const encrypted = uint8.map((b, i) => b ^ keyUint8[i % keyUint8.length]);
      let binary = '';
      for (let i = 0; i < encrypted.byteLength; i++) {
        binary += String.fromCharCode(encrypted[i]);
      }
      return ENCRYPTION_PREFIX + btoa(binary);
    } catch (e) { return ""; }
  };

  const decrypt = (encryptedText: string): any | null => {
    if (!encryptedText || !encryptedText.startsWith(ENCRYPTION_PREFIX)) return null;
    try {
      const base64 = encryptedText.replace(ENCRYPTION_PREFIX, '');
      const binary = atob(base64);
      const uint8 = new Uint8Array(binary.length);
      const keyUint8 = new TextEncoder().encode(SYSTEM_SECRET);
      for (let i = 0; i < binary.length; i++) {
        uint8[i] = binary.charCodeAt(i) ^ keyUint8[i % keyUint8.length];
      }
      return JSON.parse(new TextDecoder().decode(uint8));
    } catch (e) { return null; }
  };

  const writeToDisk = async (newState: AppState) => {
    if (!fileHandle) return;
    isWritingRef.current = true;
    setSyncStatus('syncing');
    try {
      const writable = await fileHandle.createWritable();
      const encrypted = encrypt(newState);
      await writable.write(encrypted);
      await writable.close();
      const file = await fileHandle.getFile();
      lastModifiedRef.current = file.lastModified;
      setSyncStatus('synced');
    } catch (err) { setSyncStatus('error'); } 
    finally { isWritingRef.current = false; }
  };

  useEffect(() => {
    if (!fileHandle || view === 'gateway' || view === 'setup' || view === 'login') return;
    const pollFile = async () => {
      if (isWritingRef.current) return;
      try {
        const file = await fileHandle.getFile();
        if (file.lastModified > lastModifiedRef.current) {
          const content = await file.text();
          if (!content) return;
          const dec = decrypt(content);
          if (dec && dec.version > (stateRef.current?.version || 0)) {
            lastModifiedRef.current = file.lastModified;
            setSyncStatus('remote-update');
            setState(dec);
            setTimeout(() => setSyncStatus('synced'), 2000);
          } else { lastModifiedRef.current = file.lastModified; }
        }
      } catch (e) {}
    };
    const interval = setInterval(pollFile, 2000);
    return () => clearInterval(interval);
  }, [fileHandle, view]);

  const updateVault = async (updates: Partial<AppState>, logMsg?: {action: string, details: string}) => {
    if (!state || !currentUser) return;
    setUndoHistory(prev => [state, ...prev].slice(0, 30));
    setRedoHistory([]);
    const now = new Date().toISOString();
    const newState = {
      ...state,
      ...updates,
      version: (state.version || 0) + 1,
      lastSync: now,
      auditLog: logMsg ? [{ id: `l-${Date.now()}`, timestamp: now, userId: currentUser.id, username: currentUser.username, action: logMsg.action, details: logMsg.details }, ...state.auditLog].slice(0, 1000) : state.auditLog
    };
    setState(newState);
    await writeToDisk(newState);
  };

  const handleUndo = useCallback(async () => {
    if (undoHistory.length === 0 || !state) return;
    const previous = undoHistory[0];
    setRedoHistory(prev => [state, ...prev]);
    setUndoHistory(prev => prev.slice(1));
    setState(previous);
    await writeToDisk(previous);
  }, [undoHistory, state]);

  const handleRedo = useCallback(async () => {
    if (redoHistory.length === 0 || !state) return;
    const next = redoHistory[0];
    setUndoHistory(prev => [state, ...prev]);
    setRedoHistory(prev => prev.slice(1));
    setState(next);
    await writeToDisk(next);
  }, [redoHistory, state]);

  const handleLogin = (u: string, p: string, remember: boolean = false, autoRedirect = true) => {
    const user = state?.users.find(usr => usr.username.toLowerCase() === u.toLowerCase() && usr.passwordHash === p);
    if (user) { 
      setCurrentUser(user); 
      if (remember) localStorage.setItem('vault_remember_me', JSON.stringify({u, p}));
      if (autoRedirect) setView('dashboard'); 
      return true;
    } else {
      if (!autoRedirect) return false;
      alert("Credenziali non valide.");
      return false;
    }
  };

  const handleDirectAccess = async () => {
    try {
      const handle = await getHandleFromIDB();
      if (!handle) return;
      const options = { mode: 'readwrite' };
      if (await handle.requestPermission(options) === 'granted') {
        const file = await handle.getFile();
        const content = await file.text();
        const dec = decrypt(content);
        if (dec) {
          setFileHandle(handle);
          setState(dec);
          lastModifiedRef.current = file.lastModified;
          localStorage.setItem('vault_last_file_name', handle.name);
          if (rememberedUser) {
            const success = dec.users.find((usr: User) => 
              usr.username.toLowerCase() === rememberedUser.u.toLowerCase() && 
              usr.passwordHash === rememberedUser.p
            );
            if (success) { setCurrentUser(success); setView('dashboard'); return; }
          }
          setView('login');
        }
      }
    } catch (e) {
      alert("Puntamento al file di rete interrotto. Selezionare nuovamente il file sul disco Z:.");
      setSavedHandleExists(false);
    }
  };

  const [bidModalOrder, setBidModalOrder] = useState<WorkOrder | null>(null);
  const [paymentModalOrder, setPaymentModalOrder] = useState<WorkOrder | null>(null);
  const [editWorkOrder, setEditWorkOrder] = useState<WorkOrder | null>(null);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: UserRole.VIEWER });

  if (view === 'gateway') return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-6 font-['Inter'] relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500 rounded-full blur-[120px]"></div>
      </div>

      <div className="bg-slate-900/80 backdrop-blur-xl rounded-[4rem] p-16 shadow-2xl max-w-5xl w-full flex flex-col md:flex-row gap-16 border border-slate-700/50 overflow-hidden relative z-10">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500"></div>
        
        <div className="flex-1 space-y-10">
          <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white text-5xl font-black shadow-2xl italic border-b-8 border-indigo-900">V</div>
          <div>
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase leading-none italic">
              Miniserver<br/>
              <span className="text-indigo-400 font-black">V21 HYBRID</span>
            </h1>
            <p className="text-slate-400 text-lg font-medium leading-relaxed italic mt-6">CME Lombardia - Protocollo Ver-Z 2026</p>
            <div className="mt-8 flex gap-3">
               <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[8px] font-black text-slate-500 uppercase tracking-widest">Interface: Vercel Cloud</span>
               <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[8px] font-black text-slate-500 uppercase tracking-widest">Database: Local Z: Drive</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="p-6 bg-slate-800/50 rounded-3xl border border-slate-700 flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${savedHandleExists ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`}></div>
              <div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-0.5 italic">Puntatore Database Locale</span>
                <p className="text-xs font-bold text-slate-300">{savedHandleExists ? `Agganciato a: ${lastFileName}` : 'In attesa di puntamento su Disco Z:'}</p>
              </div>
            </div>
            
            {installPrompt && (
              <button 
                onClick={() => installPrompt.prompt()}
                className="w-full flex items-center gap-4 p-5 bg-indigo-600/10 border border-indigo-500/30 rounded-3xl text-indigo-400 hover:bg-indigo-600/20 transition-all group"
              >
                <span className="text-2xl group-hover:scale-125 transition-transform">📲</span>
                <div className="text-left">
                  <span className="text-[10px] font-black uppercase tracking-widest block italic">Ottimizzazione Sistema</span>
                  <p className="text-xs font-bold">Installa come App Desktop Stand-alone</p>
                </div>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-6 justify-center">
          {savedHandleExists && (
             <div className="flex flex-col gap-3">
                <button onClick={handleDirectAccess} className="p-14 bg-indigo-600 text-white rounded-[3.5rem] hover:bg-indigo-500 transition-all text-left shadow-2xl group active:scale-[0.98] border-b-[12px] border-indigo-900 flex flex-col items-center justify-center text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  <span className="text-[12px] font-black uppercase opacity-70 mb-4 block tracking-[0.4em]">Connection Bridge Ready</span>
                  <p className="text-4xl font-black italic mb-2 tracking-tighter uppercase">APRI DATABASE</p>
                  <p className="text-[10px] font-black uppercase opacity-50">Lettura diretta da file locale</p>
                </button>
                <div className="flex items-center justify-between px-6">
                   <button onClick={() => { setSavedHandleExists(false); indexedDB.deleteDatabase(IDB_NAME); }} className="text-[9px] font-black text-slate-500 uppercase hover:text-rose-500 transition-all tracking-widest py-2">Cambia Puntamento File</button>
                   {rememberedUser && <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest italic">Operatore: {rememberedUser.u}</span>}
                </div>
             </div>
          )}
          {!savedHandleExists && (
            <div className="space-y-4">
              <button onClick={async () => {
                 try {
                    const handle = await (window as any).showSaveFilePicker({ suggestedName: 'Vault_CME_2026.ppb' });
                    setFileHandle(handle); await saveHandleToIDB(handle); setView('setup');
                    localStorage.setItem('vault_last_file_name', handle.name);
                 } catch(e){}
              }} className="w-full p-10 bg-slate-800 border border-indigo-500/30 rounded-[3rem] hover:bg-slate-700 transition-all text-left shadow-xl group">
                <span className="text-[10px] font-black uppercase text-indigo-400 mb-2 block tracking-widest italic">Setup Nuovo Archivio (Solo Admin)</span>
                <p className="text-2xl font-black text-white italic group-hover:translate-x-2 transition-transform">Crea File su Disco Z:</p>
              </button>
              <button onClick={async () => {
                 try {
                    const [handle] = await (window as any).showOpenFilePicker();
                    const file = await handle.getFile(); const dec = decrypt(await file.text());
                    if (dec) { setFileHandle(handle); await saveHandleToIDB(handle); setState(dec); lastModifiedRef.current = file.lastModified; setView('login'); }
                 } catch(e){}
              }} className="w-full p-10 bg-indigo-600 text-white rounded-[3rem] hover:bg-indigo-500 transition-all text-left shadow-2xl active:scale-95 group">
                <span className="text-[10px] font-black uppercase opacity-50 mb-2 block tracking-widest italic">Accesso per Staff</span>
                <p className="text-2xl font-black italic group-hover:translate-x-2 transition-transform">Seleziona File su Disco Z:</p>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  
  // Il resto della logica rimane invariato...
  if (view === 'setup') return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-6">
      <div className="bg-slate-900 rounded-[4rem] p-16 shadow-2xl max-w-md w-full text-center border border-slate-700">
        <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-10 italic">Inizializzazione Master</h2>
        <div className="space-y-4 text-left">
          <input type="text" placeholder="Username Amministratore" id="s-u" className="w-full px-8 py-5 bg-slate-800 border-2 border-slate-700 rounded-[2rem] font-bold text-white focus:border-indigo-500 outline-none" />
          <input type="password" placeholder="Chiave Master" id="s-p" className="w-full px-8 py-5 bg-slate-800 border-2 border-slate-700 rounded-[2rem] font-bold text-white focus:border-indigo-500 outline-none" />
          <button onClick={async () => {
            const u = (document.getElementById('s-u') as any).value;
            const p = (document.getElementById('s-p') as any).value;
            if (u && p) {
              const init: AppState = { version: 1, users: [{ id: 'u-1', username: u, passwordHash: p, role: UserRole.ADMIN }], idvs: [], orders: [], planningNeeds: [], planningLists: [], auditLog: [], chatMessages: [], lastSync: new Date().toISOString() };
              setState(init); setCurrentUser(init.users[0]); await writeToDisk(init); setView('dashboard');
            }
          }} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase shadow-xl hover:bg-indigo-500 transition-all">Crea Vault Blindato</button>
        </div>
      </div>
    </div>
  );

  if (view === 'login') return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-6">
      <div className="bg-slate-900 rounded-[4rem] p-16 shadow-2xl max-w-md w-full text-center border border-slate-700">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto mb-8 flex items-center justify-center text-white text-4xl font-black italic shadow-2xl">V</div>
        <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-10 italic">Accesso Sicuro</h2>
        <div className="space-y-4 text-left">
          <input type="text" placeholder="Operatore" id="l-u" className="w-full px-8 py-5 bg-slate-800 border-2 border-slate-700 rounded-[2rem] font-bold text-white focus:border-indigo-500 outline-none" />
          <input type="password" placeholder="Password" id="l-p" className="w-full px-8 py-5 bg-slate-800 border-2 border-slate-700 rounded-[2rem] font-bold text-white focus:border-indigo-500 outline-none" />
          <div className="flex items-center gap-2 px-4"><input type="checkbox" id="rem" className="accent-indigo-500" /><label htmlFor="rem" className="text-[10px] font-black text-slate-500 uppercase italic cursor-pointer">Mantieni Sessione</label></div>
          <button onClick={() => handleLogin((document.getElementById('l-u') as any).value, (document.getElementById('l-p') as any).value, (document.getElementById('rem') as any).checked)} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase shadow-xl hover:bg-indigo-500 transition-all">Identificati</button>
        </div>
      </div>
    </div>
  );

  if (!state || !currentUser) return null;

  return (
    <div className="min-h-screen flex bg-slate-50 font-['Inter'] text-slate-700 overflow-hidden">
      <aside className="w-72 bg-white border-r border-slate-200 p-8 flex flex-col shadow-xl z-50">
        <div className="mb-10 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-lg italic">V</div>
          <div className="italic"><h1 className="text-lg font-black uppercase text-slate-800 leading-none">Vault V21</h1><p className="text-[9px] text-indigo-400 font-bold uppercase mt-1 tracking-widest">Miniserver Local</p></div>
        </div>
        <nav className="space-y-1.5 flex-1">
          {['dashboard', 'works', 'idvs', 'planning', 'manual', 'admin'].map(id => (
             (id !== 'admin' || currentUser.role === UserRole.ADMIN) && (
               <button key={id} onClick={() => { setView(id as any); setHighlightedOrderId(null); }} className={`w-full flex items-center px-6 py-4 rounded-[1.5rem] transition-all ${view === id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
                 <span className="text-[10px] font-black uppercase tracking-widest">
                   {id === 'dashboard' ? 'Analisi' : id === 'works' ? 'Registro Lavori' : id === 'idvs' ? 'Fondi Capitoli' : id === 'planning' ? 'Programmazione' : id === 'manual' ? 'Guida' : 'Staff'}
                 </span>
               </button>
             )
          ))}
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-100">
           <div className="p-4 bg-slate-50 rounded-[1.5rem] mb-4 border border-slate-100 text-center">
              <span className="text-[8px] font-black text-slate-400 uppercase italic">{currentUser.role}</span>
              <p className="text-xs font-black text-indigo-600 uppercase mt-1 truncate">{currentUser.username}</p>
           </div>
           <button onClick={() => window.location.reload()} className="w-full py-4 text-[9px] font-black text-rose-500 uppercase hover:bg-rose-50 rounded-xl transition-all tracking-[0.2em] border border-rose-100">Disconnetti</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen min-w-0">
        <header className="bg-white px-10 py-5 flex justify-between items-center border-b border-slate-200 relative z-40 shadow-sm">
          <div className="flex items-center gap-8">
             <div className="flex flex-col">
                <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">
                  {view === 'dashboard' && 'Analisi Operativa'}
                  {view === 'works' && 'Registro Pratiche'}
                  {view === 'idvs' && 'Controllo Fondi'}
                  {view === 'planning' && 'Pianificazione Esigenze'}
                  {view === 'manual' && 'Guida Tecnica Master'}
                  {view === 'admin' && 'Staff Abilitato'}
                  {view === 'chapter-detail' && `Capitolo ${selectedChapter}`}
                </h2>
                <div className="flex flex-col mt-0.5">
                   <p className="text-[10px] font-black text-slate-400 uppercase italic">@2025 Ing. GIMONDO Domenico</p>
                   <p className="text-[9px] font-black text-indigo-600 uppercase italic">Nodo: {fileHandle?.name || 'Iniziale'}</p>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className={`px-4 py-2 rounded-full border flex items-center gap-2 ${syncStatus === 'synced' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : syncStatus === 'remote-update' ? 'bg-indigo-50 text-indigo-600 border-indigo-200 animate-bounce' : 'bg-amber-50 text-amber-600 animate-pulse'}`}>
                <div className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500' : syncStatus === 'remote-update' ? 'bg-indigo-500' : 'bg-amber-500'}`}></div>
                <span className="text-[9px] font-black uppercase tracking-widest">
                  {syncStatus === 'synced' ? 'Miniserver Live' : syncStatus === 'syncing' ? 'Sync Disco...' : syncStatus === 'remote-update' ? 'Update Rete' : 'Errore I/O'}
                </span>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
          <div className="max-w-[1600px] mx-auto">
            {view === 'dashboard' && <Dashboard idvs={state.idvs} orders={state.orders} onChapterClick={(c) => { setSelectedChapter(c); setView('chapter-detail'); }} />}
            {view === 'works' && <Catalog orders={state.orders} idvs={state.idvs} highlightId={highlightedOrderId} onAdd={() => setView('add-work')} onChapterClick={(c) => { setSelectedChapter(c); setView('chapter-detail'); }} onStageClick={(o, s) => { if (s === 1) setEditWorkOrder(o); if (s === 2) setBidModalOrder(o); if (s === 3) setPaymentModalOrder(o); }} onDelete={(id) => updateVault({ orders: state.orders.filter(o => o.id !== id) })} onToggleLock={(id) => updateVault({ orders: state.orders.map(o => o.id === id ? { ...o, locked: !o.locked } : o) })} userRole={currentUser.role} />}
            {view === 'idvs' && <IdvList idvs={state.idvs} orders={state.orders} onAdd={() => setView('add-idv')} onChapterClick={(c) => { setSelectedChapter(c); setView('chapter-detail'); }} onDelete={(id) => updateVault({ idvs: state.idvs.filter(i => i.id !== id) })} onToggleLock={(id) => updateVault({ idvs: state.idvs.map(i => i.id === id ? { ...i, locked: !i.locked } : i) })} userRole={currentUser.role} />}
            {view === 'planning' && <PlanningModule state={state} onUpdate={(u) => updateVault(u)} currentUser={currentUser} idvs={state.idvs} />}
            {view === 'manual' && <Manual />}
            {view === 'admin' && (
              <div className="space-y-10 animate-in fade-in duration-500">
                <div className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-12 opacity-5 font-black text-9xl italic">STAFF</div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase mb-8 italic relative z-10">Personale Autorizzato</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12 items-end bg-slate-50 p-8 rounded-[2rem] border border-slate-100 relative z-10">
                    <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block italic">Username</label><input type="text" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full px-5 py-3 rounded-xl border-2 border-slate-200 font-bold outline-none focus:border-indigo-600" /></div>
                    <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block italic">Password</label><input type="text" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full px-5 py-3 rounded-xl border-2 border-slate-200 font-bold outline-none focus:border-indigo-600" /></div>
                    <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block italic">Ruolo</label><select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="w-full px-5 py-3 rounded-xl border-2 border-indigo-200 font-bold bg-indigo-50 outline-none">{Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    <button onClick={() => { if(newUser.username && newUser.password) { updateVault({ users: [...state.users, { id: `u-${Date.now()}`, username: newUser.username, passwordHash: newUser.password, role: newUser.role }] }); setNewUser({ username: '', password: '', role: UserRole.VIEWER }); } }} className="bg-indigo-600 text-white h-[52px] rounded-xl font-black uppercase text-[10px] shadow-lg hover:bg-indigo-700 transition-all">Aggiungi</button>
                  </div>
                  <div className="space-y-3 relative z-10">
                    {state.users.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-3xl hover:border-indigo-200 transition-all shadow-sm">
                        <div className="flex items-center gap-6">
                           <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl">{u.username[0].toUpperCase()}</div>
                           <div>
                              <p className="font-black text-slate-800 italic uppercase text-lg">{u.username}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{u.role}</p>
                              </div>
                           </div>
                        </div>
                        {u.id !== 'u-1' && (
                          <button onClick={() => { if(confirm("Revocare l'accesso?")) updateVault({ users: state.users.filter(usr => usr.id !== u.id) }); }} className="text-[10px] font-black text-rose-500 uppercase hover:bg-rose-50 px-6 py-3 rounded-xl transition-all border border-rose-100">Rimuovi</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {view === 'chapter-detail' && selectedChapter && (
              <ChapterReport chapter={selectedChapter} idvs={state.idvs.filter(i => i.capitolo === selectedChapter)} allIdvs={state.idvs} orders={state.orders} onBack={() => setView('dashboard')} onAddWork={() => setView('add-work')} onOrderClick={(orderId) => { setHighlightedOrderId(orderId); setView('works'); }} userRole={currentUser.role} currentUser={currentUser} />
            )}
            {view === 'add-idv' && <IdvForm existingChapters={Array.from(new Set(state.idvs.map(i => i.capitolo)))} users={state.users} currentUser={currentUser} onSubmit={async (d) => { await updateVault({ idvs: [...state.idvs, { id: `idv-${Date.now()}`, ...d as any, createdAt: new Date().toISOString(), ownerId: currentUser.id, ownerName: currentUser.username }] }); setView('idvs'); }} onCancel={() => setView('idvs')} />}
            {(view === 'add-work' || editWorkOrder) && <WorkForm idvs={state.idvs} orders={state.orders} currentUser={currentUser} existingChapters={Array.from(new Set(state.idvs.map(i => i.capitolo)))} initialData={editWorkOrder || undefined} prefilledChapter={selectedChapter || undefined} onSubmit={async (d) => { if (editWorkOrder) { updateVault({ orders: state.orders.map(o => o.id === editWorkOrder.id ? { ...o, ...d } : o) }); } else { updateVault({ orders: [...state.orders, { id: `w-${Date.now()}`, ...d as any, status: WorkStatus.PROGETTO, createdAt: new Date().toISOString(), ownerId: currentUser.id, ownerName: currentUser.username }] }); } setEditWorkOrder(null); setView('works'); }} onCancel={() => { setEditWorkOrder(null); setView('works'); }} />}
          </div>
        </div>
      </main>
      {bidModalOrder && <BidModal order={bidModalOrder} onSave={(b) => { updateVault({ orders: state.orders.map(o => o.id === bidModalOrder.id ? { ...o, status: WorkStatus.AFFIDAMENTO, winner: b.winner, contractValue: b.bidValue, contractPdf: b.contractPdf } : o) }); setBidModalOrder(null); }} onClose={() => setBidModalOrder(null)} />}
      {paymentModalOrder && <PaymentModal order={paymentModalOrder} onSave={(p) => { updateVault({ orders: state.orders.map(o => o.id === paymentModalOrder.id ? { ...o, status: WorkStatus.PAGAMENTO, paidValue: p.paidValue, invoicePdf: p.invoicePdf, creGenerated: true, creDate: p.creDate } : o) }); setPaymentModalOrder(null); }} onClose={() => setPaymentModalOrder(null)} />}
    </div>
  );
};
export default App;
