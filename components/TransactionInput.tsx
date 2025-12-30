
import React, { useState, useEffect, useRef } from 'react';
import { Transaction, FinancialProfile, QuickAction } from '../types';
import { GoogleGenAI } from "@google/genai";

interface Props {
  onConfirm: (transaction: Transaction) => void;
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

const TransactionInput: React.FC<Props> = ({ onConfirm, onBack, profile, onUpdateProfile, defaultEventId, defaultEventName }) => {
  const [inputValue, setInputValue] = useState("");
  const [analyzed, setAnalyzed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [scanMode, setScanMode] = useState(false); // Mode to handle image upload
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Quick Action Management State - Inicializamos directamente del perfil
  const [quickActions, setQuickActions] = useState<QuickAction[]>(profile?.quickActions || []);
  const [isEditingActions, setIsEditingActions] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  
  // New Action Form
  const [newActionLabel, setNewActionLabel] = useState('');
  const [newActionAmount, setNewActionAmount] = useState('');
  const [newActionIcon, setNewActionIcon] = useState('category');

  // Sincronizar acciones si el perfil cambia (por ej. tras borrar uno)
  useEffect(() => {
    if (profile?.quickActions) {
        setQuickActions(profile.quickActions);
    }
  }, [profile]);

  // Multi-currency State
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[0]);
  const [customRate, setCustomRate] = useState<string>(""); 

  // State for parsed data
  const [parsedData, setParsedData] = useState<{description: string, amount: number, category: string, type: 'income' | 'expense'} | null>(null);

  useEffect(() => {
    if (selectedCurrency.code === 'ARS') setCustomRate("");
    else setCustomRate(selectedCurrency.rate.toString());
  }, [selectedCurrency]);

  // --- VIDEO FRAME EXTRACTION HELPER ---
  const extractFramesFromVideo = async (videoFile: File, numFrames: number = 5): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const frames: string[] = [];
        
        // Optimize URL handling
        const url = URL.createObjectURL(videoFile);
        video.src = url;
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = "anonymous";

        // Wait for metadata to know duration
        video.onloadedmetadata = async () => {
            const duration = video.duration;
            const interval = duration / (numFrames + 1); // Distribute frames
            
            try {
                for (let i = 1; i <= numFrames; i++) {
                    const time = interval * i;
                    video.currentTime = time;
                    
                    // Wait for seek to complete
                    await new Promise<void>((r) => {
                        const seekHandler = () => {
                            video.removeEventListener('seeked', seekHandler);
                            r();
                        };
                        video.addEventListener('seeked', seekHandler);
                    });

                    // Set canvas dimensions based on video (limit max size for performance)
                    const MAX_WIDTH = 800;
                    const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
                    canvas.width = video.videoWidth * scale;
                    canvas.height = video.videoHeight * scale;

                    if (context) {
                        context.drawImage(video, 0, 0, canvas.width, canvas.height);
                        // Extract base64 without prefix for Gemini
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                        frames.push(dataUrl.split(',')[1]); 
                    }
                }
                URL.revokeObjectURL(url);
                resolve(frames);
            } catch (err) {
                URL.revokeObjectURL(url);
                reject(err);
            }
        };

        video.onerror = (e) => {
             URL.revokeObjectURL(url);
             reject(e);
        };
    });
  };

  // --- AI SCANNING LOGIC (GEMINI) ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setScanMode(true);
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let parts: any[] = [];
        let prompt = "";

        // CHECK IF VIDEO
        if (file.type.startsWith('video/')) {
            setLoadingMessage("Procesando video...");
            const frames = await extractFramesFromVideo(file);
            
            prompt = `
                Analiza esta secuencia de fotogramas de una grabación de pantalla de una app financiera o de servicios (Uber, Didi, Banco, MercadoPago, etc.).
                Busca la transacción principal o el resumen del viaje/compra que se muestra.
                Ignora saldos generales, busca el monto específico de la operación mostrada.
                
                Extrae la siguiente información en formato JSON puro:
                - description: Nombre del comercio, servicio o persona (ej: "Uber Trip", "Supermercado Dia").
                - amount: El monto total de la transacción (número).
                - category: Categoría sugerida.
                - type: "expense" o "income".
                - currency: Moneda detectada (ARS por defecto).
                
                Devuelve SOLO el JSON.
            `;

            // Add all frames to parts
            parts = [
                { text: prompt },
                ...frames.map(frameData => ({
                    inlineData: { mimeType: 'image/jpeg', data: frameData }
                }))
            ];

        } else {
            // IS IMAGE
            setLoadingMessage("Analizando imagen...");
            const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => {
                    const result = reader.result as string;
                    const base64Content = result.split(',')[1];
                    resolve(base64Content);
                };
                reader.onerror = error => reject(error);
            });

            prompt = `
                Analiza esta imagen (recibo, captura de pantalla).
                Extrae en JSON puro:
                - description: Nombre.
                - amount: Monto (número).
                - category: Categoría.
                - type: "expense" | "income".
                - currency: Moneda (ARS default).
                Devuelve SOLO el JSON.
            `;

            parts = [
                { text: prompt },
                { inlineData: { mimeType: file.type, data: base64Data } }
            ];
        }

        // 2. Call Gemini API
        // Using gemini-3-flash-preview as it is powerful for multimodal analysis
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview', 
            contents: [{ role: 'user', parts: parts }]
        });

        const textResponse = response.text;
        
        // Clean markdown
        const jsonStr = textResponse?.replace(/```json/g, '').replace(/```/g, '').trim();
        
        if (jsonStr) {
            const data = JSON.parse(jsonStr);
            setParsedData({
                description: data.description || "Movimiento Detectado",
                amount: parseFloat(data.amount) || 0,
                category: data.category || "Otros",
                type: data.type || "expense"
            });
            
            if (data.currency && data.currency !== 'ARS') {
                const foundCurr = CURRENCIES.find(c => c.code === data.currency);
                if (foundCurr) setSelectedCurrency(foundCurr);
            }
            
            setAnalyzed(true);
        }

    } catch (error) {
        console.error("Error scanning:", error);
        alert("No se pudo analizar el archivo. Intenta ingresar los datos manualmente.");
    } finally {
        setLoading(false);
        setLoadingMessage("");
    }
  };

  const triggerFileInput = () => {
      fileInputRef.current?.click();
  };

  // --- TEXT ANALYSIS LOGIC ---

  const runAnalysis = (text: string) => {
    if (!text) return;
    setLoading(true);
    setLoadingMessage("Procesando...");
    
    setTimeout(() => {
      const parts = text.split(' ');
      let rawAmount = 0;
      let description = text;
      
      // Buscar el último número en la cadena
      for (let i = parts.length - 1; i >= 0; i--) {
        const cleanStr = parts[i].replace(/[$,]/g, ''); 
        const val = parseFloat(cleanStr);
        
        if (!isNaN(val)) {
          rawAmount = val;
          description = parts.filter((_, idx) => idx !== i).join(' ');
          break;
        }
      }

      // Categorización simple
      let category = "Otros";
      let type: 'income' | 'expense' = 'expense'; 
      
      const lowerDesc = description.toLowerCase();
      
      if (lowerDesc.includes('sueldo') || lowerDesc.includes('nomina') || lowerDesc.includes('venta') || lowerDesc.includes('recibiste')) {
         category = "Ingreso";
         type = 'income';
      }
      else if (lowerDesc.includes('uber') || lowerDesc.includes('taxi') || lowerDesc.includes('didi') || lowerDesc.includes('cabify') || lowerDesc.includes('tren') || lowerDesc.includes('nafta')) category = "Transporte";
      else if (lowerDesc.includes('cena') || lowerDesc.includes('almuerzo') || lowerDesc.includes('cafe') || lowerDesc.includes('mcdonalds') || lowerDesc.includes('pedidosya')) category = "Comida";
      else if (lowerDesc.includes('hotel') || lowerDesc.includes('airbnb')) category = "Hospedaje";
      else if (lowerDesc.includes('regalo') || lowerDesc.includes('souvenir') || lowerDesc.includes('super') || lowerDesc.includes('carrefour') || lowerDesc.includes('coto')) category = "Compras";

      setParsedData({ description, amount: rawAmount, category, type });
      setLoading(false);
      setLoadingMessage("");
      setAnalyzed(true);
    }, 600);
  };

  const handleAnalyze = () => {
      runAnalysis(inputValue);
  };

  const handleQuickActionClick = (action: QuickAction) => {
      if (isEditingActions) {
          const updated = quickActions.filter(a => a.id !== action.id);
          setQuickActions(updated);
          if (profile && onUpdateProfile) {
              onUpdateProfile({ ...profile, quickActions: updated });
          }
          return;
      }

      if (action.amount && action.amount > 0) {
          const text = `${action.label} ${action.amount}`;
          setInputValue(text);
          runAnalysis(text);
      } else {
          setInputValue(`${action.label} `);
          if (inputRef.current) {
              inputRef.current.focus();
          }
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
      if (profile && onUpdateProfile) {
          onUpdateProfile({ ...profile, quickActions: updated });
      }
      
      setNewActionLabel('');
      setNewActionAmount('');
      setNewActionIcon('category');
      setShowActionModal(false);
  };

  const handleConfirm = () => {
    if (!parsedData) return;
    
    const rate = parseFloat(customRate) || selectedCurrency.rate;
    const finalAmountBase = parsedData.amount * rate;
    let finalDesc = parsedData.description;
    
    const now = new Date();
    const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000))
                      .toISOString()
                      .split('T')[0];

    const newTx: Transaction = {
      id: Date.now().toString(),
      amount: finalAmountBase,
      description: finalDesc,
      category: parsedData.category,
      type: parsedData.type,
      date: localDate,
      originalCurrency: selectedCurrency.code,
      originalAmount: parsedData.amount,
      exchangeRate: rate,
      eventId: defaultEventId || undefined,
      eventName: defaultEventName || undefined
    };

    onConfirm(newTx);
  };

  const handleTypeToggle = () => {
    if (!parsedData) return;
    setParsedData({
      ...parsedData,
      type: parsedData.type === 'income' ? 'expense' : 'income',
      category: parsedData.type === 'income' ? 'Otros' : 'Ingreso' 
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAnalyze();
  };

  const conversionPreview = parsedData && selectedCurrency.code !== 'ARS' 
    ? (parsedData.amount * (parseFloat(customRate) || selectedCurrency.rate)).toFixed(2) 
    : null;

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
            Nuevo Movimiento {selectedCurrency.code !== 'ARS' && <span className="text-primary">{selectedCurrency.code}</span>}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg md:text-xl font-normal max-w-2xl mx-auto">
            {loading ? (loadingMessage || 'Analizando con IA...') : 'Escribe, escanea un ticket/video o pega un movimiento.'}
          </p>
        </div>

        {/* AI Scanner Button */}
        {!analyzed && (
            <div className="mb-8 w-full max-w-2xl flex justify-center">
                <input 
                    type="file" 
                    accept="image/*,video/*" 
                    ref={fileInputRef} 
                    className="hidden"
                    onChange={handleFileUpload} 
                />
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
                        <span className="text-xs opacity-80">Importar desde Uber, Didi, Prex, MercadoPago</span>
                    </div>
                </button>
            </div>
        )}

        {/* Input Section */}
        <div className="w-full max-w-2xl relative group/input mb-6">
          <div className={`absolute inset-0 bg-primary/5 dark:bg-primary/10 rounded-full blur-xl transform scale-95 opacity-0 group-hover/input:opacity-100 transition-opacity duration-500 ${loading ? 'animate-pulse opacity-100' : ''}`}></div>
          <div className="relative bg-surface-light dark:bg-surface-dark shadow-lg dark:shadow-slate-900/50 rounded-full p-2 flex items-center border border-slate-200 dark:border-slate-700 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 transition-all duration-300">
            <span className="pl-6 text-xl font-bold text-slate-400">{selectedCurrency.symbol}</span>
            <input 
              ref={inputRef}
              autoFocus 
              type="text" 
              placeholder={selectedCurrency.code === 'ARS' ? "O escribe: Super 25000" : "O escribe: Taxi 20"} 
              className="flex-1 bg-transparent border-none text-slate-900 dark:text-white placeholder:text-slate-400 text-xl px-2 py-4 focus:ring-0 rounded-full font-medium" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <div className="flex items-center gap-2 pr-2">
              <button 
                onClick={handleAnalyze}
                disabled={loading || !inputValue}
                className="h-12 px-6 rounded-full bg-primary hover:bg-blue-600 text-white font-medium shadow-md shadow-blue-500/20 transition-all transform hover:scale-105 active:scale-95 hidden sm:flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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

        {/* CUSTOM QUICK ACTIONS (EDITABLE) */}
        {!analyzed && selectedCurrency.code === 'ARS' && (
            <div className="w-full max-w-3xl animate-[fadeIn_0.4s_ease-out] relative">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tus Frecuentes</p>
                    <button 
                        onClick={() => setIsEditingActions(!isEditingActions)}
                        className={`size-6 rounded-full flex items-center justify-center transition-colors ${isEditingActions ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-slate-400 hover:text-primary'}`}
                        title={isEditingActions ? "Salir de edición" : "Editar atajos"}
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
                    
                    {/* Add Button */}
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

        {/* Analysis Results */}
        {analyzed && parsedData && (
          <div className="w-full max-w-2xl mb-12 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex flex-wrap justify-center gap-4">
              
              <button 
                onClick={handleTypeToggle}
                className={`flex items-center gap-3 border rounded-full pl-3 pr-5 py-2 shadow-sm transition-all hover:scale-105 ${
                    parsedData.type === 'income' 
                    ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' 
                    : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                }`}
              >
                <div className={`size-8 rounded-full flex items-center justify-center text-white ${parsedData.type === 'income' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                  <span className="material-symbols-outlined text-[20px]">{parsedData.type === 'income' ? 'arrow_upward' : 'arrow_downward'}</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[10px] uppercase tracking-wider opacity-60 font-bold">Tipo</span>
                  <span className={`text-sm font-bold ${parsedData.type === 'income' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                    {parsedData.type === 'income' ? 'Ingreso' : 'Gasto'}
                  </span>
                </div>
              </button>

              <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full pl-3 pr-5 py-2 shadow-sm">
                <div className="size-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                  <span className="material-symbols-outlined text-[20px]">storefront</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Descripción</span>
                  <input 
                    type="text" 
                    value={parsedData.description}
                    onChange={(e) => setParsedData({...parsedData, description: e.target.value})}
                    className="text-sm font-semibold text-slate-900 dark:text-slate-100 bg-transparent outline-none max-w-[150px]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full pl-3 pr-5 py-2 shadow-sm ring-2 ring-primary/20">
                <div className="size-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                  <span className="material-symbols-outlined text-[20px]">attach_money</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                     Monto {conversionPreview ? '(Conv.)' : ''}
                  </span>
                  <div className="flex items-baseline gap-1">
                     <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {conversionPreview ? `$${conversionPreview} ARS` : `$${parsedData.amount}`}
                     </span>
                     {conversionPreview && (
                        <span className="text-[10px] text-slate-500">
                           ({selectedCurrency.symbol}{parsedData.amount})
                        </span>
                     )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="w-full flex flex-col items-center gap-4 mt-8 mb-4">
              <button 
                onClick={handleConfirm}
                className="group relative flex items-center justify-center gap-3 bg-primary hover:bg-blue-600 text-white rounded-full h-16 px-10 text-lg font-bold shadow-xl shadow-blue-500/20 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-blue-500/40"
              >
                <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">check_circle</span>
                <span>Confirmar Transacción</span>
                <div className="absolute inset-0 rounded-full ring-2 ring-white/20 group-hover:ring-white/40 transition-all"></div>
              </button>
              
              <button 
                onClick={() => { setAnalyzed(false); setScanMode(false); setInputValue(''); }}
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
