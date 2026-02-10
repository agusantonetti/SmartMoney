import React, { useState, useMemo } from 'react';
import { FinancialProfile, TravelEvent, Transaction } from '../types';

interface Props {
  profile: FinancialProfile;
  transactions: Transaction[];
  onUpdateProfile: (profile: FinancialProfile) => void;
  onUpdateTransactions: (transactions: Transaction[]) => void;
  onAddTransactionToEvent: (eventId: string, eventName: string) => void;
  onBack: () => void;
}

const EventManager: React.FC<Props> = ({ profile, transactions, onUpdateProfile, onUpdateTransactions, onAddTransactionToEvent, onBack }) => {
  const [events, setEvents] = useState<TravelEvent[]>(profile.events || []);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  // Create New Event State
  const [isAdding, setIsAdding] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventBudget, setNewEventBudget] = useState('');

  // --- LOGIC ---
  const handleAddEvent = () => {
    if (!newEventName) return;
    
    const newEvent: TravelEvent = {
        id: Date.now().toString(),
        name: newEventName,
        startDate: new Date().toISOString(),
        status: 'active',
        budget: parseFloat(newEventBudget) || 0
    };

    const updatedEvents = [...events, newEvent];
    setEvents(updatedEvents);
    onUpdateProfile({ ...profile, events: updatedEvents });
    setIsAdding(false);
    setNewEventName('');
    setNewEventBudget('');
  };

  const handleFinishEvent = (eventId: string) => {
      const updatedEvents = events.map(e => e.id === eventId ? { ...e, status: 'completed' as const } : e);
      setEvents(updatedEvents);
      onUpdateProfile({ ...profile, events: updatedEvents });
  };

  const handleDeleteTransaction = (txId: string) => {
      if (window.confirm("¿Estás seguro de eliminar este gasto del viaje?")) {
          const updatedTransactions = transactions.filter(t => t.id !== txId);
          onUpdateTransactions(updatedTransactions);
      }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatUSD = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // --- DETAIL VIEW LOGIC ---
  const selectedEvent = events.find(e => e.id === selectedEventId);
  
  const eventTransactions = useMemo(() => {
      if (!selectedEventId) return [];
      return transactions.filter(t => t.eventId === selectedEventId).sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedEventId, transactions]);

  // CÁLCULO MEJORADO DE GASTOS
  const eventStats = useMemo(() => {
      const dollarRate = profile.customDollarRate || 1130;
      
      let totalArsSystem = 0; // Suma de amounts en BD (siempre en ARS)
      let realUsdSpent = 0;   // Suma de originalAmount cuando es USD
      let realArsSpent = 0;   // Suma de amount cuando NO es USD
      
      const categoryTotals: Record<string, number> = {};

      eventTransactions.filter(t => t.type === 'expense').forEach(t => {
          // 1. Total Sistema (Para barra de progreso vs presupuesto en ARS)
          totalArsSystem += t.amount;

          // 2. Desglose Real (Transparencia)
          if (t.originalCurrency === 'USD') {
              realUsdSpent += (t.originalAmount || 0);
          } else {
              // Si es ARS u otra moneda convertida a ARS
              realArsSpent += t.amount;
          }

          // 3. Categorías (Usamos valor sistema unificado)
          categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      });

      // Total combinado estimado en USD
      // (Dólares reales) + (Pesos convertidos al valor de hoy)
      const totalEquivalentUsd = realUsdSpent + (realArsSpent / dollarRate);

      // Ordenar categorías
      const sortedCategories = Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b - a)
        .map(([name, value]) => ({ name, value, percent: (value / totalArsSystem) * 100 }));

      return {
          totalArsSystem,
          realUsdSpent,
          realArsSpent,
          totalEquivalentUsd,
          sortedCategories
      };
  }, [eventTransactions, profile.customDollarRate]);


  // --- RENDER ---

  if (selectedEvent) {
      // VISTA DETALLE DEL VIAJE
      const progress = selectedEvent.budget && selectedEvent.budget > 0 
        ? Math.min(100, (eventStats.totalArsSystem / selectedEvent.budget) * 100) 
        : 0;
      
      const dollarRate = profile.customDollarRate || 1130;

      return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
            <div className="sticky top-0 z-20 bg-surface-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedEventId(null)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div>
                        <h2 className="text-lg font-bold leading-none">{selectedEvent.name}</h2>
                        <p className="text-xs text-slate-500">
                            {selectedEvent.status === 'active' ? 'En curso' : 'Finalizado'} • {eventTransactions.length} items
                        </p>
                    </div>
                </div>
                {selectedEvent.status === 'active' && (
                    <button 
                        onClick={() => handleFinishEvent(selectedEvent.id)}
                        className="text-xs font-bold text-slate-400 hover:text-red-500 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full transition-colors"
                    >
                        Finalizar
                    </button>
                )}
            </div>

            <div className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-6 pb-24 space-y-6">
                
                {/* Header Stats Card */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 size-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-2">Total Consolidado</p>
                        
                        {/* Precios Principales */}
                        <div className="flex flex-col items-center gap-1 mb-4">
                            <h1 className="text-5xl font-black">{formatUSD(Math.round(eventStats.totalEquivalentUsd))}</h1>
                            <p className="text-sm font-medium opacity-70">
                                ≈ {formatMoney(eventStats.totalArsSystem)}
                            </p>
                        </div>
                        
                        {/* Barra de Presupuesto */}
                        {selectedEvent.budget && selectedEvent.budget > 0 && (
                            <div className="w-full max-w-xs bg-black/20 rounded-full h-2 mb-2 overflow-hidden">
                                <div className={`h-full ${progress > 100 ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: `${progress}%` }}></div>
                            </div>
                        )}
                        {selectedEvent.budget && selectedEvent.budget > 0 && (
                            <p className="text-xs text-indigo-200">
                                {progress > 100 
                                    ? `Excedido por ${formatMoney(eventStats.totalArsSystem - selectedEvent.budget)}` 
                                    : `Disponibles: ${formatMoney(selectedEvent.budget - eventStats.totalArsSystem)}`}
                            </p>
                        )}

                        {/* Desglose de Moneda Real */}
                        <div className="mt-6 flex gap-2 w-full justify-center">
                            <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10 flex flex-col items-center min-w-[100px]">
                                <span className="text-[10px] text-indigo-200 uppercase font-bold">Gastado en USD</span>
                                <span className="font-bold text-lg">{formatUSD(eventStats.realUsdSpent)}</span>
                            </div>
                            <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10 flex flex-col items-center min-w-[100px]">
                                <span className="text-[10px] text-indigo-200 uppercase font-bold">Gastado en ARS</span>
                                <span className="font-bold text-lg">{formatMoney(eventStats.realArsSpent)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Categorías Breakdown */}
                {eventStats.sortedCategories.length > 0 && (
                    <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm animate-[fadeIn_0.2s_ease-out]">
                        <h3 className="font-bold text-sm mb-4 uppercase tracking-wider text-slate-500">Distribución</h3>
                        <div className="space-y-3">
                            {eventStats.sortedCategories.map((cat) => (
                                <div key={cat.name} className="flex items-center gap-3 text-sm">
                                    <div className="w-24 truncate font-bold text-slate-700 dark:text-slate-300">{cat.name}</div>
                                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary" style={{ width: `${cat.percent}%` }}></div>
                                    </div>
                                    <div className="w-20 text-right font-medium text-slate-500 text-xs">
                                        {formatUSD(cat.value / dollarRate)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Add Button */}
                {selectedEvent.status === 'active' && (
                    <button 
                        onClick={() => onAddTransactionToEvent(selectedEvent.id, selectedEvent.name)}
                        className="w-full bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-4 flex items-center justify-center gap-2 text-slate-500 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all group"
                    >
                        <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-colors">
                            <span className="material-symbols-outlined text-lg">add</span>
                        </div>
                        <span className="font-bold">Agregar Gasto al Viaje</span>
                    </button>
                )}

                {/* List */}
                <div className="space-y-3">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider">Historial</h3>
                    {eventTransactions.length === 0 ? (
                        <p className="text-center text-slate-400 py-8 text-sm">No hay gastos registrados en este viaje aún.</p>
                    ) : (
                        eventTransactions.map(tx => (
                            <div key={tx.id} className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between group">
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-900 dark:text-white">{tx.description}</span>
                                    <div className="flex gap-2 text-xs text-slate-500">
                                        <span>{tx.date}</span>
                                        <span>•</span>
                                        <span>{tx.category}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        {/* Show Original Currency prominently if it's USD */}
                                        {tx.originalCurrency === 'USD' ? (
                                            <>
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400 block">{formatUSD(tx.originalAmount || 0)}</span>
                                                <span className="text-[10px] text-slate-400 block">
                                                    ({formatMoney(tx.amount)})
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="font-bold text-slate-900 dark:text-white block">{formatMoney(tx.amount)}</span>
                                                <span className="text-[10px] text-slate-400 block">
                                                    (US$ {Math.round(tx.amount / dollarRate)})
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    
                                    {selectedEvent.status === 'active' && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteTransaction(tx.id);
                                            }}
                                            className="size-8 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                                            title="Eliminar"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      );
  }

  // VISTA LISTA DE VIAJES
  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      <div className="sticky top-0 z-10 bg-surface-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="text-lg font-bold leading-tight">Mis Viajes y Eventos</h2>
          <p className="text-xs text-slate-500">Gestiona presupuestos específicos</p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto p-6 space-y-6 pb-24">
        
        {!isAdding && (
            <button 
                onClick={() => setIsAdding(true)}
                className="w-full bg-primary hover:bg-blue-600 text-white font-bold p-4 rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all"
            >
                <span className="material-symbols-outlined">flight</span>
                Crear Nuevo Viaje
            </button>
        )}

        {isAdding && (
            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl animate-[fadeIn_0.2s_ease-out]">
                <h3 className="font-bold text-lg mb-4">Nuevo Evento</h3>
                <div className="space-y-4">
                    <input 
                        type="text" 
                        placeholder="Nombre (Ej. Taiwán - Dic 2025)"
                        className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                        value={newEventName}
                        onChange={(e) => setNewEventName(e.target.value)}
                        autoFocus
                    />
                    <input 
                        type="number" 
                        placeholder="Presupuesto (Opcional en ARS)"
                        className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                        value={newEventBudget}
                        onChange={(e) => setNewEventBudget(e.target.value)}
                    />
                    <div className="flex gap-3">
                        <button onClick={handleAddEvent} disabled={!newEventName} className="flex-1 bg-primary text-white font-bold py-3 rounded-xl disabled:opacity-50">Crear</button>
                        <button onClick={() => setIsAdding(false)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">Cancelar</button>
                    </div>
                </div>
            </div>
        )}

        <div className="grid gap-4">
            {events.length === 0 && !isAdding && (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl text-slate-400">
                    <span className="material-symbols-outlined text-4xl mb-2">map</span>
                    <p>No tienes viajes registrados.</p>
                </div>
            )}

            {events.map(evt => {
                // Calcular gasto total para la vista previa
                const total = transactions.filter(t => t.eventId === evt.id && t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
                
                return (
                    <div 
                        key={evt.id}
                        onClick={() => setSelectedEventId(evt.id)} 
                        className="bg-surface-light dark:bg-surface-dark p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group relative overflow-hidden"
                    >
                        {/* Status Stripe */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${evt.status === 'active' ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                        
                        <div className="pl-4 flex justify-between items-center">
                            <div>
                                <h4 className={`font-bold text-lg group-hover:text-primary transition-colors ${evt.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-900 dark:text-white'}`}>
                                    {evt.name}
                                </h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    {evt.startDate.split('T')[0]} • Gastado: <span className="font-bold text-slate-700 dark:text-slate-300">{formatMoney(total)}</span>
                                </p>
                            </div>
                            <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
                                <span className="material-symbols-outlined">chevron_right</span>
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

export default EventManager;
