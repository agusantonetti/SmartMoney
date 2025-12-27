
import React, { useMemo } from 'react';
import { Transaction, FinancialProfile } from '../types';

interface Props {
  transactions: Transaction[];
  profile: FinancialProfile;
  currentBalance: number;
  onBack: () => void;
}

const FutureSimulator: React.FC<Props> = ({ transactions, profile, currentBalance, onBack }) => {

  // 1. Calculate Average Daily Spend (Variable)
  const averageDailySpend = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    if (expenses.length === 0) return 0;

    // Get range
    const dates = expenses.map(t => new Date(t.date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = new Date().getTime(); // Today
    
    // Days difference (max 30 days window for smoother avg)
    let diffDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
    if (diffDays < 1) diffDays = 1;
    if (diffDays > 30) diffDays = 30; // Limit to last 30 days avg

    const totalRecentExpense = expenses
        .filter(t => new Date(t.date).getTime() > (maxDate - (30 * 24 * 60 * 60 * 1000))) // Only last 30 days
        .reduce((acc, t) => acc + t.amount, 0);

    return totalRecentExpense / diffDays;
  }, [transactions]);

  // 2. Project Future Balance
  const projection = useMemo(() => {
    const days = 30;
    const dataPoints = [];
    let runningBalance = currentBalance;
    const today = new Date();

    for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(today.getDate() + i);
        const dayOfMonth = d.getDate();

        // 2a. Subtract Daily Average (Variable)
        runningBalance -= averageDailySpend;

        // 2b. Subtract Fixed Expenses (Subscriptions) on billing day
        profile.subscriptions?.forEach(sub => {
            if (sub.billingDay === dayOfMonth) {
                runningBalance -= sub.amount;
            }
        });

        // 2c. Add Income (Simplified: Assuming monthly salary on 1st or custom logic?)
        // For MVP, assume salary hits on day 1 if we want, but let's stick to burn rate mostly
        // OR if profile.incomeSources has logic? Let's assume standard payment on 1st or 5th
        // For safety, let's NOT project income unless we are sure, to show "Burn" primarily.
        // Actually, without income it just goes down. Let's try to add income if date matches.
        // Simplified: Add monthlySalary on day 1
        if (dayOfMonth === 1 && profile.incomeSources && profile.incomeSources.length > 0) {
            const totalIncome = profile.incomeSources.reduce((acc, s) => acc + s.amount, 0);
            runningBalance += totalIncome;
        }

        dataPoints.push({
            date: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
            balance: runningBalance,
            isNegative: runningBalance < 0
        });
    }
    return dataPoints;
  }, [currentBalance, averageDailySpend, profile]);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);
  };

  const finalBalance = projection[projection.length - 1].balance;
  const daysUntilZero = projection.findIndex(p => p.balance < 0);

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
       <div className="sticky top-0 z-10 bg-surface-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="text-lg font-bold">Simulador Futuro</h2>
          <p className="text-xs text-slate-500">Proyección a 30 días</p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto p-6 space-y-8 pb-24 animate-[fadeIn_0.3s_ease-out]">
        
        {/* Main Stat */}
        <div className={`rounded-3xl p-8 text-white shadow-xl relative overflow-hidden ${finalBalance >= 0 ? 'bg-gradient-to-br from-cyan-600 to-blue-700' : 'bg-gradient-to-br from-red-600 to-orange-700'}`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            
            <p className="text-white/80 font-medium mb-1 relative z-10">Saldo estimado en 30 días</p>
            <h1 className="text-5xl font-black tracking-tight relative z-10">{formatMoney(finalBalance)}</h1>
            
            <div className="mt-6 flex flex-wrap gap-4 relative z-10">
                <div className="bg-black/20 rounded-xl px-4 py-2">
                    <p className="text-xs opacity-70 mb-1">Gasto Diario Prom.</p>
                    <p className="font-bold">{formatMoney(averageDailySpend)}</p>
                </div>
                 {daysUntilZero !== -1 && (
                    <div className="bg-white/20 rounded-xl px-4 py-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-yellow-300">warning</span>
                        <div>
                            <p className="text-xs opacity-70 mb-1">¡Cuidado!</p>
                            <p className="font-bold text-sm leading-tight">Llegas a $0 en {daysUntilZero} días</p>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Projection Chart (Simplified Visual) */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-500">trending_flat</span>
              Tendencia de Liquidez
            </h3>
            
            <div className="relative h-64 w-full flex items-end justify-between gap-1">
                 {/* Zero Line */}
                 <div className="absolute left-0 right-0 border-t border-slate-300 dark:border-slate-600 border-dashed z-0" style={{ bottom: '20%' }}></div>
                 
                 {projection.map((point, i) => {
                     // Normalize height. Let's find max value for scaling.
                     const maxVal = Math.max(currentBalance * 1.2, ...projection.map(p => Math.abs(p.balance)));
                     const heightPct = Math.min(100, Math.max(5, (Math.abs(point.balance) / maxVal) * 80)); // 80% max height
                     
                     // Skip labels to avoid clutter
                     const showLabel = i % 5 === 0;

                     return (
                         <div key={i} className="flex-1 flex flex-col justify-end items-center h-full group relative z-10">
                             <div 
                                className={`w-full rounded-t-sm transition-all min-w-[4px] max-w-[12px] ${point.isNegative ? 'bg-red-400' : 'bg-cyan-500'} opacity-80 hover:opacity-100`}
                                style={{ 
                                    height: `${heightPct}%`,
                                    marginBottom: point.isNegative ? '0' : '20%', // Shift positive bars up
                                    transform: point.isNegative ? 'translateY(100%)' : 'none' // Visual trick for negative bars going down
                                }}
                             ></div>
                             
                             {/* Tooltip */}
                             <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-20 pointer-events-none">
                                 {point.date}: {formatMoney(point.balance)}
                             </div>
                         </div>
                     )
                 })}
            </div>
             <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-medium">
                 <span>Hoy</span>
                 <span>15 Días</span>
                 <span>30 Días</span>
            </div>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-sm text-blue-800 dark:text-blue-300 leading-relaxed border border-blue-100 dark:border-blue-800">
            <p className="flex items-start gap-2">
                <span className="material-symbols-outlined text-lg">info</span>
                <span>
                    Esta proyección asume que tus hábitos de gasto se mantienen iguales al último mes y que pagas tus suscripciones el día indicado.
                </span>
            </p>
        </div>

      </div>
    </div>
  );
};

export default FutureSimulator;
