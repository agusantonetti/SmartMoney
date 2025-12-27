
import React, { useState, useMemo } from 'react';
import { FinancialProfile } from '../types';

interface Props {
  profile: FinancialProfile;
  freeBalance: number;
  onUpdateProfile: (profile: FinancialProfile) => void;
  onBack: () => void;
}

interface TransferOption {
  id: string;
  name: string;
  currentAmount: number;
  type: 'MAIN' | 'BUCKET';
  icon: string;
}

const BudgetAdjust: React.FC<Props> = ({ profile, freeBalance, onUpdateProfile, onBack }) => {
  const [amount, setAmount] = useState('');
  const [sourceId, setSourceId] = useState<string>('main');
  const [destinationId, setDestinationId] = useState<string>('');

  // 1. Construir lista de opciones dinámicas
  const options: TransferOption[] = useMemo(() => {
    const main: TransferOption = {
      id: 'main',
      name: 'Saldo Disponible',
      currentAmount: freeBalance,
      type: 'MAIN',
      icon: 'account_balance_wallet'
    };

    const buckets: TransferOption[] = (profile.savingsBuckets || []).map(b => ({
      id: b.id,
      name: b.name,
      currentAmount: b.currentAmount,
      type: 'BUCKET',
      icon: b.icon || 'folder'
    }));

    return [main, ...buckets];
  }, [profile, freeBalance]);

  const sourceOption = options.find(o => o.id === sourceId);
  const destinationOption = options.find(o => o.id === destinationId);

  // Filtrar destinos válidos (no puede ser el mismo que origen)
  const validDestinations = options.filter(o => o.id !== sourceId);

  // LOGIC: Transferencia
  const handleTransfer = () => {
    const val = parseFloat(amount);
    if (!val || val <= 0 || !sourceOption || !destinationOption) return;
    if (val > sourceOption.currentAmount) {
        alert("Fondos insuficientes en el origen.");
        return;
    }

    let updatedBuckets = [...(profile.savingsBuckets || [])];

    // 1. Restar del origen
    if (sourceOption.type === 'BUCKET') {
        updatedBuckets = updatedBuckets.map(b => 
            b.id === sourceOption.id ? { ...b, currentAmount: b.currentAmount - val } : b
        );
    }
    // Si el origen es MAIN, no tocamos buckets todavía, simplemente significa que vamos a agregar a un bucket y esto
    // reducirá el "freeBalance" automáticamente en App.tsx porque aumentará el "totalReserved".

    // 2. Sumar al destino
    if (destinationOption.type === 'BUCKET') {
        updatedBuckets = updatedBuckets.map(b => 
            b.id === destinationOption.id ? { ...b, currentAmount: b.currentAmount + val } : b
        );
    }
    // Si el destino es MAIN, no tocamos buckets (ya restamos del bucket origen arriba), 
    // lo que reduce el "totalReserved", aumentando automáticamente el "freeBalance".

    onUpdateProfile({ ...profile, savingsBuckets: updatedBuckets });
    
    // Reset or Go Back
    setAmount('');
    onBack();
  };

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-lg font-bold">Mover Dinero</h2>
        </div>
      </div>

      <div className="flex-1 w-full max-w-lg mx-auto p-6 flex flex-col gap-6">
        
        {/* Intro Text */}
        <div className="text-center mb-4">
           <p className="text-slate-500 dark:text-slate-400 text-sm">
             Transfiere dinero entre tu saldo libre y tus apartados fácilmente.
           </p>
        </div>

        {/* FROM CARD */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 relative group focus-within:ring-2 focus-within:ring-primary/50 transition-all">
           <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Desde (Origen)</label>
           
           <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                 <span className="material-symbols-outlined">{sourceOption?.icon || 'wallet'}</span>
              </div>
              <select 
                 value={sourceId} 
                 onChange={(e) => {
                    setSourceId(e.target.value);
                    if (e.target.value === destinationId) setDestinationId(''); // Reset dest if same
                 }}
                 className="flex-1 bg-transparent text-lg font-bold text-slate-900 dark:text-white outline-none cursor-pointer appearance-none"
              >
                 {options.map(opt => (
                    <option key={opt.id} value={opt.id} className="text-slate-900 bg-white dark:bg-slate-800">
                       {opt.name} ({formatMoney(opt.currentAmount)})
                    </option>
                 ))}
              </select>
              <span className="material-symbols-outlined text-slate-400 pointer-events-none absolute right-4">expand_more</span>
           </div>
           <div className="mt-2 text-right">
              <span className="text-xs text-slate-500">Disponible: <span className="font-bold text-emerald-500">{formatMoney(sourceOption?.currentAmount || 0)}</span></span>
           </div>
        </div>

        {/* ARROW INDICATOR */}
        <div className="flex justify-center -my-3 z-10">
           <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-full border-4 border-white dark:border-background-dark shadow-sm">
              <span className="material-symbols-outlined text-slate-400">arrow_downward</span>
           </div>
        </div>

        {/* TO CARD */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 relative group focus-within:ring-2 focus-within:ring-primary/50 transition-all">
           <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Hacia (Destino)</label>
           
           <div className="flex items-center gap-3">
              <div className={`size-10 rounded-full flex items-center justify-center ${destinationId ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'}`}>
                 <span className="material-symbols-outlined">{destinationOption?.icon || 'input'}</span>
              </div>
              <select 
                 value={destinationId} 
                 onChange={(e) => setDestinationId(e.target.value)}
                 className="flex-1 bg-transparent text-lg font-bold text-slate-900 dark:text-white outline-none cursor-pointer appearance-none"
              >
                 <option value="" disabled className="text-slate-400">Seleccionar destino...</option>
                 {validDestinations.map(opt => (
                    <option key={opt.id} value={opt.id} className="text-slate-900 bg-white dark:bg-slate-800">
                       {opt.name}
                    </option>
                 ))}
              </select>
              <span className="material-symbols-outlined text-slate-400 pointer-events-none absolute right-4">expand_more</span>
           </div>
           {destinationOption && (
             <div className="mt-2 text-right">
                <span className="text-xs text-slate-500">Actual: <span className="font-bold">{formatMoney(destinationOption.currentAmount)}</span></span>
             </div>
           )}
        </div>

        {/* AMOUNT INPUT */}
        <div className="mt-4">
           <label className="text-center text-xs font-bold text-slate-400 uppercase mb-4 block">Monto a Transferir</label>
           <div className="relative flex justify-center items-center">
              <span className="text-4xl font-bold text-slate-300 mr-2">$</span>
              <input 
                 type="number" 
                 value={amount}
                 onChange={(e) => setAmount(e.target.value)}
                 placeholder="0"
                 className="w-full max-w-[200px] bg-transparent text-center text-5xl font-black text-slate-900 dark:text-white outline-none placeholder-slate-200"
                 autoFocus
              />
           </div>
        </div>

        {/* QUICK PERCENTAGES */}
        <div className="flex justify-center gap-3 mt-2">
           <button onClick={() => setAmount(Math.floor((sourceOption?.currentAmount || 0) * 0.1).toString())} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700">10%</button>
           <button onClick={() => setAmount(Math.floor((sourceOption?.currentAmount || 0) * 0.5).toString())} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700">50%</button>
           <button onClick={() => setAmount((sourceOption?.currentAmount || 0).toString())} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700">Todo</button>
        </div>

        {/* CONFIRM BUTTON */}
        <div className="mt-auto">
           <button 
              onClick={handleTransfer}
              disabled={!amount || !destinationId || parseFloat(amount) <= 0 || parseFloat(amount) > (sourceOption?.currentAmount || 0)}
              className="w-full py-4 rounded-xl bg-primary text-white font-bold text-lg shadow-lg shadow-primary/30 hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
           >
              <span>Confirmar Transferencia</span>
              <span className="material-symbols-outlined">check_circle</span>
           </button>
        </div>

      </div>
    </div>
  );
};

export default BudgetAdjust;
