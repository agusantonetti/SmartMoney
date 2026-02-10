
import React, { useState, useEffect, useRef } from 'react';
import { Transaction, FinancialProfile, QuickAction } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

interface Props {
  onConfirm: (transaction: Transaction | Transaction[], shouldNavigate?: boolean) => void;
  onBack?: () => void;
  profile?: FinancialProfile; 
  onUpdateProfile?: (profile: FinancialProfile) => void;
  defaultEventId?: string; 
  defaultEventName?: string;
}

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
    id: string;
}

const TransactionInput: React.FC<Props> = ({ onConfirm, onBack, profile, onUpdateProfile, defaultEventId, defaultEventName }) => {
  const [inputValue, setInputValue] = useState("");
  const [analyzed, setAnalyzed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [scanMode, setScanMode] = useState(false); 
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [quickActions, setQuickActions] = useState<QuickAction[]>(profile?.quickActions || []);
  const [isEditingActions, setIsEditingActions] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  
  const [newActionLabel, setNewActionLabel] = useState('');
  const [newActionAmount, setNewActionAmount] = useState('');
  const [newActionIcon, setNewActionIcon] = useState('category');

  useEffect(() => {
    if (profile?.quickActions) {
        setQuickActions(profile.quickActions);
    }
  }, [profile]);

  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[0]);
  const [customRate, setCustomRate] = useState<string>(""); 
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);

  useEffect(() => {
    if (selectedCurrency.code === 'ARS') setCustomRate("");
    else setCustomRate(selectedCurrency.rate.toString());
  }, [selectedCurrency]);

  const guessCategory = (text: string, type: 'income' | 'expense'): string => {
      if (type === 'income') return 'Ingreso';
      const lower = text.toLowerCase();
      if (lower.includes('uber') || lower.includes('taxi') || lower.includes('nafta') || lower.includes('tren') || lower.includes('sube')) return 'Transporte';
      if (lower.includes('comida') || lower.includes('cena') || lower.includes('almuerzo') || lower.includes('burger') || lower.includes('cafe')) return 'Comida';
      if (lower.includes('super') || lower.includes('mercado') || lower.includes('coto') || lower.includes('carrefour')) return 'Compras';
      if (lower.includes('alquiler') || lower.includes('luz') || lower.includes('gas') || lower.includes('internet')) return 'Hogar';
      return 'Otros';
  };

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setScanMode(true);
    setLoadingMessage("Analizando...");
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let parts: any[] = [];
        let prompt = "";

        if (file.type.startsWith('video/')) {
            const frames = await extractFramesFromVideo(file);
            prompt = `Analiza. Extrae: description, amount, category, type ("expense"|"income"), currency.`;
            parts = [{ text: prompt }, ...frames.map(d => ({ inlineData: { mimeType: 'image/jpeg', data: d } }))];
        } else {
            const base64Data = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
            });
            prompt = `Analiza. Extrae: description, amount, category, type, currency.`;
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
                description: data.description || "Detectado",
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

  const runAnalysis = (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    
    setTimeout(() => {
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      const results: ParsedItem[] = [];

      lines.forEach((line, index) => {
          const parts = line.split(' ');
          let rawAmount = 0;
          let description = line;
          
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
                  description: description.trim() || "Gasto",
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
          setAnalyzed(false);
      }
      setLoading(false);
    }, 300);
  };

  const handleAnalyze = () => runAnalysis(inputValue);

  const handleQuickActionClick = (action: QuickAction) => {
      if (isEditingActions) {
          const updated = quickActions.filter(a => a.id !== action.id);
          setQuickActions(updated);
          if (profile && onUpdateProfile) onUpdateProfile({ ...profile, quickActions: updated });
          return;
      }
      if (action.amount && action.amount > 0) {
          setInputValue(`${action.label} ${action.amount}`);
          runAnalysis(`${action.label} ${action.amount}`);
      } else {
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
      setShowActionModal(false);
  };

  const handleConfirm = (shouldNavigate = true) => {
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

    if (finalTransactions.length === 1) onConfirm(finalTransactions[0], shouldNavigate);
    else onConfirm(finalTransactions, shouldNavigate);

    if (!shouldNavigate) {
        // Reset state for new entry
        setParsedItems([]);
        setAnalyzed(false);
        setInputValue("");
        setScanMode(false);
        setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleAnalyze();
    }
  };

  const updateParsedItem = (id: string, field: keyof ParsedItem, value: any) => {
      setParsedItems(items => items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen flex flex-col transition-colors duration-200">
      {/* Top Navbar */}
      <header className="w-full bg-surface-light dark:bg-surface-dark border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3">
        <div className="px-4 flex items-center justify-between max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-4">
             {onBack && (
               <button onClick={onBack} className="p-3 -ml-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <span className="material-symbols-outlined">arrow_back</span>
               </button>
             )}
            <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Nuevo Movimiento</h2>
          </div>
          
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg overflow-x-auto max-w-[150px] scrollbar-hide">
            {CURRENCIES.map(curr => (
               <button
                  key={curr.code}
                  onClick={() => setSelectedCurrency(curr)}
                  className={`px-2 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                     selectedCurrency.code === curr.code 
                     ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' 
                     : 'text-slate-400'
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
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 flex flex-col items-center">
        
        {defaultEventId && (
            <div className="mb-4 w-full text-center">
                <div className="inline-flex bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full text-xs font-bold items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">flight</span>
                    {defaultEventName}
                </div>
            </div>
        )}

        {/* Input Section */}
        {!analyzed && (
            <div className="w-full flex flex-col items-center">
                {/* Input Field - Styled for Mobile */}
                <div className="w-full relative mb-6">
                    <div className="relative bg-surface-light dark:bg-surface-dark shadow-sm rounded-3xl p-4 border border-slate-200 dark:border-slate-700 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 transition-all flex flex-col">
                        <div className="flex w-full">
                            <span className="pt-2 text-lg font-bold text-slate-400 mr-2">{selectedCurrency.symbol}</span>
                            <textarea 
                                ref={inputRef}
                                autoFocus 
                                placeholder={selectedCurrency.code === 'ARS' ? "Ej: Super 25000" : "Ej: Cena 50"} 
                                className="flex-1 bg-transparent border-none text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 text-lg p-2 focus:ring-0 font-medium resize-none min-h-[80px]"
                                style={{ fontSize: '16px' }} // IMPORTANT: Prevents iOS zoom
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={loading}
                            />
                        </div>
                        <div className="flex justify-between mt-2 items-center">
                            <button onClick={triggerFileInput} className="p-3 rounded-full text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <span className="material-symbols-outlined text-[24px]">document_scanner</span>
                            </button>
                            <input type="file" accept="image/*,video/*" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                            
                            <button 
                                onClick={handleAnalyze}
                                disabled={loading || !inputValue}
                                className="h-10 px-5 rounded-full bg-primary hover:bg-blue-600 text-white font-bold shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-70 disabled:grayscale"
                            >
                                {loading && !scanMode ? (
                                <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                                ) : (
                                    <span className="text-sm">Procesar</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick Actions Grid */}
                {selectedCurrency.code === 'ARS' && (
                    <div className="w-full">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Atajos</p>
                            <button 
                                onClick={() => setIsEditingActions(!isEditingActions)}
                                className={`text-xs font-bold ${isEditingActions ? 'text-red-500' : 'text-primary'}`}
                            >
                                {isEditingActions ? 'Listo' : 'Editar'}
                            </button>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                            {quickActions.map((qa) => (
                                <button
                                    key={qa.id}
                                    onClick={() => handleQuickActionClick(qa)}
                                    className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 aspect-square ${
                                        isEditingActions 
                                        ? 'bg-red-50 border-red-200' 
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[24px] mb-1 text-slate-600 dark:text-slate-300">{qa.icon}</span>
                                    <span className="text-[10px] font-bold text-center leading-tight truncate w-full">{qa.label}</span>
                                    {qa.amount && !isEditingActions && <span className="text-[9px] text-slate-400 mt-0.5">${qa.amount}</span>}
                                    
                                    {isEditingActions && (
                                        <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5">
                                            <span className="material-symbols-outlined text-[14px] block">close</span>
                                        </div>
                                    )}
                                </button>
                            ))}
                            <button
                                onClick={() => setShowActionModal(true)}
                                className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-400 aspect-square hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            >
                                <span className="material-symbols-outlined text-[24px]">add</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* Modal: Add Quick Action */}
        {showActionModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
                <div className="bg-white dark:bg-slate-900 w-full max-w-xs rounded-3xl p-6 shadow-2xl">
                    <h3 className="text-base font-bold mb-4 text-center">Nuevo Atajo</h3>
                    <div className="space-y-3">
                        <input 
                            type="text" 
                            placeholder="Nombre" 
                            className="w-full bg-slate-100 dark:bg-slate-800 p-3 rounded-xl outline-none text-sm font-bold"
                            style={{ fontSize: '16px' }}
                            value={newActionLabel}
                            onChange={(e) => setNewActionLabel(e.target.value)}
                        />
                        <input 
                            type="number" 
                            placeholder="Monto (Opcional)" 
                            className="w-full bg-slate-100 dark:bg-slate-800 p-3 rounded-xl outline-none text-sm font-bold"
                            style={{ fontSize: '16px' }}
                            value={newActionAmount}
                            onChange={(e) => setNewActionAmount(e.target.value)}
                        />
                        <div className="flex gap-2 justify-center py-2">
                            {['category', 'local_taxi', 'restaurant', 'shopping_cart', 'coffee'].map(icon => (
                                <button key={icon} onClick={() => setNewActionIcon(icon)} className={`size-8 rounded-full flex items-center justify-center ${newActionIcon === icon ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                    <span className="material-symbols-outlined text-base">{icon}</span>
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                            <button onClick={handleSaveQuickAction} disabled={!newActionLabel} className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-sm">Guardar</button>
                            <button onClick={() => setShowActionModal(false)} className="px-4 py-3 rounded-xl font-bold text-sm text-slate-500 bg-slate-100 dark:bg-slate-800">Cerrar</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Review List */}
        {analyzed && parsedItems.length > 0 && (
          <div className="w-full animate-[fadeIn_0.3s_ease-out]">
            <div className="space-y-3 mb-6">
                {parsedItems.map((item) => (
                    <div key={item.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm relative">
                        <button 
                            onClick={() => parsedItems.length === 1 ? setAnalyzed(false) : setParsedItems(parsedItems.filter(i => i.id !== item.id))}
                            className="absolute -top-2 -right-2 size-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md z-10"
                        >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Descripción</label>
                                <input 
                                    type="text" 
                                    value={item.description} 
                                    onChange={(e) => updateParsedItem(item.id, 'description', e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 rounded-lg px-2 py-2 text-sm font-bold outline-none focus:ring-1 focus:ring-primary"
                                    style={{ fontSize: '16px' }}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Monto ({selectedCurrency.code})</label>
                                <input 
                                    type="number" 
                                    value={item.amount} 
                                    onChange={(e) => updateParsedItem(item.id, 'amount', parseFloat(e.target.value))}
                                    className="w-full bg-slate-50 dark:bg-slate-900 rounded-lg px-2 py-2 text-sm font-bold outline-none focus:ring-1 focus:ring-primary"
                                    style={{ fontSize: '16px' }}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Categoría</label>
                                <input 
                                    type="text" 
                                    value={item.category} 
                                    onChange={(e) => updateParsedItem(item.id, 'category', e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 rounded-lg px-2 py-2 text-sm font-bold outline-none focus:ring-1 focus:ring-primary"
                                    style={{ fontSize: '16px' }}
                                />
                            </div>
                        </div>
                        <div className="mt-2 flex justify-end">
                             <button 
                                onClick={() => updateParsedItem(item.id, 'type', item.type === 'expense' ? 'income' : 'expense')}
                                className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${item.type === 'expense' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}
                            >
                                {item.type === 'expense' ? 'Gasto' : 'Ingreso'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            <button 
                onClick={() => handleConfirm(false)}
                className="w-full bg-primary hover:bg-blue-600 text-white rounded-2xl h-14 text-lg font-bold shadow-xl shadow-blue-500/30 transition-transform active:scale-95 flex items-center justify-center gap-2 mb-3"
            >
                <span className="material-symbols-outlined text-2xl">add_circle</span>
                Guardar y Agregar Otro
            </button>

            <button 
                onClick={() => handleConfirm(true)}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl h-12 text-sm font-bold transition-all hover:bg-slate-200 dark:hover:bg-slate-700 mb-4"
            >
                Guardar y Salir
            </button>
            
            <button 
                onClick={() => { setAnalyzed(false); setScanMode(false); setInputValue(''); setParsedItems([]); }}
                className="w-full text-slate-400 text-sm font-medium py-2"
            >
                Cancelar
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default TransactionInput;
