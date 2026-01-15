
import React, { useState, useEffect, useRef } from 'react';
import { Transaction, FinancialProfile, QuickAction } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

interface Props {
  onConfirm: (transaction: Transaction | Transaction[]) => void;
  onBack?: () => void;
  profile?: FinancialProfile; 
  onUpdateProfile?: (profile: FinancialProfile) => void; // Para guardar atajos
  defaultEventId?: string; 
  defaultEventName?: string;
}

// Configuración de monedas
const CURRENCIES = [
  { code: 'ARS', flag: '🇦🇷', rate: 1, symbol: '$' },
  { code: 'USD', flag: '🇺🇸', rate: 1100, symbol: 'US$' },
  { code: 'EUR', flag: '🇪🇺', rate: 1200, symbol: '€' },
  { code: 'MXN', flag: '🇲🇽', rate: 0.9, symbol: 'Mex$' },
  { code: 'JPY', flag: '🇯🇵', rate: 7.5, symbol: '¥' },
  { code: 'BRL', flag: '🇧🇷', rate: 200, symbol: 'R$' },
];

interface ParsedItem {
    description: string;
    amount: number;
    category: string;
    type: 'income' | 'expense';
    id: string; // Temp ID for list management
}

const TransactionInput: React.FC<Props> = ({ onConfirm, onBack, profile, onUpdateProfile, defaultEventId, defaultEventName }) => {
  const [inputValue, setInputValue] = useState("");
  const [analyzed, setAnalyzed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [scanMode, setScanMode] = useState(false); 
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Quick Action Management State
  const [quickActions, setQuickActions] = useState<QuickAction[]>(profile?.quickActions || []);
  const [isEditingActions, setIsEditingActions] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  
  // New Action Form
  const [newActionLabel, setNewActionLabel] = useState('');
  const [newActionAmount, setNewActionAmount] = useState('');
  const [newActionIcon, setNewActionIcon] = useState('category');

  // Sincronizar acciones
  useEffect(() => {
    if (profile?.quickActions) {
        setQuickActions(profile.quickActions);
    }
  }, [profile]);

  // Multi-currency State
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[0]);
  const [customRate, setCustomRate] = useState<string>(""); 

  // State for parsed data (Single or Bulk)
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);

  useEffect(() => {
    if (selectedCurrency.code === 'ARS') setCustomRate("");
    else setCustomRate(selectedCurrency.rate.toString());
  }, [selectedCurrency]);

  // --- HELPER: CATEGORY GUESSER ---
  const guessCategory = (text: string, type: 'income' | 'expense'): string => {
      if (type === 'income') return 'Ingreso';
      const lower = text.toLowerCase();
      if (lower.includes('uber') || lower.includes('taxi') || lower.includes('nafta') || lower.includes('tren') || lower.includes('sube')) return 'Transporte';
      if (lower.includes('comida') || lower.includes('cena') || lower.includes('almuerzo') || lower.includes('burger') || lower.includes('cafe')) return 'Comida';
      if (lower.includes('super') || lower.includes('mercado') || lower.includes('coto') || lower.includes('carrefour')) return 'Compras';
      if (lower.includes('alquiler') || lower.includes('luz') || lower.includes('gas') || lower.includes('internet')) return 'Hogar';
      return 'Otros';
  };

  // --- VIDEO FRAME EXTRACTION HELPER ---
  const extractFramesFromVideo = async (videoFile: File, numFrames: number = 5): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const frames: string[] = [];
        
        const url = URL.createObjectURL(videoFile);
        
        const timeoutId = setTimeout(() => {
            cleanup();
            reject(new Error("Timeout procesando video."));
        }, 15000);

        const cleanup = () => {
            clearTimeout(timeoutId);
            URL.revokeObjectURL(url);
            video.remove();
            canvas.remove();
        };

        video.src = url;
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = "anonymous";
        video.preload = "metadata";

        video.onloadedmetadata = async () => {
            const duration = video.duration;
            if (!isFinite(duration) || duration <= 0) {
                cleanup();
                reject(new Error("Duración inválida."));
                return;
            }

            const interval = duration / (numFrames + 1);
            try {
                for (let i = 1; i <= numFrames; i++) {
                    video.currentTime = interval * i;
                    await new Promise<void>((r, er) => {
                        const h = () => { video.removeEventListener('seeked', h); r(); };
                        video.addEventListener('seeked', h);
                        video.addEventListener('error', () => er(new Error("Error frame")));
                    });

                    const MAX_WIDTH = 800;
                    const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
                    canvas.width = video.videoWidth * scale;
                    canvas.height = video.videoHeight * scale;

                    if (context) {
                        context.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                        if (dataUrl.length > 100) frames.push(dataUrl.split(',')[1]); 
                    }
                }
                cleanup();
                resolve(frames);
            } catch (err) { cleanup(); reject(err); }
        };
        video.onerror = () => { cleanup(); reject(new Error("Error cargando video")); };
    });
  };

  // --- AI SCANNING LOGIC (GEMINI) ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setScanMode(true);
    setLoadingMessage("Iniciando análisis...");
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let parts: any[] = [];
        let prompt = "";

        if (file.type.startsWith('video/')) {
            setLoadingMessage("Extrayendo fotogramas...");
            const frames = await extractFramesFromVideo(file);
            setLoadingMessage("Analizando secuencia...");
            prompt = `Analiza los fotogramas. Busca la transacción principal. Extrae: description, amount, category, type ("expense"|"income"), currency.`;
            parts = [{ text: prompt }, ...frames.map(d => ({ inlineData: { mimeType: 'image/jpeg', data: d } }))];
        } else {
            setLoadingMessage("Analizando imagen...");
            const base64Data = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
            });
            prompt = `Analiza el recibo. Extrae: description, amount, category, type, currency.`;
            parts = [{ text: prompt }, { inlineData: { mimeType: file.type, data: base64Data } }];
        }

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview', 
            contents: [{ role: 'user', parts: parts }],
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING },
                        amount: { type: Type.NUMBER },
                        category: { type: Type.STRING },
                        type: { type: Type.STRING },
                        currency: { type: Type.STRING }
                    },
                    required: ["description", "amount", "category", "type"]
                }
            }
        });

        const data = JSON.parse(response.text || '{}');
        if (data.amount) {
            setParsedItems([{
                id: Date.now().toString(),
                description: data.description || "Movimiento Detectado",
                amount: parseFloat(data.amount),
                category: data.category || "Otros",
                type: data.type || "expense"
            }]);
            
            if (data.currency && data.currency !== 'ARS') {
                const foundCurr = CURRENCIES.find(c => c.code === data.currency);
                if (foundCurr) setSelectedCurrency(foundCurr);
            }
            setAnalyzed(true);
        }
    } catch (error: any) {
        alert(`❌ Error: ${error.message}`);
        setAnalyzed(false);
        setScanMode(false);
    } finally {
        setLoading(false);
        setLoadingMessage("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  // --- TEXT ANALYSIS LOGIC (SINGLE & BULK) ---

  const runAnalysis = (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setLoadingMessage("Procesando...");
    
    setTimeout(() => {
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      const results: ParsedItem[] = [];

      lines.forEach((line, index) => {
          const parts = line.split(' ');
          let rawAmount = 0;
          let description = line;
          
          // Buscar el último número en la línea
          for (let i = parts.length - 1; i >= 0; i--) {
            const cleanStr = parts[i].replace(/[$,]/g, ''); 
            const val = parseFloat(cleanStr);
            if (!isNaN(val)) {
              rawAmount = val;
              description = parts.filter((_, idx) => idx !== i).join(' ');
              break;
            }
          }

          if (rawAmount > 0 || lines.length === 1) {
              const type = description.toLowerCase().includes('ingreso') ? 'income' : 'expense';
              const category = guessCategory(description, type);
              
              results.push({
                  id: `${Date.now()}-${index}`,
                  description: description.trim() || "Sin descripción",
                  amount: rawAmount,
                  category,
                  type
              });
          }
      });

      if (results.length > 0) {
          setParsedItems(results);
          setAnalyzed(true);
      } else {
          // Fallback if regex fails completely
          setAnalyzed(false);
      }

      setLoading(false);
      setLoadingMessage("");
    }, 400); // Small delay for UX feeling
  };

  const handleAnalyze = () => {
      runAnalysis(inputValue);
  };

  const handleQuickActionClick = (action: QuickAction) => {
      if (isEditingActions) {
          const updated = quickActions.filter(a => a.id !== action.id);
          setQuickActions(updated);
          if (profile && onUpdateProfile) onUpdateProfile({ ...profile, quickActions: updated });
          return;
      }

      // Si tiene monto, procesamos directo
      if (action.amount && action.amount > 0) {
          const text = `${action.label} ${action.amount}`;
          // Set text just in case they want to see/edit, but we analyze immediately
          setInputValue(text);
          runAnalysis(text);
      } else {
          // Si no tiene monto, prellenamos el input
          setInputValue(`${action.label} `);
          inputRef.current?.focus();
      }
  };

  const handleSaveQuickAction = () => {
      if (!newActionLabel) return;
      const newAction: QuickAction = {
          id: Date.now().toString(),
          label: newActionLabel,
          amount: newActionAmount ? parseFloat(newActionAmount) : undefined,
          icon: newActionIcon
      };
      
      const updated = [...quickActions, newAction];
      setQuickActions(updated);
      if (profile && onUpdateProfile) onUpdateProfile({ ...profile, quickActions: updated });
      
      setNewActionLabel('');
      setNewActionAmount('');
      setNewActionIcon('category');
      setShowActionModal(false);
  };

  const handleConfirm = () => {
    if (parsedItems.length === 0) return;
    
    const rate = parseFloat(customRate) || selectedCurrency.rate;
    const now = new Date();
    const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    const finalTransactions: Transaction[] = parsedItems.map((item, index) => ({
        id: (Date.now() + index).toString(),
        amount: item.amount * rate,
        description: item.description,
        category: item.category,
        type: item.type,
        date: localDate,
        originalCurrency: selectedCurrency.code,
        originalAmount: item.amount,
        exchangeRate: rate,
        eventId: defaultEventId || undefined,
        eventName: defaultEventName || undefined
    }));

    // Pass single or array depending on length (App.tsx handles both now)
    if (finalTransactions.length === 1) {
        onConfirm(finalTransactions[0]);
    } else {
        onConfirm(finalTransactions);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleAnalyze();
    }
  };

  const removeParsedItem = (id: string) => {
      const updated = parsedItems.filter(i => i.id !== id);
      if (updated.length === 0) {
          setAnalyzed(false);
          setInputValue('');
      } else {
          setParsedItems(updated);
      }
  };

  const updateParsedItem = (id: string, field: keyof ParsedItem, value: any) => {
      setParsedItems(items => items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen flex flex-col transition-colors duration-200">
      {/* Top Navbar */}
      <header className="w-full bg-surface-light dark:bg-surface-dark border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="px-6 md:px-10 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-4">
             {onBack && (
               <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <span className="material-symbols-outlined">arrow_back</span>
               </button>
             )}
            <div className="text-primary size-8 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
            </div>
            <h2 className="text-lg font-bold tracking-tight hidden sm:block text-slate-900 dark:text-white">Smart Money</h2>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto max-w-[200px] scrollbar-hide">
            {CURRENCIES.map(curr => (
               <button
                  key={curr.code}
                  onClick={() => setSelectedCurrency(curr)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1 shrink-0 ${
                     selectedCurrency.code === curr.code 
                     ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' 
                     : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
               >
                  <span>{curr.flag}</span>
                  <span className="hidden sm:inline">{curr.code}</span>
               </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 md:py-16 flex flex-col items-center">
        
        {defaultEventId && defaultEventName && (
            <div className="mb-6 animate-[fadeIn_0.5s_ease-out]">
                <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-sm border border-indigo-200 dark:border-indigo-800">
                    <span className="material-symbols-outlined text-[18px]">flight</span>
                    Agregando a: {defaultEventName}
                </div>
            </div>
        )}

        <div className="w-full text-center mb-8 space-y-3">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
            {parsedItems.length > 1 ? 'Revisión Masiva' : `Nuevo Movimiento ${selectedCurrency.code !== 'ARS' ? selectedCurrency.code : ''}`}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg md:text-xl font-normal max-w-2xl mx-auto">
            {loading ? (loadingMessage || 'Procesando...') : 
             analyzed ? 'Revisa y confirma los datos detectados.' :
             'Escribe uno o varios movimientos, o escanea un ticket.'}
          </p>
        </div>

        {/* Input Section (Hidden if analyzed) */}
        {!analyzed && (
            <>
                {/* AI Scanner Button */}
                <div className="mb-8 w-full max-w-2xl flex justify-center">
                    <input type="file" accept="image/*,video/*" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                    <button 
                        onClick={triggerFileInput}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl p-4 shadow-xl flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {loading && scanMode ? (
                            <span className="material-symbols-outlined animate-spin text-2xl">autorenew</span>
                        ) : (
                            <span className="material-symbols-outlined text-2xl">document_scanner</span>
                        )}
                        <div className="text-left">
                            <span className="block font-bold">Escanear Ticket / Video</span>
                            <span className="text-xs opacity-80">Apps de delivery, banco, etc.</span>
                        </div>
                    </button>
                </div>

                {/* Input Field */}
                <div className="w-full max-w-2xl relative group/input mb-6">
                    <div className={`absolute inset-0 bg-primary/5 dark:bg-primary/10 rounded-3xl blur-xl transform scale-95 opacity-0 group-hover/input:opacity-100 transition-opacity duration-500 ${loading ? 'animate-pulse opacity-100' : ''}`}></div>
                    <div className="relative bg-surface-light dark:bg-surface-dark shadow-lg dark:shadow-slate-900/50 rounded-3xl p-4 border border-slate-200 dark:border-slate-700 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 transition-all duration-300 flex flex-col">
                        <div className="flex w-full">
                            <span className="pt-2 pl-2 text-xl font-bold text-slate-400 mr-2">{selectedCurrency.symbol}</span>
                            <textarea 
                                ref={inputRef}
                                autoFocus 
                                placeholder={selectedCurrency.code === 'ARS' ? "Ej:\nSuper 25000\nUber 4500" : "Ej:\nTaxi 20\nCena 50"} 
                                className="flex-1 bg-transparent border-none text-slate-900 dark:text-white placeholder:text-slate-400 text-xl p-2 focus:ring-0 font-medium resize-none min-h-[80px]" 
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={loading}
                                rows={Math.max(3, inputValue.split('\n').length)}
                            />
                        </div>
                        <div className="flex justify-end mt-2">
                            <button 
                                onClick={handleAnalyze}
                                disabled={loading || !inputValue}
                                className="h-12 px-6 rounded-full bg-primary hover:bg-blue-600 text-white font-medium shadow-md shadow-blue-500/20 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading && !scanMode ? (
                                <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                                ) : (
                                <>
                                    <span>Procesar</span>
                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </>
                                )}
                            </button>
                        </div>
                    </div>
                    
                    {selectedCurrency.code !== 'ARS' && (
                        <div className="mt-4 flex justify-center animate-[fadeIn_0.2s_ease-out]">
                            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-2 flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-bold uppercase pl-2">Tipo de Cambio:</span>
                            <input 
                                type="number" 
                                className="w-20 bg-white dark:bg-slate-700 rounded px-2 py-1 text-sm font-bold text-center outline-none focus:ring-2 focus:ring-primary"
                                value={customRate}
                                onChange={(e) => setCustomRate(e.target.value)}
                            />
                            <span className="text-xs text-slate-500 pr-2">ARS</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* CUSTOM QUICK ACTIONS */}
                {selectedCurrency.code === 'ARS' && (
                    <div className="w-full max-w-3xl animate-[fadeIn_0.4s_ease-out] relative">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tus Frecuentes</p>
                            <button 
                                onClick={() => setIsEditingActions(!isEditingActions)}
                                className={`size-6 rounded-full flex items-center justify-center transition-colors ${isEditingActions ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-slate-400 hover:text-primary'}`}
                            >
                                <span className="material-symbols-outlined text-[14px]">{isEditingActions ? 'close' : 'edit'}</span>
                            </button>
                        </div>

                        <div className="flex flex-wrap justify-center gap-3 pb-4 px-4">
                            {quickActions.map((qa) => (
                                <button
                                    key={qa.id}
                                    onClick={() => handleQuickActionClick(qa)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all hover:scale-105 active:scale-95 border ${
                                        isEditingActions 
                                        ? 'bg-white border-red-200 text-red-500 hover:bg-red-50 animate-pulse'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-sm hover:border-primary/50'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">{qa.icon}</span>
                                    {qa.label}
                                    {qa.amount && !isEditingActions && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 rounded-md text-slate-500 ml-1">${qa.amount}</span>}
                                    {isEditingActions && <span className="material-symbols-outlined text-[14px] ml-1">delete</span>}
                                </button>
                            ))}
                            <button
                                onClick={() => setShowActionModal(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold bg-primary/5 hover:bg-primary/10 text-primary border border-dashed border-primary/30 transition-all"
                            >
                                <span className="material-symbols-outlined text-[18px]">add</span>
                                Nuevo
                            </button>
                        </div>
                    </div>
                )}
            </>
        )}

        {/* Modal: Add New Quick Action */}
        {showActionModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
                <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">bookmark_add</span>
                        Nuevo Atajo
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Nombre</label>
                            <input 
                                type="text" 
                                placeholder="Ej: Uber, Gym, Panadería" 
                                className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-primary"
                                value={newActionLabel}
                                onChange={(e) => setNewActionLabel(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Monto (Opcional)</label>
                            <input 
                                type="number" 
                                placeholder="Déjalo vacío para ingresarlo al usar" 
                                className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-primary"
                                value={newActionAmount}
                                onChange={(e) => setNewActionAmount(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Icono</label>
                            <div className="flex gap-2 mt-2 overflow-x-auto pb-2 scrollbar-hide">
                                {['category', 'local_taxi', 'restaurant', 'shopping_cart', 'coffee', 'local_gas_station', 'school', 'medication', 'pets', 'flight'].map(icon => (
                                    <button 
                                        key={icon} 
                                        onClick={() => setNewActionIcon(icon)}
                                        className={`size-10 rounded-full flex items-center justify-center border transition-all shrink-0 ${newActionIcon === icon ? 'bg-primary text-white border-primary' : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-400'}`}
                                    >
                                        <span className="material-symbols-outlined text-lg">{icon}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={handleSaveQuickAction} disabled={!newActionLabel} className="flex-1 bg-primary text-white py-3 rounded-xl font-bold disabled:opacity-50">Guardar</button>
                            <button onClick={() => setShowActionModal(false)} className="px-6 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-bold">Cancelar</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* REVIEW LIST (Bulk or Single) */}
        {analyzed && parsedItems.length > 0 && (
          <div className="w-full max-w-2xl mb-12 animate-[fadeIn_0.5s_ease-out]">
            
            <div className="grid gap-3">
                {parsedItems.map((item) => (
                    <div key={item.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center shadow-sm hover:shadow-md transition-all relative group">
                        
                        {/* Remove Button (visible on hover or always on mobile if needed) */}
                        <button 
                            onClick={() => removeParsedItem(item.id)}
                            className="absolute -top-2 -right-2 size-6 bg-red-100 text-red-500 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                        >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>

                        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                            
                            {/* Desc */}
                            <div className="sm:col-span-1">
                                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Descripción</label>
                                <input 
                                    type="text" 
                                    value={item.description} 
                                    onChange={(e) => updateParsedItem(item.id, 'description', e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 rounded-lg px-2 py-1 text-sm font-bold border-none outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>

                            {/* Amount */}
                            <div className="sm:col-span-1">
                                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Monto ({selectedCurrency.code})</label>
                                <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                    <input 
                                        type="number" 
                                        value={item.amount} 
                                        onChange={(e) => updateParsedItem(item.id, 'amount', parseFloat(e.target.value))}
                                        className="w-full bg-slate-50 dark:bg-slate-900 rounded-lg pl-5 pr-2 py-1 text-sm font-bold border-none outline-none focus:ring-1 focus:ring-primary text-right"
                                    />
                                </div>
                            </div>

                            {/* Type/Cat */}
                            <div className="sm:col-span-1 flex gap-2">
                                <button 
                                    onClick={() => updateParsedItem(item.id, 'type', item.type === 'expense' ? 'income' : 'expense')}
                                    className={`size-8 rounded-full flex items-center justify-center transition-colors ${item.type === 'expense' ? 'bg-red-100 text-red-500' : 'bg-emerald-100 text-emerald-500'}`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">{item.type === 'expense' ? 'arrow_downward' : 'arrow_upward'}</span>
                                </button>
                                <div className="flex-1">
                                    <input 
                                        type="text" 
                                        value={item.category} 
                                        onChange={(e) => updateParsedItem(item.id, 'category', e.target.value)}
                                        className="w-full h-8 bg-slate-50 dark:bg-slate-900 rounded-lg px-2 text-xs font-bold border-none outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="Categoría"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Total Summary */}
            <div className="flex justify-end mt-4 text-sm font-bold text-slate-500">
                <span>Total a Guardar: </span>
                <span className="ml-2 text-slate-900 dark:text-white">
                    {selectedCurrency.symbol}
                    {parsedItems.reduce((acc, i) => acc + (i.type === 'expense' ? i.amount : -i.amount), 0).toLocaleString()}
                </span>
            </div>

            <div className="w-full flex flex-col items-center gap-4 mt-8 mb-4">
              <button 
                onClick={handleConfirm}
                className="group relative flex items-center justify-center gap-3 bg-primary hover:bg-blue-600 text-white rounded-full h-16 px-10 text-lg font-bold shadow-xl shadow-blue-500/20 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-blue-500/40"
              >
                <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">check_circle</span>
                <span>Confirmar {parsedItems.length > 1 ? `(${parsedItems.length})` : ''}</span>
                <div className="absolute inset-0 rounded-full ring-2 ring-white/20 group-hover:ring-white/40 transition-all"></div>
              </button>
              
              <button 
                onClick={() => { setAnalyzed(false); setScanMode(false); setInputValue(''); setParsedItems([]); }}
                className="text-slate-400 text-sm hover:text-slate-600 dark:hover:text-slate-200 underline"
              >
                Cancelar y volver a intentar
              </button>
            </div>
          </div>
        )}
      </main>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default TransactionInput;
