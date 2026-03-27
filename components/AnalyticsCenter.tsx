
import React, { useMemo, useState } from 'react';
import { Transaction, FinancialProfile } from '../types';
import { formatMoney, getCurrentMonthKey, formatMonthKey, getPrevMonthKey, getNextMonthKey, tryReclassify, getAllCategories, getSalaryForMonth, getDollarRate } from '../utils';

interface Props {
  transactions: Transaction[];
  profile: FinancialProfile;
  onBack: () => void;
  onUpdateTransactions?: (transactions: Transaction[]) => void;
}

const AnalyticsCenter: React.FC<Props> = ({ transactions, profile, onBack, onUpdateTransactions }) => {
  const [timeRange, setTimeRange] = useState<'ALL' | 'MONTH' | 'YEAR'>('MONTH');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'FLOW'>('OVERVIEW');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [showReclassify, setShowReclassify] = useState(false);
  const [reclassifyEdits, setReclassifyEdits] = useState<Record<string, string>>({});

  const availableCategories = getAllCategories(profile?.customCategories);
  const dollarRate = getDollarRate(profile);

  // --- LOGIC: CATEGORY BREAKDOWN (DONUT CHART) ---
  const categoryData = useMemo(() => {
    let filteredTransactions = transactions;
    if (timeRange === 'MONTH') {
        filteredTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));
    } else if (timeRange === 'YEAR') {
        const yearKey = selectedMonth.split('-')[0];
        filteredTransactions = transactions.filter(t => t.date.startsWith(yearKey));
    }

    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    const totalsByCategory: Record<string, number> = {};
    let totalExpense = 0;

    expenses.forEach(t => {
      totalsByCategory[t.category] = (totalsByCategory[t.category] || 0) + t.amount;
      totalExpense += t.amount;
    });

    const data = Object.keys(totalsByCategory).map(cat => ({
      name: cat,
      value: totalsByCategory[cat],
      percentage: totalExpense > 0 ? (totalsByCategory[cat] / totalExpense) * 100 : 0,
      color: getColorForCategory(cat)
    })).sort((a, b) => b.value - a.value);

    return { data, totalExpense };
  }, [transactions, timeRange, selectedMonth]);

  // --- LOGIC: FLOW CHART (SANKEY-LIKE) ---
  const flowData = useMemo(() => {
    // Current period transactions
    let relevantTxs = transactions;
    if (timeRange === 'MONTH') {
      relevantTxs = transactions.filter(t => t.date.startsWith(selectedMonth));
    } else if (timeRange === 'YEAR') {
      const yearKey = selectedMonth.split('-')[0];
      relevantTxs = transactions.filter(t => t.date.startsWith(yearKey));
    }

    // Previous period income (salary-based)
    const prevMonth = getPrevMonthKey(selectedMonth);
    const prevIncome = getSalaryForMonth(profile, prevMonth, dollarRate);
    const prevExpense = transactions.filter(t => t.type === 'expense' && t.date.startsWith(prevMonth)).reduce((a, t) => a + t.amount, 0);

    // Income from salary sources
    const totalIncome = getSalaryForMonth(profile, selectedMonth, dollarRate);
    const incomeNodes = (profile.incomeSources || []).filter(s => s.isActive !== false).map(src => {
      let val = src.amount;
      if (src.frequency === 'BIWEEKLY') val *= 2;
      if (src.frequency === 'ONE_TIME') val = 0;
      if (src.isCreatorSource) {
        val = (src.payments?.filter(p => p.month.startsWith(selectedMonth)) || []).reduce((a, p) => a + p.realAmount, 0);
      }
      if (src.currency === 'USD') val *= dollarRate;
      return { name: src.name, amount: val, color: '#10b981' };
    }).filter(s => s.amount > 0).sort((a, b) => b.amount - a.amount);

    // Expense categories
    const expenses = relevantTxs.filter(t => t.type === 'expense');
    const expenseGroups: Record<string, number> = {};
    expenses.forEach(t => {
        expenseGroups[t.category] = (expenseGroups[t.category] || 0) + t.amount;
    });
    const expenseNodes = Object.keys(expenseGroups).map(k => ({
        name: k, amount: expenseGroups[k], color: getColorForCategory(k)
    })).sort((a,b) => b.amount - a.amount);
    const totalExpense = expenseNodes.reduce((acc, n) => acc + n.amount, 0);

    // Balance
    const netBalance = totalIncome - totalExpense;

    // Percentage changes vs previous period
    const calcPct = (curr: number, prev: number) => {
        if (prev === 0) return curr === 0 ? 0 : 100;
        return ((curr - prev) / prev) * 100;
    };

    return { 
        incomeNodes, expenseNodes,
        totalIncome, totalExpense, netBalance,
        prevIncome, prevExpense,
        incomePct: calcPct(totalIncome, prevIncome),
        expensePct: calcPct(totalExpense, prevExpense),
    };
  }, [transactions, timeRange, selectedMonth]);


  // --- LOGIC: MONTHLY HISTORY (BAR CHART) ---
  const historyData = useMemo(() => {
    const monthsMap: Record<string, { income: number; expense: number }> = {};
    
    // Generar últimos 6 meses
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsMap[key] = { income: 0, expense: 0 };
    }

    transactions.forEach(t => {
      const key = t.date.substring(0, 7); // YYYY-MM
      if (monthsMap[key]) {
        if (t.type === 'income') monthsMap[key].income += t.amount;
        else monthsMap[key].expense += t.amount;
      }
    });

    return Object.keys(monthsMap).map(key => {
      const [year, month] = key.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      const label = date.toLocaleDateString('es-ES', { month: 'short' });
      return {
        label,
        income: monthsMap[key].income,
        expense: monthsMap[key].expense
      };
    });
  }, [transactions]);

  const maxBarValue = Math.max(
    ...historyData.map(d => Math.max(d.income, d.expense)),
    100
  );

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-lg font-bold">Analíticas</h2>
        </div>
        
        {/* Time Filter */}
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-1 flex text-xs font-bold">
          <button 
            onClick={() => setTimeRange('MONTH')} 
            className={`px-3 py-1.5 rounded-md transition-all ${timeRange === 'MONTH' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-500'}`}
          >
            Mes
          </button>
          <button 
            onClick={() => setTimeRange('YEAR')} 
            className={`px-3 py-1.5 rounded-md transition-all ${timeRange === 'YEAR' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-500'}`}
          >
            Año
          </button>
          <button 
            onClick={() => setTimeRange('ALL')} 
            className={`px-3 py-1.5 rounded-md transition-all ${timeRange === 'ALL' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-500'}`}
          >
            Todo
          </button>
        </div>
      </div>

      {/* Month Navigator - only show when filtering by MONTH or YEAR */}
      {timeRange !== 'ALL' && (
        <div className="w-full max-w-4xl mx-auto px-6 pt-3">
          <div className="flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 shadow-sm">
            <button 
              onClick={() => setSelectedMonth(getPrevMonthKey(selectedMonth))}
              className="size-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <span className="text-sm font-bold text-slate-900 dark:text-white min-w-[140px] text-center">
              {timeRange === 'YEAR' ? selectedMonth.split('-')[0] : formatMonthKey(selectedMonth)}
            </span>
            <button 
              onClick={() => {
                const next = getNextMonthKey(selectedMonth);
                if (next <= getCurrentMonthKey()) setSelectedMonth(next);
              }}
              className={`size-8 rounded-full flex items-center justify-center transition-colors ${getNextMonthKey(selectedMonth) > getCurrentMonthKey() ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="w-full max-w-4xl mx-auto px-6 pt-6">
        <div className="flex bg-surface-light dark:bg-surface-dark p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button 
                onClick={() => setActiveTab('OVERVIEW')}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'OVERVIEW' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
            >
                <span className="material-symbols-outlined">pie_chart</span>
                Resumen
            </button>
            <button 
                onClick={() => setActiveTab('FLOW')}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'FLOW' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
            >
                <span className="material-symbols-outlined">hub</span>
                Flujo de Dinero
            </button>
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl mx-auto p-6 space-y-8 pb-24">
        
        {/* === FLOW CHART TAB === */}
        {activeTab === 'FLOW' && (
            <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">

                {/* 1. SUMMARY CARDS */}
                <div className="grid grid-cols-3 gap-3">
                    {/* Income Card */}
                    <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-1.5 mb-2">
                            <span className="material-symbols-outlined text-emerald-500 text-[18px]">trending_up</span>
                            <span className="text-[10px] font-bold uppercase text-slate-400">Ingresos</span>
                        </div>
                        <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">{formatMoney(flowData.totalIncome)}</p>
                        {timeRange !== 'ALL' && (
                            <p className={`text-[10px] font-bold mt-1 ${flowData.incomePct > 0 ? 'text-emerald-500' : flowData.incomePct < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                {flowData.incomePct > 0 ? '+' : ''}{flowData.incomePct.toFixed(0)}% vs anterior
                            </p>
                        )}
                    </div>
                    {/* Expense Card */}
                    <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-1.5 mb-2">
                            <span className="material-symbols-outlined text-red-500 text-[18px]">trending_down</span>
                            <span className="text-[10px] font-bold uppercase text-slate-400">Gastos</span>
                        </div>
                        <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">{formatMoney(flowData.totalExpense)}</p>
                        {timeRange !== 'ALL' && (
                            <p className={`text-[10px] font-bold mt-1 ${flowData.expensePct < 0 ? 'text-emerald-500' : flowData.expensePct > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                {flowData.expensePct > 0 ? '+' : ''}{flowData.expensePct.toFixed(0)}% vs anterior
                            </p>
                        )}
                    </div>
                    {/* Net Card */}
                    <div className={`rounded-2xl p-4 border shadow-sm ${flowData.netBalance >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                        <div className="flex items-center gap-1.5 mb-2">
                            <span className={`material-symbols-outlined text-[18px] ${flowData.netBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {flowData.netBalance >= 0 ? 'savings' : 'warning'}
                            </span>
                            <span className="text-[10px] font-bold uppercase text-slate-400">Balance</span>
                        </div>
                        <p className={`text-lg font-black leading-tight ${flowData.netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {flowData.netBalance >= 0 ? '+' : ''}{formatMoney(flowData.netBalance)}
                        </p>
                        <p className="text-[10px] font-bold mt-1 text-slate-400">
                            {flowData.netBalance >= 0 ? 'Ahorraste este periodo' : 'Gastaste de más'}
                        </p>
                    </div>
                </div>

                {/* 2. TOP CATEGORÍAS DE GASTO */}
                {flowData.expenseNodes.length > 0 && (
                    <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                            <span className="material-symbols-outlined text-orange-500 text-[18px]">leaderboard</span>
                            Top gastos por categoría
                        </h3>
                        <div className="space-y-3">
                            {flowData.expenseNodes.slice(0, 8).map((node) => {
                                const pct = flowData.totalExpense > 0 ? (node.amount / flowData.totalExpense) * 100 : 0;
                                return (
                                    <div key={node.name}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{node.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-400">{pct.toFixed(0)}%</span>
                                                <span className="text-sm font-black text-slate-900 dark:text-white">{formatMoney(node.amount)}</span>
                                            </div>
                                        </div>
                                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{ width: `${pct}%`, backgroundColor: node.color }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 3. FLUJO VISUAL SIMPLIFICADO */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                        <span className="material-symbols-outlined text-blue-500 text-[18px]">account_tree</span>
                        Flujo de dinero
                    </h3>

                    {flowData.totalIncome === 0 && flowData.totalExpense === 0 ? (
                        <div className="text-center py-12 opacity-50">
                            <span className="material-symbols-outlined text-3xl mb-2">data_loss_prevention</span>
                            <p className="text-sm">No hay datos en este periodo.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Income sources */}
                            {flowData.incomeNodes.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-emerald-500 mb-2 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                                        Entradas — {formatMoney(flowData.totalIncome)}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {flowData.incomeNodes.map(node => (
                                            <div key={node.name} className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2 flex items-center gap-2">
                                                <div className="size-2 rounded-full bg-emerald-500" />
                                                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">{node.name}</span>
                                                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{formatMoney(node.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Visual separator */}
                            <div className="flex items-center gap-3 py-1">
                                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2">
                                    <span className="material-symbols-outlined text-[16px] text-slate-400">account_balance_wallet</span>
                                    <span className="text-xs font-bold text-slate-500">Tu billetera</span>
                                </div>
                                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                            </div>

                            {/* Expense destinations */}
                            {flowData.expenseNodes.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-red-500 mb-2 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                                        Salidas — {formatMoney(flowData.totalExpense)}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {flowData.expenseNodes.map(node => (
                                            <div key={node.name} className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 flex items-center gap-2" style={{ borderLeftColor: node.color, borderLeftWidth: '3px' }}>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{node.name}</span>
                                                <span className="text-xs font-black text-slate-900 dark:text-white">{formatMoney(node.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Result */}
                            <div className={`rounded-xl p-3 flex items-center justify-between ${flowData.netBalance >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
                                <div className="flex items-center gap-2">
                                    <span className={`material-symbols-outlined text-[18px] ${flowData.netBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {flowData.netBalance >= 0 ? 'trending_up' : 'trending_down'}
                                    </span>
                                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                                        {flowData.netBalance >= 0 ? 'Te sobró' : 'Gastaste de más'}
                                    </span>
                                </div>
                                <span className={`text-lg font-black ${flowData.netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {formatMoney(Math.abs(flowData.netBalance))}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* === OVERVIEW TAB (Original Content) === */}
        {activeTab === 'OVERVIEW' && (
            <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
                {/* CHART: EXPENSE BREAKDOWN (DONUT) */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-500">pie_chart</span>
                    Distribución de Gastos
                </h3>
                
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="relative size-48 shrink-0">
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xs text-slate-400 font-bold uppercase">Total</span>
                            <span className="text-xl font-black text-slate-900 dark:text-white">{formatMoney(categoryData.totalExpense)}</span>
                        </div>
                        
                        <svg viewBox="0 0 100 100" className="rotate-[-90deg]">
                            {categoryData.data.length === 0 ? (
                            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e2e8f0" strokeWidth="20" />
                            ) : null}
                        </svg>
                        
                        <div 
                            className="absolute inset-0 rounded-full"
                            style={{
                            background: categoryData.data.length > 0 
                                ? `conic-gradient(${generateConicGradientString(categoryData.data)})`
                                : '#e2e8f0',
                            maskImage: 'radial-gradient(transparent 55%, black 56%)',
                            WebkitMaskImage: 'radial-gradient(transparent 55%, black 56%)'
                            }}
                        ></div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 w-full">
                        {categoryData.data.map((cat) => (
                            <div key={cat.name} className="flex items-center justify-between group">
                            <div className="flex items-center gap-2">
                                <div className="size-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{cat.name}</span>
                            </div>
                            <div className="text-right">
                                <span className="block text-sm font-bold text-slate-900 dark:text-white">{formatMoney(cat.value)}</span>
                                <span className="block text-[10px] text-slate-400">{cat.percentage.toFixed(1)}%</span>
                            </div>
                            </div>
                        ))}
                        {categoryData.data.length === 0 && (
                            <p className="text-slate-400 italic text-sm col-span-2">No hay gastos registrados aún.</p>
                        )}
                    </div>
                </div>
                </div>

                {/* RECLASSIFY "OTROS" SECTION */}
                {(() => {
                    let filteredTxs = transactions;
                    if (timeRange === 'MONTH') filteredTxs = transactions.filter(t => t.date.startsWith(selectedMonth));
                    else if (timeRange === 'YEAR') filteredTxs = transactions.filter(t => t.date.startsWith(selectedMonth.split('-')[0]));
                    
                    const otrosTxs = filteredTxs.filter(t => t.category === 'Otros' && t.type === 'expense');
                    if (otrosTxs.length === 0) return null;

                    return (
                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-3xl p-6 border border-amber-200 dark:border-amber-800 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-lg flex items-center gap-2 text-amber-800 dark:text-amber-300">
                                    <span className="material-symbols-outlined">help_center</span>
                                    {otrosTxs.length} gasto{otrosTxs.length > 1 ? 's' : ''} sin categoría
                                </h3>
                                {!showReclassify && (
                                    <button 
                                        onClick={() => {
                                            const autoEdits: Record<string, string> = {};
                                            otrosTxs.forEach(tx => {
                                                const suggested = tryReclassify(tx.description);
                                                if (suggested) autoEdits[tx.id] = suggested;
                                            });
                                            setReclassifyEdits(autoEdits);
                                            setShowReclassify(true);
                                        }}
                                        className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
                                        Reclasificar
                                    </button>
                                )}
                            </div>

                            {!showReclassify && (
                                <p className="text-xs text-amber-700 dark:text-amber-400">
                                    Estos gastos no pudieron clasificarse automáticamente. Tocá "Reclasificar" para asignarles categoría.
                                </p>
                            )}

                            {showReclassify && (
                                <div className="space-y-2">
                                    {otrosTxs.map(tx => {
                                        const autoSuggested = tryReclassify(tx.description);
                                        const currentEdit = reclassifyEdits[tx.id] || 'Otros';
                                        return (
                                            <div key={tx.id} className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{tx.description}</p>
                                                    <p className="text-[10px] text-slate-400">{tx.date} — {formatMoney(tx.amount)}</p>
                                                </div>
                                                {autoSuggested && currentEdit === autoSuggested && (
                                                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full whitespace-nowrap">Auto</span>
                                                )}
                                                <select
                                                    value={currentEdit}
                                                    onChange={(e) => setReclassifyEdits({ ...reclassifyEdits, [tx.id]: e.target.value })}
                                                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm font-bold outline-none focus:ring-1 focus:ring-primary min-w-[130px]"
                                                    style={{ fontSize: '16px' }}
                                                >
                                                    {availableCategories.map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        );
                                    })}

                                    <div className="flex gap-2 pt-3">
                                        <button
                                            onClick={() => {
                                                if (!onUpdateTransactions) return;
                                                const editedIds = Object.keys(reclassifyEdits).filter(id => reclassifyEdits[id] !== 'Otros');
                                                if (editedIds.length === 0) {
                                                    setShowReclassify(false);
                                                    return;
                                                }
                                                const updated = transactions.map(tx => {
                                                    if (reclassifyEdits[tx.id] && reclassifyEdits[tx.id] !== 'Otros') {
                                                        return { ...tx, category: reclassifyEdits[tx.id] };
                                                    }
                                                    return tx;
                                                });
                                                onUpdateTransactions(updated);
                                                setShowReclassify(false);
                                                setReclassifyEdits({});
                                            }}
                                            className="flex-1 bg-primary hover:bg-blue-600 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">save</span>
                                            Guardar cambios ({Object.keys(reclassifyEdits).filter(id => reclassifyEdits[id] !== 'Otros').length})
                                        </button>
                                        <button
                                            onClick={() => { setShowReclassify(false); setReclassifyEdits({}); }}
                                            className="px-4 py-3 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* CHART: INCOME VS EXPENSE (BAR CHART) */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-500">bar_chart</span>
                    Flujo de Caja (6 Meses)
                </h3>

                <div className="h-64 flex items-end justify-between gap-2 sm:gap-4">
                    {historyData.map((data, idx) => (
                        <div key={idx} className="flex-1 flex flex-col justify-end items-center gap-2 group h-full">
                            <div className="w-full flex justify-center gap-1 items-end h-full relative">
                            {/* Tooltip on hover */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap">
                                <div className="text-emerald-400">Ing: {formatMoney(data.income)}</div>
                                <div className="text-red-400">Gas: {formatMoney(data.expense)}</div>
                            </div>
                            
                            {/* Bars */}
                            <div 
                                className="w-3 sm:w-6 bg-emerald-400 rounded-t-sm transition-all duration-500 hover:bg-emerald-300"
                                style={{ height: `${(data.income / maxBarValue) * 100}%`, minHeight: data.income > 0 ? '4px' : '0' }}
                            ></div>
                            <div 
                                className="w-3 sm:w-6 bg-red-400 rounded-t-sm transition-all duration-500 hover:bg-red-300"
                                style={{ height: `${(data.expense / maxBarValue) * 100}%`, minHeight: data.expense > 0 ? '4px' : '0' }}
                            ></div>
                            </div>
                            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase">{data.label}</span>
                        </div>
                    ))}
                </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

// Helper for Colors
function getColorForCategory(category: string): string {
   const normalized = category.toLowerCase();
   if (normalized.includes('comida') || normalized.includes('restaurante')) return '#fbbf24';
   if (normalized.includes('café') || normalized.includes('cafe')) return '#d97706';
   if (normalized.includes('supermercado') || normalized.includes('mercado')) return '#fb923c';
   if (normalized.includes('hogar') || normalized.includes('renta')) return '#818cf8';
   if (normalized.includes('transporte') || normalized.includes('uber')) return '#34d399';
   if (normalized.includes('entretenimiento') || normalized.includes('cine')) return '#f472b6';
   if (normalized.includes('salud') || normalized.includes('medic') || normalized.includes('farmacia')) return '#f87171';
   if (normalized.includes('servicios') || normalized.includes('internet')) return '#60a5fa';
   if (normalized.includes('educación') || normalized.includes('educacion') || normalized.includes('curso')) return '#a78bfa';
   if (normalized.includes('ropa') || normalized.includes('zapatilla')) return '#e879f9';
   if (normalized.includes('suscripcion') || normalized.includes('suscripción')) return '#2dd4bf';
   if (normalized.includes('regalo')) return '#fb7185';
   if (normalized.includes('viaje') || normalized.includes('vuelo') || normalized.includes('hotel')) return '#38bdf8';
   if (normalized.includes('mascota') || normalized.includes('veterinario')) return '#a3e635';
   if (normalized.includes('trabajo') || normalized.includes('oficina')) return '#64748b';
   if (normalized.includes('transferencia') || normalized.includes('préstamo') || normalized.includes('prestamo')) return '#cbd5e1';
   if (normalized.includes('fiesta') || normalized.includes('evento') || normalized.includes('celebraci')) return '#f472b6';
   if (normalized.includes('compra')) return '#c084fc';
   if (normalized.includes('ingreso')) return '#10b981';
   return '#94a3b8';
}

// Helper for Conic Gradient
function generateConicGradientString(data: { percentage: number; color: string }[]) {
   let gradientString = '';
   let currentAngle = 0;
   
   data.forEach((item, index) => {
      const endAngle = currentAngle + item.percentage;
      gradientString += `${item.color} ${currentAngle}% ${endAngle}%`;
      if (index < data.length - 1) gradientString += ', ';
      currentAngle = endAngle;
   });
   
   return gradientString;
}

export default AnalyticsCenter;
