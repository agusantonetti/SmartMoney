
import React, { useState, useMemo } from 'react';
import { FinancialProfile, Transaction } from '../types';
import { formatMoney, getDollarRate, getCurrentMonthKey, formatMonthKey, getCategoryIcon } from '../utils';

interface Props {
  profile: FinancialProfile;
  transactions: Transaction[];
  onUpdateProfile: (profile: FinancialProfile) => void;
  onBack: () => void;
}

const BudgetControl: React.FC<Props> = ({ profile, transactions, onUpdateProfile, onBack }) => {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [limitInput, setLimitInput] = useState('');
  const currentMonthKey = getCurrentMonthKey();
  const dollarRate = getDollarRate(profile);

  const monthData = useMemo(() => {
    const monthTxs = transactions.filter(t => t.date.startsWith(currentMonthKey));
    
    // Ingreso mensual basado en sueldos configurados en el perfil
    const totalIncome = (profile.incomeSources || []).reduce((sum, src) => {
        if (src.isActive === false) return sum;
        let val = 0;
        if (src.isCreatorSource) {
            const payments = src.payments?.filter(p => p.month.startsWith(currentMonthKey)) || [];
            val = payments.reduce((acc, p) => acc + p.realAmount, 0);
        } else {
            val = src.amount;
            if (src.frequency === 'BIWEEKLY') val *= 2;
            if (src.frequency === 'ONE_TIME') val = 0;
        }
        if (src.currency === 'USD') val *= dollarRate;
        return sum + val;
    }, 0);

    // Gastos solo de transacciones registradas
    const expenseTxs = monthTxs.filter(t => t.type === 'expense');
    const totalExpense = expenseTxs.reduce((a, t) => a + t.amount, 0);

    // Balance simple: ingreso - gasto
    const balance = totalIncome - totalExpense;

    // Desglose por categoría
    const byCategory: Record<string, number> = {};
    expenseTxs.forEach(t => {
        byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    });

    const categories = Object.keys(byCategory)
        .map(cat => ({
            name: cat,
            spent: byCategory[cat],
            limit: profile.budgetLimits?.[cat] || 0,
            icon: getCategoryIcon(cat),
        }))
        .sort((a, b) => b.spent - a.spent);

    // Agregar categorías con límite pero sin gasto este mes
    const allLimits = profile.budgetLimits || {};
    Object.keys(allLimits).forEach(cat => {
        if (!byCategory[cat] && allLimits[cat] > 0) {
            categories.push({
                name: cat,
                spent: 0,
                limit: allLimits[cat],
                icon: getCategoryIcon(cat),
            });
        }
    });

    return { totalIncome, totalExpense, balance, categories };
  }, [transactions, profile, currentMonthKey, dollarRate]);

  // === HANDLERS ===
  const handleSaveLimit = (category: string) => {
    const amount = parseFloat(limitInput);
    if (isNaN(amount)) return;
    const newLimits = { ...profile.budgetLimits, [category]: amount };
    if (amount === 0) delete newLimits[category];
    onUpdateProfile({ ...profile, budgetLimits: newLimits });
    setEditingCategory(null);
    setLimitInput('');
  };

  const getProgressColor = (spent: number, limit: number) => {
    if (!limit) return 'bg-slate-300 dark:bg-slate-600';
    const pct = spent / limit;
    if (pct >= 1) return 'bg-red-500';
    if (pct >= 0.8) return 'bg-yellow-400';
    return 'bg-emerald-500';
  };

  const usedPercent = monthData.totalIncome > 0 ? Math.min(100, (monthData.totalExpense / monthData.totalIncome) * 100) : 0;

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      
      <div className="sticky top-0 z-10 bg-surface-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
           <h2 className="text-lg font-bold">Presupuesto Mensual</h2>
           <p className="text-xs text-slate-500">{formatMonthKey(currentMonthKey)}</p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto p-6 space-y-5 pb-24">

         {/* 1. RESUMEN: INGRESO vs GASTO */}
         <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
                <div className="flex items-center gap-1.5 mb-1">
                    <span className="material-symbols-outlined text-emerald-500 text-[18px]">arrow_downward</span>
                    <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Sueldo mensual</span>
                </div>
                <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{formatMoney(monthData.totalIncome)}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
                <div className="flex items-center gap-1.5 mb-1">
                    <span className="material-symbols-outlined text-red-500 text-[18px]">arrow_upward</span>
                    <span className="text-[10px] font-bold uppercase text-red-600 dark:text-red-400">Gasté</span>
                </div>
                <p className="text-xl font-black text-red-700 dark:text-red-300">{formatMoney(monthData.totalExpense)}</p>
            </div>
         </div>

         {/* 2. BARRA DE PROGRESO GENERAL */}
         {monthData.totalIncome > 0 && (
             <div className={`rounded-2xl p-4 border ${monthData.balance >= 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-bold ${monthData.balance >= 0 ? 'text-blue-800 dark:text-blue-300' : 'text-red-800 dark:text-red-300'}`}>
                        {monthData.balance >= 0 ? 'Usaste' : 'Te excediste'}
                    </span>
                    <span className={`text-sm font-black ${monthData.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                        {Math.round(usedPercent)}% de tu ingreso
                    </span>
                </div>
                <div className="h-3 bg-white/50 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-700 ${usedPercent >= 100 ? 'bg-red-500' : usedPercent >= 80 ? 'bg-yellow-400' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(100, usedPercent)}%` }}
                    />
                </div>
                <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] font-bold text-slate-400">$0</span>
                    <span className="text-[10px] font-bold text-slate-400">{formatMoney(monthData.totalIncome)}</span>
                </div>
             </div>
         )}

         {/* 3. DESGLOSE POR CATEGORÍA */}
         <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">Gastos por categoría</h3>
            <div className="space-y-3">
                {monthData.categories.length === 0 && (
                    <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 border border-slate-200 dark:border-slate-700 text-center text-sm text-slate-400">
                        No registraste gastos este mes todavía.
                    </div>
                )}
                {monthData.categories.map(cat => {
                    const hasLimit = cat.limit > 0;
                    const percentage = hasLimit ? Math.min(100, (cat.spent / cat.limit) * 100) : (monthData.totalIncome > 0 ? Math.min(100, (cat.spent / monthData.totalIncome) * 100) : 0);
                    const remaining = hasLimit ? cat.limit - cat.spent : 0;
                    const isEditing = editingCategory === cat.name;
                    const progressColor = hasLimit ? getProgressColor(cat.spent, cat.limit) : 'bg-slate-400 dark:bg-slate-500';

                    return (
                        <div key={cat.name} className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2.5">
                                    <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[18px] text-slate-500">{cat.icon}</span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{cat.name}</h4>
                                        <p className="text-[10px] text-slate-400">{formatMoney(cat.spent)} gastado</p>
                                    </div>
                                </div>
                                
                                {!isEditing && (
                                    <button 
                                        onClick={() => { setEditingCategory(cat.name); setLimitInput(cat.limit ? cat.limit.toString() : ''); }}
                                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors ${hasLimit ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                                    >
                                        {hasLimit ? formatMoney(cat.limit) : '+ Límite'}
                                    </button>
                                )}
                            </div>

                            {isEditing ? (
                                <div className="flex gap-2 mt-2 animate-[fadeIn_0.2s_ease-out]">
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                                        <input 
                                            type="number" 
                                            className="w-full bg-slate-100 dark:bg-slate-900 rounded-lg pl-6 pr-3 py-2 outline-none focus:ring-2 focus:ring-primary/50 font-bold text-sm"
                                            placeholder="Límite mensual"
                                            value={limitInput}
                                            onChange={(e) => setLimitInput(e.target.value)}
                                            autoFocus
                                            style={{ fontSize: '16px' }}
                                        />
                                    </div>
                                    <button onClick={() => handleSaveLimit(cat.name)} className="bg-primary text-white px-3 rounded-lg font-bold text-sm">OK</button>
                                    <button onClick={() => setEditingCategory(null)} className="bg-slate-200 dark:bg-slate-700 text-slate-500 px-2 rounded-lg">
                                        <span className="material-symbols-outlined text-[18px]">close</span>
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-700 ${progressColor}`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    {hasLimit && (
                                        <div className="flex justify-between mt-1">
                                            <span className="text-[10px] font-bold text-slate-400">{Math.round(percentage)}%</span>
                                            <span className={`text-[10px] font-bold ${remaining >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {remaining >= 0 ? `Quedan ${formatMoney(remaining)}` : `Excedido ${formatMoney(Math.abs(remaining))}`}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
         </div>

         {/* 4. RESULTADO FINAL */}
         <div className={`rounded-2xl p-5 border text-center ${monthData.balance >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
            <span className={`material-symbols-outlined text-3xl ${monthData.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {monthData.balance >= 0 ? 'sentiment_satisfied' : 'sentiment_dissatisfied'}
            </span>
            <p className={`text-2xl font-black mt-1 ${monthData.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {monthData.balance >= 0 ? '+' : ''}{formatMoney(monthData.balance)}
            </p>
            <p className="text-xs font-medium text-slate-500 mt-1">
                {monthData.balance >= 0 
                    ? 'ahorraste este mes' 
                    : 'gastaste de más este mes'}
            </p>
         </div>

      </div>
    </div>
  );
};

export default BudgetControl;
