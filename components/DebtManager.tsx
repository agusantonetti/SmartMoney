
import React, { useState } from 'react';
import { FinancialProfile, Debt } from '../types';

interface Props {
  profile: FinancialProfile;
  totalBalance: number;
  onUpdateProfile: (profile: FinancialProfile) => void;
  onBack: () => void;
  privacyMode?: boolean;
}

const DebtManager: React.FC<Props> = ({ profile, totalBalance, onUpdateProfile, onBack, privacyMode }) => {
  const [debts, setDebts] = useState<Debt[]>(profile.debts || []);
  const [isAdding, setIsAdding] = useState(false);
  const [showStrategy, setShowStrategy] = useState(false); // New state for Snowball view

  // Form states
  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPaid, setEditPaid] = useState('');

  const totalDebtAmount = debts.reduce((acc, d) => acc + d.totalAmount, 0);
  const totalPaid = debts.reduce((acc, d) => acc + d.currentAmount, 0);
  const remainingDebt = totalDebtAmount - totalPaid;

  // Snowball Sort: Smallest remaining balance first
  const snowballDebts = [...debts].filter(d => (d.totalAmount - d.currentAmount) > 0).sort((a, b) => {
      const remainingA = a.totalAmount - a.currentAmount;
      const remainingB = b.totalAmount - b.currentAmount;
      return remainingA - remainingB;
  });

  const handleAdd = () => {
    if (!name || !totalAmount) return;

    const newDebt: Debt = {
      id: Date.now().toString(),
      name,
      totalAmount: parseFloat(totalAmount),
      currentAmount: parseFloat(currentAmount) || 0,
    };

    const updated = [...debts, newDebt];
    setDebts(updated);
    onUpdateProfile({ ...profile, debts: updated });
    
    setName('');
    setTotalAmount('');
    setCurrentAmount('');
    setIsAdding(false);
  };

  const handleUpdateProgress = (id: string, newCurrent: number) => {
    const updated = debts.map(d => {
      if (d.id === id) return { ...d, currentAmount: newCurrent };
      return d;
    });
    setDebts(updated);
    onUpdateProfile({ ...profile, debts: updated });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const updated = debts.filter(d => d.id !== id);
    setDebts(updated);
    onUpdateProfile({ ...profile, debts: updated });
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { 
      style: 'currency', 
      currency: 'MXN', 
      maximumFractionDigits: 0 
    }).format(amount);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      <div className="sticky top-0 z-10 bg-surface-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold">Deudas e Impuestos</h2>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto p-6 space-y-8 pb-24">
        
        {/* Toggle Strategy View */}
        <div className="flex justify-center">
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-full flex text-sm font-bold">
                <button 
                    onClick={() => setShowStrategy(false)}
                    className={`px-4 py-2 rounded-full transition-all ${!showStrategy ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}
                >
                    Mis Deudas
                </button>
                <button 
                    onClick={() => setShowStrategy(true)}
                    className={`px-4 py-2 rounded-full transition-all flex items-center gap-1 ${showStrategy ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}
                >
                    <span className="material-symbols-outlined text-[16px]">psychology</span>
                    Estrategia
                </button>
            </div>
        </div>

        {/* Summary Card */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 border border-red-200 dark:border-red-900/30 shadow-sm space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          
          <div className="flex justify-between items-end relative z-10">
            <div>
              <p className="text-red-500 text-xs font-bold uppercase tracking-wider mb-1">Total Pendiente por Pagar</p>
              <h1 className={`text-4xl font-black text-slate-900 dark:text-white transition-all duration-300 ${privacyMode ? 'blur-md select-none opacity-50' : ''}`}>{formatMoney(remainingDebt)}</h1>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Deuda Total</p>
              <p className={`text-xl font-bold opacity-60 transition-all duration-300 ${privacyMode ? 'blur-sm select-none' : ''}`}>{formatMoney(totalDebtAmount)}</p>
            </div>
          </div>
          
          <div className="relative z-10">
             <div className="w-full bg-slate-100 dark:bg-slate-800 h-4 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-1000 ease-out" 
                  style={{ width: `${totalDebtAmount > 0 ? (totalPaid / totalDebtAmount) * 100 : 0}%` }}
                ></div>
             </div>
             <div className="flex justify-between mt-2 text-xs font-medium text-slate-500">
               <span className={`transition-all duration-300 ${privacyMode ? 'blur-sm select-none' : ''}`}>Pagado: {formatMoney(totalPaid)}</span>
               <span>{totalDebtAmount > 0 ? Math.round((totalPaid / totalDebtAmount) * 100) : 0}%</span>
             </div>
          </div>
        </div>

        {/* STRATEGY VIEW (SNOWBALL) */}
        {showStrategy ? (
            <div className="animate-[fadeIn_0.3s_ease-out] space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200">
                    <p className="flex items-center gap-2 font-bold mb-1">
                        <span className="material-symbols-outlined">ac_unit</span>
                        Método Bola de Nieve
                    </p>
                    <p className="opacity-80">
                        Ordenamos tus deudas de <strong>menor a mayor</strong> saldo pendiente. Paga el mínimo de todas, y ataca con todo lo extra a la #1. Cuando termines, usa ese dinero para la #2.
                    </p>
                </div>

                {snowballDebts.length === 0 ? (
                    <p className="text-center text-slate-400 py-8">¡No tienes deudas pendientes! ¡Felicidades!</p>
                ) : (
                    <div className="space-y-3">
                        {snowballDebts.map((debt, index) => (
                            <div key={debt.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>
                                <div className="size-8 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center shrink-0">
                                    {index + 1}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold">{debt.name}</h4>
                                    <p className={`text-xs text-slate-500 transition-all duration-300 ${privacyMode ? 'blur-sm select-none' : ''}`}>Te falta: {formatMoney(debt.totalAmount - debt.currentAmount)}</p>
                                </div>
                                {index === 0 && (
                                    <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-1 rounded-full animate-pulse">
                                        ¡ATACA ESTA!
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        ) : (
            // NORMAL VIEW
            <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-red-500">warning</span>
                Obligaciones
                </h3>
                {!isAdding && (
                <button 
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 px-4 py-2 rounded-full transition-colors"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Registrar
                </button>
                )}
            </div>

            {isAdding && (
                <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-3xl border border-red-200 dark:border-red-900/30 shadow-xl animate-[fadeIn_0.2s_ease-out]">
                    <h4 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-500">
                        <span className="material-symbols-outlined">gavel</span>
                        Nueva Deuda
                    </h4>
                    <div className="grid gap-4">
                    <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors material-symbols-outlined">description</span>
                        <input 
                        type="text" 
                        placeholder="Concepto (SAT, Tarjeta, Préstamo)" 
                        className="w-full bg-slate-50 dark:bg-slate-900/50 h-14 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-red-500/50 transition-all font-medium border border-transparent focus:border-red-500/30"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors material-symbols-outlined">attach_money</span>
                        <input 
                            type="number" 
                            placeholder="Total Deuda" 
                            className="w-full bg-slate-50 dark:bg-slate-900/50 h-14 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-red-500/50 transition-all font-bold border border-transparent focus:border-red-500/30"
                            value={totalAmount}
                            onChange={(e) => setTotalAmount(e.target.value)}
                        />
                        </div>
                        <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors material-symbols-outlined">payments</span>
                        <input 
                            type="number" 
                            placeholder="Ya pagado" 
                            className="w-full bg-slate-50 dark:bg-slate-900/50 h-14 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-bold border border-transparent focus:border-emerald-500/30"
                            value={currentAmount}
                            onChange={(e) => setCurrentAmount(e.target.value)}
                        />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                            <button 
                                onClick={handleAdd}
                                disabled={!name || !totalAmount}
                                className="flex-1 bg-red-500 text-white font-bold h-12 rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">check</span>
                                Guardar
                            </button>
                            <button 
                                onClick={() => setIsAdding(false)}
                                className="px-6 h-12 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancelar
                            </button>
                    </div>
                    </div>
                </div>
            )}

            <div className="grid gap-3">
                {debts.length === 0 && !isAdding && (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400">
                    <span className="material-symbols-outlined text-3xl mb-2">check_circle</span>
                    <p className="text-sm">¡Estás libre de deudas! O no las has registrado aún.</p>
                </div>
                )}
                
                {debts.map((debt) => {
                const percentage = (debt.currentAmount / debt.totalAmount) * 100;
                const isEditing = editingId === debt.id;

                return (
                <div key={debt.id} className="bg-surface-light dark:bg-surface-dark p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                    {/* Progress Bar Background */}
                    <div className="absolute bottom-0 left-0 h-1 bg-red-100 dark:bg-red-900/30 w-full">
                        <div className="h-full bg-red-500" style={{ width: `${percentage}%` }}></div>
                    </div>

                    <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center">
                        <span className="material-symbols-outlined">gavel</span>
                        </div>
                        <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{debt.name}</h4>
                        <p className={`text-xs text-slate-500 transition-all duration-300 ${privacyMode ? 'blur-sm select-none' : ''}`}>Total: {formatMoney(debt.totalAmount)}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => {
                            setEditingId(debt.id);
                            setEditPaid(debt.currentAmount.toString());
                            }}
                            className="text-slate-300 hover:text-primary transition-colors"
                        >
                            <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button 
                            onClick={() => handleDelete(debt.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                            <span className="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                    </div>

                    {isEditing ? (
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl flex gap-2 animate-[fadeIn_0.2s_ease-out]">
                        <input 
                            type="number" 
                            value={editPaid}
                            onChange={(e) => setEditPaid(e.target.value)}
                            className="flex-1 bg-white dark:bg-slate-700 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600"
                            placeholder="Nuevo monto pagado/reservado"
                            autoFocus
                        />
                        <button 
                            onClick={() => handleUpdateProgress(debt.id, parseFloat(editPaid) || 0)}
                            className="bg-emerald-500 text-white px-4 rounded-lg font-bold"
                        >
                            OK
                        </button>
                    </div>
                    ) : (
                    <div className="flex justify-between items-end relative z-10">
                        <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Reservado / Pagado</p>
                        <p className={`text-xl font-bold text-emerald-600 dark:text-emerald-400 transition-all duration-300 ${privacyMode ? 'blur-sm select-none' : ''}`}>{formatMoney(debt.currentAmount)}</p>
                        </div>
                        <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Restante</p>
                        <p className={`text-lg font-bold text-red-500 transition-all duration-300 ${privacyMode ? 'blur-sm select-none' : ''}`}>{formatMoney(debt.totalAmount - debt.currentAmount)}</p>
                        </div>
                    </div>
                    )}
                </div>
                );
                })}
            </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default DebtManager;
