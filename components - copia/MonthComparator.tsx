
import React, { useState, useMemo } from 'react';
import { Transaction, FinancialProfile } from '../types';
import { formatMoney, getDollarRate, getCurrentMonthKey, getPrevMonthKey, formatMonthKey, getCategoryIcon } from '../utils';

interface Props {
  transactions: Transaction[];
  profile: FinancialProfile;
  onBack: () => void;
}

const MonthComparator: React.FC<Props> = ({ transactions, profile, onBack }) => {
  const [monthA, setMonthA] = useState(getCurrentMonthKey());
  const [monthB, setMonthB] = useState(getPrevMonthKey(getCurrentMonthKey()));
  const dollarRate = getDollarRate(profile);

  // Helper: calcular ingreso de sueldos para un mes dado
  const getSalaryForMonth = (monthKey: string) => {
    return (profile.incomeSources || []).reduce((sum, src) => {
      if (src.isActive === false) return sum;
      let val = 0;
      if (src.isCreatorSource) {
        const payments = src.payments?.filter(p => p.month.startsWith(monthKey)) || [];
        val = payments.reduce((acc, p) => acc + p.realAmount, 0);
      } else {
        val = src.amount;
        if (src.frequency === 'BIWEEKLY') val *= 2;
        if (src.frequency === 'ONE_TIME') val = 0;
      }
      if (src.currency === 'USD') val *= dollarRate;
      return sum + val;
    }, 0);
  };

  const comparison = useMemo(() => {
    const txA = transactions.filter(t => t.date.startsWith(monthA));
    const txB = transactions.filter(t => t.date.startsWith(monthB));

    // Ingresos basados en sueldos configurados
    const incomeA = getSalaryForMonth(monthA);
    const incomeB = getSalaryForMonth(monthB);
    const expenseA = txA.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
    const expenseB = txB.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);

    // Categories comparison
    const catsA: Record<string, number> = {};
    const catsB: Record<string, number> = {};
    txA.filter(t => t.type === 'expense').forEach(t => { catsA[t.category] = (catsA[t.category] || 0) + t.amount; });
    txB.filter(t => t.type === 'expense').forEach(t => { catsB[t.category] = (catsB[t.category] || 0) + t.amount; });

    const allCats = [...new Set([...Object.keys(catsA), ...Object.keys(catsB)])];
    const categoryComparison = allCats.map(cat => ({
      name: cat,
      icon: getCategoryIcon(cat),
      amountA: catsA[cat] || 0,
      amountB: catsB[cat] || 0,
      diff: (catsA[cat] || 0) - (catsB[cat] || 0),
    })).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    const calcPct = (curr: number, prev: number) => {
      if (prev === 0) return curr === 0 ? 0 : 100;
      return ((curr - prev) / prev) * 100;
    };

    return {
      incomeA, incomeB, expenseA, expenseB,
      balanceA: incomeA - expenseA,
      balanceB: incomeB - expenseB,
      incomePct: calcPct(incomeA, incomeB),
      expensePct: calcPct(expenseA, expenseB),
      categoryComparison,
      totalDiff: expenseA - expenseB,
    };
  }, [transactions, monthA, monthB, profile, dollarRate]);

  const maxCategoryAmount = Math.max(
    ...comparison.categoryComparison.map(c => Math.max(c.amountA, c.amountB)),
    1
  );

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      
      <div className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-white/30 dark:border-slate-700/40 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold">Comparar Meses</h2>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto p-6 space-y-5 pb-24">

        {/* Month Selectors */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-3 border border-slate-200 dark:border-slate-700 text-center">
            <span className="text-[10px] font-bold uppercase text-blue-500 block mb-1">Mes A</span>
            <input 
              type="month" 
              value={monthA}
              onChange={(e) => setMonthA(e.target.value)}
              className="w-full bg-transparent text-center font-bold text-sm outline-none"
              style={{ fontSize: '16px' }}
            />
          </div>
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-3 border border-slate-200 dark:border-slate-700 text-center">
            <span className="text-[10px] font-bold uppercase text-purple-500 block mb-1">Mes B</span>
            <input 
              type="month" 
              value={monthB}
              onChange={(e) => setMonthB(e.target.value)}
              className="w-full bg-transparent text-center font-bold text-sm outline-none"
              style={{ fontSize: '16px' }}
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="space-y-3">
          {/* Income */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-emerald-500 text-[18px]">trending_up</span>
              <span className="text-xs font-bold text-slate-500 uppercase">Ingresos</span>
              {comparison.incomePct !== 0 && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto ${comparison.incomePct > 0 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {comparison.incomePct > 0 ? '+' : ''}{comparison.incomePct.toFixed(0)}%
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center"><p className="text-[10px] text-slate-400 mb-0.5">{formatMonthKey(monthA)}</p><p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatMoney(comparison.incomeA)}</p></div>
              <div className="text-center"><p className="text-[10px] text-slate-400 mb-0.5">{formatMonthKey(monthB)}</p><p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatMoney(comparison.incomeB)}</p></div>
            </div>
          </div>

          {/* Expense */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-red-500 text-[18px]">trending_down</span>
              <span className="text-xs font-bold text-slate-500 uppercase">Gastos</span>
              {comparison.expensePct !== 0 && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto ${comparison.expensePct < 0 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {comparison.expensePct > 0 ? '+' : ''}{comparison.expensePct.toFixed(0)}%
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center"><p className="text-[10px] text-slate-400 mb-0.5">{formatMonthKey(monthA)}</p><p className="text-lg font-black text-red-600 dark:text-red-400">{formatMoney(comparison.expenseA)}</p></div>
              <div className="text-center"><p className="text-[10px] text-slate-400 mb-0.5">{formatMonthKey(monthB)}</p><p className="text-lg font-black text-red-600 dark:text-red-400">{formatMoney(comparison.expenseB)}</p></div>
            </div>
          </div>
        </div>

        {/* Category Comparison */}
        {comparison.categoryComparison.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">Comparación por categoría</h3>
            <div className="space-y-3">
              {comparison.categoryComparison.map(cat => (
                <div key={cat.name} className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[16px] text-slate-500">{cat.icon}</span>
                      </div>
                      <span className="text-sm font-bold">{cat.name}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cat.diff > 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : cat.diff < 0 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500'}`}>
                      {cat.diff > 0 ? '+' : ''}{formatMoney(cat.diff)}
                    </span>
                  </div>
                  {/* Side by side bars */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-blue-500 font-bold w-6">A</span>
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${(cat.amountA / maxCategoryAmount) * 100}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 min-w-[70px] text-right">{formatMoney(cat.amountA)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-purple-500 font-bold w-6">B</span>
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${(cat.amountB / maxCategoryAmount) * 100}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 min-w-[70px] text-right">{formatMoney(cat.amountB)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verdict */}
        <div className={`rounded-2xl p-5 border text-center ${comparison.totalDiff <= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
          <span className={`material-symbols-outlined text-3xl ${comparison.totalDiff <= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {comparison.totalDiff <= 0 ? 'thumb_up' : 'thumb_down'}
          </span>
          <p className={`text-sm font-bold mt-1 ${comparison.totalDiff <= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
            {comparison.totalDiff > 0 
              ? `En ${formatMonthKey(monthA)} gastaste ${formatMoney(comparison.totalDiff)} más`
              : comparison.totalDiff < 0
              ? `En ${formatMonthKey(monthA)} gastaste ${formatMoney(Math.abs(comparison.totalDiff))} menos`
              : 'Ambos meses tuvieron el mismo gasto'}
          </p>
        </div>

      </div>
    </div>
  );
};

export default MonthComparator;
