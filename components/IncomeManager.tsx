
import React, { useState, useMemo } from 'react';
import { FinancialProfile, IncomeSource, IncomePayment, PaymentFrequency } from '../types';

interface Props {
  profile: FinancialProfile;
  transactions: any[];
  onUpdateProfile: (profile: FinancialProfile) => void;
  onBack: () => void;
  privacyMode?: boolean;
}

const IncomeManager: React.FC<Props> = ({ profile, onUpdateProfile, onBack, privacyMode }) => {
  const [sources, setSources] = useState<IncomeSource[]>(profile.incomeSources || []);
  
  // States for adding/editing
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<PaymentFrequency>('MONTHLY');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(''); // Empty string = Indefinite
  const [isEndDateEnabled, setIsEndDateEnabled] = useState(false);

  // States for viewing details
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());

  // --- HELPERS ---
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const isContractActive = (src: IncomeSource, targetDate: Date = new Date()) => {
      // Si está archivado manualmente
      if (src.isActive === false) return false;

      const start = src.startDate ? new Date(src.startDate) : new Date(0); // Si no hay fecha, asumimos siempre activo desde inicio
      const end = src.endDate ? new Date(src.endDate) : null;
      
      // Normalizar horas
      targetDate.setHours(0,0,0,0);
      start.setHours(0,0,0,0);
      if (end) end.setHours(23,59,59,999);

      if (targetDate < start) return false; // Aún no empieza
      if (end && targetDate > end) return false; // Ya terminó

      return true;
  };

  // Calcular el ingreso MENSUAL proyectado de una fuente (normalizando quincenal, etc)
  const getMonthlyProjection = (src: IncomeSource) => {
      if (!isContractActive(src)) return 0;

      if (src.frequency === 'BIWEEKLY') return src.amount * 2;
      if (src.frequency === 'ONE_TIME') return 0; // No suma al flujo mensual regular, es un bono
      return src.amount; // MONTHLY
  };

  const totalMonthlyProjected = useMemo(() => {
      return sources.reduce((acc, src) => acc + getMonthlyProjection(src), 0);
  }, [sources]);

  // --- CRUD LOGIC ---
  const handleSaveSource = () => {
      if (!name || !amount) return;

      const newSource: IncomeSource = {
          id: Date.now().toString(),
          name,
          amount: parseFloat(amount),
          frequency,
          startDate,
          endDate: isEndDateEnabled ? endDate : undefined,
          isActive: true,
          payments: [],
          type: 'FIXED' // Default type for compatibility
      };

      const updated = [...sources, newSource];
      setSources(updated);
      onUpdateProfile({ ...profile, incomeSources: updated });
      
      resetForm();
  };

  const resetForm = () => {
      setName('');
      setAmount('');
      setFrequency('MONTHLY');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setIsEndDateEnabled(false);
      setIsAdding(false);
  };

  const handleDelete = (id: string) => {
      if (confirm('¿Eliminar este contrato? Se perderá el historial de cobros.')) {
          const updated = sources.filter(s => s.id !== id);
          setSources(updated);
          onUpdateProfile({ ...profile, incomeSources: updated });
          if (selectedSourceId === id) setSelectedSourceId(null);
      }
  };

  const handleUpdatePayment = (sourceId: string, payment: IncomePayment) => {
      const srcIdx = sources.findIndex(s => s.id === sourceId);
      if (srcIdx === -1) return;
      
      const src = sources[srcIdx];
      const newPayments = [...src.payments];
      const existIdx = newPayments.findIndex(p => p.month === payment.month);

      if (existIdx >= 0) {
          newPayments[existIdx] = payment;
      } else {
          newPayments.push(payment);
      }

      const updatedSrc = { ...src, payments: newPayments };
      const updatedSources = [...sources];
      updatedSources[srcIdx] = updatedSrc;
      
      setSources(updatedSources);
      onUpdateProfile({ ...profile, incomeSources: updatedSources });
  };

  // --- RENDER DETAIL VIEW ---
  const selectedSource = sources.find(s => s.id === selectedSourceId);
  
  if (selectedSource) {
      const monthsList = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      
      return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
            <div className="sticky top-0 z-20 bg-surface-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedSourceId(null)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div>
                        <h2 className="text-lg font-bold leading-none">{selectedSource.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                selectedSource.frequency === 'BIWEEKLY' ? 'bg-purple-100 text-purple-600' :
                                selectedSource.frequency === 'ONE_TIME' ? 'bg-orange-100 text-orange-600' :
                                'bg-blue-100 text-blue-600'
                            }`}>
                                {selectedSource.frequency === 'BIWEEKLY' ? 'Quincenal' : selectedSource.frequency === 'ONE_TIME' ? 'Proyecto Único' : 'Mensual'}
                            </span>
                            <span className="text-xs text-slate-500">
                                {selectedSource.endDate ? `Hasta: ${selectedSource.endDate}` : 'Indefinido'}
                            </span>
                        </div>
                    </div>
                </div>
                <button onClick={() => handleDelete(selectedSource.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-full">
                    <span className="material-symbols-outlined">delete</span>
                </button>
            </div>

            <div className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-6 space-y-6 pb-24">
                {/* Year Selector */}
                <div className="flex items-center justify-center gap-6 bg-surface-light dark:bg-surface-dark p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <button onClick={() => setViewYear(viewYear - 1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><span className="material-symbols-outlined">chevron_left</span></button>
                    <span className="text-xl font-black">{viewYear}</span>
                    <button onClick={() => setViewYear(viewYear + 1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><span className="material-symbols-outlined">chevron_right</span></button>
                </div>

                <div className="space-y-3">
                    {monthsList.map((monthName, idx) => {
                        const monthKey = `${viewYear}-${String(idx + 1).padStart(2, '0')}`;
                        const payment = selectedSource.payments.find(p => p.month === monthKey);
                        
                        // Check if active in this month
                        const checkDate = new Date(viewYear, idx, 15); // Middle of month
                        const isActive = isContractActive(selectedSource, checkDate);

                        const currentVal = payment?.realAmount ?? 0;
                        const isPaid = payment?.isPaid || false;

                        // Calculate expected total for this month based on frequency
                        const expected = selectedSource.frequency === 'BIWEEKLY' ? selectedSource.amount * 2 : selectedSource.amount;

                        return (
                            <div key={monthName} className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
                                !isActive ? 'opacity-40 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900' :
                                isPaid ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' :
                                'bg-surface-light dark:bg-surface-dark border-slate-200 dark:border-slate-700'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`size-10 rounded-full flex items-center justify-center font-bold text-xs ${isActive ? 'bg-slate-200 dark:bg-slate-700' : 'bg-slate-100 text-slate-300'}`}>
                                        {monthName.substring(0, 3)}
                                    </div>
                                    <div>
                                        <span className="font-bold block">{monthName}</span>
                                        {!isActive && <span className="text-[10px] text-slate-400">Fuera de contrato</span>}
                                        {isActive && selectedSource.frequency === 'BIWEEKLY' && <span className="text-[10px] text-purple-500 font-bold">2 Pagos de {formatMoney(selectedSource.amount)}</span>}
                                    </div>
                                </div>

                                {isActive && (
                                    <div className="flex items-center gap-2">
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">Recibido</p>
                                            <input 
                                                type="number" 
                                                className={`w-24 bg-transparent text-right font-bold outline-none border-b border-dashed border-slate-300 focus:border-primary ${privacyMode ? 'blur-sm' : ''}`}
                                                placeholder={expected.toString()}
                                                value={currentVal || ''}
                                                onChange={(e) => handleUpdatePayment(selectedSource.id, {
                                                    month: monthKey, realAmount: parseFloat(e.target.value), isPaid
                                                })}
                                            />
                                        </div>
                                        <button 
                                            onClick={() => handleUpdatePayment(selectedSource.id, { 
                                                month: monthKey, 
                                                realAmount: currentVal || expected, 
                                                isPaid: !isPaid 
                                            })} 
                                            className={`size-10 rounded-full flex items-center justify-center transition-all ${isPaid ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 hover:bg-slate-300'}`}
                                        >
                                            <span className="material-symbols-outlined">{isPaid ? 'check' : 'attach_money'}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      );
  }

  // --- RENDER MAIN LIST ---
  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      <div className="sticky top-0 z-10 bg-surface-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold">Gestión de Contratos</h2>
      </div>

      <div className="flex-1 w-full max-w-4xl mx-auto p-6 space-y-8 pb-24">
        
        {/* TOTAL PROJECTION CARD */}
        <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="relative z-10 flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-2 mb-1 opacity-80">
                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                        <span className="text-xs font-bold uppercase tracking-widest">Proyección Este Mes</span>
                    </div>
                    <h1 className={`text-4xl font-black tracking-tight ${privacyMode ? 'blur-md select-none opacity-50' : ''}`}>
                        {formatMoney(totalMonthlyProjected)}
                    </h1>
                </div>
                <button 
                    onClick={() => setIsAdding(true)} 
                    className="bg-white/20 dark:bg-black/10 hover:bg-white/30 p-3 rounded-full backdrop-blur-md transition-all"
                >
                    <span className="material-symbols-outlined">add</span>
                </button>
            </div>
        </div>

        {/* TIMELINE VISUALIZATION (GANTT) */}
        {sources.length > 0 && (
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Línea de Tiempo (Activos)</h3>
                <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-700 p-4 overflow-x-auto scrollbar-hide shadow-sm">
                    <div className="min-w-[600px]">
                        {/* Month Headers */}
                        <div className="flex mb-4">
                            <div className="w-32 shrink-0"></div>
                            {Array.from({length: 6}).map((_, i) => {
                                const d = new Date();
                                d.setMonth(d.getMonth() + i);
                                return (
                                    <div key={i} className="flex-1 text-center text-[10px] font-bold text-slate-400 uppercase">
                                        {d.toLocaleDateString('es-ES', { month: 'short' })}
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Contracts */}
                        <div className="space-y-3">
                            {sources.filter(s => isContractActive(s)).map(src => {
                                // Calculate visualization
                                // This is a simplified visualizer for the next 6 months
                                return (
                                    <div key={src.id} className="flex items-center group">
                                        <div className="w-32 shrink-0 pr-4">
                                            <p className="font-bold text-xs truncate">{src.name}</p>
                                            <p className="text-[10px] text-slate-500">{src.frequency === 'BIWEEKLY' ? 'Quincenal' : 'Mensual'}</p>
                                        </div>
                                        <div className="flex-1 flex gap-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                                            {/* Bar logic: Check active status for next 6 months */}
                                            {Array.from({length: 6}).map((_, i) => {
                                                const d = new Date();
                                                d.setDate(15); // check middle of month
                                                d.setMonth(d.getMonth() + i);
                                                const active = isContractActive(src, d);
                                                
                                                let colorClass = 'bg-slate-100 dark:bg-slate-800';
                                                if (active) {
                                                    if (src.frequency === 'BIWEEKLY') colorClass = 'bg-purple-400';
                                                    else if (src.frequency === 'ONE_TIME') colorClass = 'bg-orange-400';
                                                    else colorClass = 'bg-blue-500';
                                                }

                                                return (
                                                    <div key={i} className={`flex-1 ${colorClass} transition-colors opacity-80`}></div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* ADD NEW SOURCE FORM */}
        {isAdding && (
            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl animate-[fadeIn_0.2s_ease-out]">
                <h3 className="font-bold text-lg mb-4">Nuevo Contrato / Ingreso</h3>
                
                <div className="grid gap-4">
                    {/* Name & Amount */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Nombre / Cliente</label>
                            <input 
                                type="text" 
                                className="w-full bg-slate-100 dark:bg-slate-900 p-3 rounded-xl outline-none font-bold text-sm"
                                placeholder="Ej. Startup X"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Monto (Por pago)</label>
                            <input 
                                type="number" 
                                className="w-full bg-slate-100 dark:bg-slate-900 p-3 rounded-xl outline-none font-bold text-sm"
                                placeholder="0"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Frequency */}
                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Frecuencia de Pago</label>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setFrequency('MONTHLY')} 
                                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${frequency === 'MONTHLY' ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                            >
                                Mensual (Fijo)
                            </button>
                            <button 
                                onClick={() => setFrequency('BIWEEKLY')} 
                                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${frequency === 'BIWEEKLY' ? 'bg-purple-50 border-purple-500 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                            >
                                Quincenal (X/Tw)
                            </button>
                            <button 
                                onClick={() => setFrequency('ONE_TIME')} 
                                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${frequency === 'ONE_TIME' ? 'bg-orange-50 border-orange-500 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                            >
                                Único (Proyecto)
                            </button>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Inicio Contrato</label>
                            <input 
                                type="date" 
                                className="w-full bg-slate-100 dark:bg-slate-900 p-3 rounded-xl outline-none font-bold text-sm"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="text-[10px] uppercase font-bold text-slate-400 block">Fin Contrato</label>
                                <div className="flex items-center gap-1">
                                    <input type="checkbox" checked={isEndDateEnabled} onChange={e => setIsEndDateEnabled(e.target.checked)} className="size-3 accent-primary" />
                                    <span className="text-[10px] text-slate-500">Definir</span>
                                </div>
                            </div>
                            <input 
                                type="date" 
                                disabled={!isEndDateEnabled}
                                className={`w-full bg-slate-100 dark:bg-slate-900 p-3 rounded-xl outline-none font-bold text-sm transition-opacity ${!isEndDateEnabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button onClick={handleSaveSource} disabled={!name || !amount} className="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-lg disabled:opacity-50">Guardar Contrato</button>
                        <button onClick={() => setIsAdding(false)} className="px-6 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold rounded-xl">Cancelar</button>
                    </div>
                </div>
            </div>
        )}

        {/* LIST OF SOURCES */}
        <div className="space-y-4">
            {sources.map(src => {
                const isActive = isContractActive(src);
                const isBiweekly = src.frequency === 'BIWEEKLY';
                
                return (
                    <div 
                        key={src.id} 
                        onClick={() => setSelectedSourceId(src.id)}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-md relative overflow-hidden group ${
                            isActive 
                            ? 'bg-surface-light dark:bg-surface-dark border-slate-200 dark:border-slate-700' 
                            : 'bg-slate-50 dark:bg-slate-900/50 border-transparent opacity-60 hover:opacity-100'
                        }`}
                    >
                        {/* Status Stripe */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>

                        <div className="flex justify-between items-start pl-3">
                            <div>
                                <h4 className="font-bold text-lg text-slate-900 dark:text-white">{src.name}</h4>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                        src.frequency === 'BIWEEKLY' ? 'bg-purple-100 text-purple-600' : 
                                        src.frequency === 'ONE_TIME' ? 'bg-orange-100 text-orange-600' : 
                                        'bg-blue-100 text-blue-600'
                                    }`}>
                                        {src.frequency === 'BIWEEKLY' ? 'Quincenal' : src.frequency === 'ONE_TIME' ? 'Proyecto' : 'Mensual'}
                                    </span>
                                    {!isActive && <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-600 font-bold uppercase">Inactivo</span>}
                                    {isActive && src.endDate && (
                                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[10px]">event_busy</span>
                                            Fin: {src.endDate}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`font-black text-lg text-slate-900 dark:text-white transition-all duration-300 ${privacyMode ? 'blur-sm select-none' : ''}`}>
                                    {formatMoney(src.amount)}
                                </p>
                                {isBiweekly && isActive && (
                                    <p className="text-[10px] text-slate-400">Total Mes: {formatMoney(src.amount * 2)}</p>
                                )}
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

export default IncomeManager;
