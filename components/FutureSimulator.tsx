
import React, { useMemo, useState } from 'react';
import { Transaction, FinancialProfile, IncomeSource } from '../types';
import { formatMoney, formatUSD, getDollarRate, getSalaryForMonth } from '../utils';

interface Props {
  transactions: Transaction[];
  profile: FinancialProfile;
  currentBalance: number;
  onBack: () => void;
  privacyMode?: boolean;
}

const getEffectiveMode = (src: IncomeSource): string => src.incomeMode || (src.isCreatorSource ? 'VARIABLE' : 'FIXED');

const FutureSimulator: React.FC<Props> = ({ transactions, profile, currentBalance, onBack, privacyMode }) => {
  const dollarRate = getDollarRate(profile);
  const sources = (profile.incomeSources || []).filter(s => s.isActive !== false);
  const [removedSourceIds, setRemovedSourceIds] = useState<Set<string>>(new Set());
  const [expenseAdjust, setExpenseAdjust] = useState(0); // percentage: -20, -10, 0, +10, +20

  // --- LAST MONTH DATA ---
  const lastMonthData = useMemo(() => {
    const now = new Date();
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Use last month if it has data, otherwise current month
    const prevExpenses = transactions.filter(t => t.type === 'expense' && t.date.startsWith(prevKey));
    const currExpenses = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentKey));

    const useKey = prevExpenses.length > 0 ? prevKey : currentKey;
    const useExpenses = prevExpenses.length > 0 ? prevExpenses : currExpenses;

    const totalExpense = useExpenses.reduce((s, t) => s + t.amount, 0);
    const totalIncome = getSalaryForMonth(profile, useKey, dollarRate);

    // Category breakdown
    const categories: Record<string, number> = {};
    useExpenses.forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });

    const monthLabel = new Date(parseInt(useKey.split('-')[0]), parseInt(useKey.split('-')[1]) - 1, 1)
      .toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

    return { monthKey: useKey, monthLabel, totalExpense, totalIncome, categories, transactionCount: useExpenses.length };
  }, [transactions, profile, dollarRate]);

  // --- SIMULATION ---
  const simulation = useMemo(() => {
    const adjustedExpense = lastMonthData.totalExpense * (1 + expenseAdjust / 100);

    // Current income (excluding removed sources)
    const currentIncome = sources.reduce((sum, src) => {
      if (removedSourceIds.has(src.id)) return sum;
      const mode = getEffectiveMode(src);
      let val = 0;
      if (mode === 'VARIABLE') {
        const now = new Date();
        const pfx = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        val = src.payments?.filter(p => p.month.startsWith(pfx)).reduce((a, p) => a + p.realAmount, 0) || 0;
        // If no current month data, use last month
        if (val === 0) {
          const prev = new Date(); prev.setMonth(prev.getMonth() - 1);
          const ppfx = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
          val = src.payments?.filter(p => p.month.startsWith(ppfx)).reduce((a, p) => a + p.realAmount, 0) || 0;
        }
      } else if (mode === 'PER_DELIVERY') {
        const now = new Date();
        const pfx = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        val = (src.posts || []).filter(p => p.date.startsWith(pfx)).reduce((a, p) => a + p.amount, 0);
      } else {
        val = src.amount;
        if (src.frequency === 'BIWEEKLY') val *= 2;
        if (src.frequency === 'ONE_TIME') val = 0;
      }
      if (src.currency === 'USD') val *= dollarRate;
      return sum + val;
    }, 0);

    const originalIncome = sources.reduce((sum, src) => {
      const mode = getEffectiveMode(src);
      let val = 0;
      if (mode === 'VARIABLE') {
        const now = new Date();
        const pfx = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        val = src.payments?.filter(p => p.month.startsWith(pfx)).reduce((a, p) => a + p.realAmount, 0) || 0;
        if (val === 0) {
          const prev = new Date(); prev.setMonth(prev.getMonth() - 1);
          const ppfx = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
          val = src.payments?.filter(p => p.month.startsWith(ppfx)).reduce((a, p) => a + p.realAmount, 0) || 0;
        }
      } else if (mode === 'PER_DELIVERY') {
        const now = new Date();
        const pfx = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        val = (src.posts || []).filter(p => p.date.startsWith(pfx)).reduce((a, p) => a + p.amount, 0);
      } else {
        val = src.amount;
        if (src.frequency === 'BIWEEKLY') val *= 2;
        if (src.frequency === 'ONE_TIME') val = 0;
      }
      if (src.currency === 'USD') val *= dollarRate;
      return sum + val;
    }, 0);

    const monthlyCashflow = currentIncome - adjustedExpense;
    const originalCashflow = originalIncome - lastMonthData.totalExpense;

    // Runway
    const runway = monthlyCashflow < 0 ? Math.floor(currentBalance / Math.abs(monthlyCashflow)) : -1; // -1 = infinite

    // Income lost from removed sources
    const lostIncome = originalIncome - currentIncome;
    const incomeDropPct = originalIncome > 0 ? (lostIncome / originalIncome) * 100 : 0;

    // 6-month projection
    const projection: { month: string; balance: number }[] = [];
    let running = currentBalance;
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      running += monthlyCashflow;
      projection.push({
        month: d.toLocaleDateString('es-AR', { month: 'short' }),
        balance: running,
      });
    }

    // Savings rate
    const savingsRate = currentIncome > 0 ? ((currentIncome - adjustedExpense) / currentIncome) * 100 : 0;

    return {
      currentIncome, originalIncome, adjustedExpense, monthlyCashflow, originalCashflow,
      runway, lostIncome, incomeDropPct, projection, savingsRate,
    };
  }, [sources, removedSourceIds, expenseAdjust, lastMonthData, currentBalance, dollarRate]);

  const maxProjection = Math.max(...simulation.projection.map(p => Math.abs(p.balance)), Math.abs(currentBalance), 1);

  const toggleSource = (id: string) => {
    const next = new Set(removedSourceIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setRemovedSourceIds(next);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      <div className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-white/30 dark:border-slate-700/40 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><span className="material-symbols-outlined">arrow_back</span></button>
        <div>
          <h2 className="text-lg font-bold">Simulador Financiero</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Basado en {lastMonthData.monthLabel}</p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-6 space-y-6 pb-24">

        {/* HERO */}
        <div className={`rounded-3xl p-6 text-white shadow-xl relative overflow-hidden ${simulation.monthlyCashflow >= 0 ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-red-600 to-orange-700'}`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="relative z-10">
            <p className="text-xs text-white/70 font-bold uppercase mb-1">Flujo Mensual Simulado</p>
            <h1 className={`text-4xl font-black tracking-tight ${privacyMode ? 'blur-md' : ''}`}>
              {simulation.monthlyCashflow >= 0 ? '+' : ''}{formatMoney(simulation.monthlyCashflow)}
            </h1>
            {removedSourceIds.size > 0 && (
              <p className="text-sm text-white/80 mt-1">
                vs {formatMoney(simulation.originalCashflow)} original ({removedSourceIds.size} fuente{removedSourceIds.size > 1 ? 's' : ''} removida{removedSourceIds.size > 1 ? 's' : ''})
              </p>
            )}
            <div className="flex flex-wrap gap-3 mt-4">
              <div className="bg-black/20 rounded-xl px-4 py-2">
                <p className="text-[10px] opacity-70">Ingresos</p>
                <p className={`font-bold ${privacyMode ? 'blur-sm' : ''}`}>{formatMoney(simulation.currentIncome)}</p>
              </div>
              <div className="bg-black/20 rounded-xl px-4 py-2">
                <p className="text-[10px] opacity-70">Gastos</p>
                <p className={`font-bold ${privacyMode ? 'blur-sm' : ''}`}>{formatMoney(simulation.adjustedExpense)}</p>
              </div>
              <div className="bg-white/20 rounded-xl px-4 py-2">
                <p className="text-[10px] opacity-70">Tasa de Ahorro</p>
                <p className="font-bold">{simulation.savingsRate.toFixed(1)}%</p>
              </div>
              {simulation.runway >= 0 && (
                <div className="bg-white/20 rounded-xl px-4 py-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-yellow-300">warning</span>
                  <div>
                    <p className="text-[10px] opacity-70">Runway</p>
                    <p className="font-bold">{simulation.runway} meses</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* WHAT-IF: REMOVE INCOME SOURCE */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">science</span>
            ¿Qué pasa si renuncio?
          </h3>
          <p className="text-[10px] text-slate-400 mb-4">Tocá una fuente para simular qué pasa sin ese ingreso</p>

          <div className="space-y-2">
            {sources.map(src => {
              const isRemoved = removedSourceIds.has(src.id);
              const isUSD = src.currency === 'USD';
              const mode = getEffectiveMode(src);
              let srcIncome = 0;
              if (mode === 'VARIABLE') {
                const now = new Date();
                const pfx = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                srcIncome = src.payments?.filter(p => p.month.startsWith(pfx)).reduce((a, p) => a + p.realAmount, 0) || 0;
                if (srcIncome === 0) {
                  const prev = new Date(); prev.setMonth(prev.getMonth() - 1);
                  const ppfx = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
                  srcIncome = src.payments?.filter(p => p.month.startsWith(ppfx)).reduce((a, p) => a + p.realAmount, 0) || 0;
                }
              } else if (mode === 'PER_DELIVERY') {
                const now = new Date();
                const pfx = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                srcIncome = (src.posts || []).filter(p => p.date.startsWith(pfx)).reduce((a, p) => a + p.amount, 0);
              } else {
                srcIncome = src.amount;
                if (src.frequency === 'BIWEEKLY') srcIncome *= 2;
                if (src.frequency === 'ONE_TIME') srcIncome = 0;
              }
              if (isUSD) srcIncome *= dollarRate;
              const pct = simulation.originalIncome > 0 ? (srcIncome / simulation.originalIncome) * 100 : 0;

              return (
                <button
                  key={src.id}
                  onClick={() => toggleSource(src.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left ${
                    isRemoved ? 'bg-red-50 dark:bg-red-900/10 border-2 border-red-300 dark:border-red-800 opacity-60' :
                    'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className={`size-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    isRemoved ? 'bg-red-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}>
                    <span className="material-symbols-outlined text-sm">{isRemoved ? 'close' : 'work'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${isRemoved ? 'line-through' : ''}`}>{src.name}</p>
                    <p className="text-[10px] text-slate-400">{pct.toFixed(1)}% de tu ingreso total</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-black ${privacyMode ? 'blur-sm' : ''} ${isRemoved ? 'text-red-500' : ''}`}>
                      {isRemoved ? '-' : ''}{formatMoney(srcIncome)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {removedSourceIds.size > 0 && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-800">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] text-red-500 font-bold uppercase">Ingreso Perdido</p>
                  <p className={`text-xl font-black text-red-600 ${privacyMode ? 'blur-sm' : ''}`}>{formatMoney(simulation.lostIncome)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-red-500 font-bold uppercase">Caída del Ingreso</p>
                  <p className="text-xl font-black text-red-600">{simulation.incomeDropPct.toFixed(1)}%</p>
                </div>
              </div>
              {simulation.runway >= 0 && (
                <p className="text-xs text-red-600 font-bold mt-3 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  Con este escenario, tus ahorros duran {simulation.runway} meses
                </p>
              )}
              <button onClick={() => setRemovedSourceIds(new Set())} className="mt-3 text-[10px] text-red-500 font-bold underline">Resetear simulación</button>
            </div>
          )}
        </div>

        {/* EXPENSE ADJUSTMENT */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">tune</span>
            Ajustar Gastos
          </h3>
          <div className="flex gap-2">
            {[-20, -10, 0, 10, 20].map(pct => (
              <button
                key={pct}
                onClick={() => setExpenseAdjust(pct)}
                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all border-2 ${
                  expenseAdjust === pct
                    ? pct < 0 ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'
                    : pct > 0 ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600'
                    : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                {pct > 0 ? '+' : ''}{pct}%
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-2 text-center">
            Gastos base: {formatMoney(lastMonthData.totalExpense)} → Simulado: {formatMoney(simulation.adjustedExpense)}
          </p>
        </div>

        {/* 6-MONTH PROJECTION */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            Proyección a 6 Meses
          </h3>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2">
              <span className="text-[10px] font-bold text-slate-400 w-10 text-right">Hoy</span>
              <div className="flex-1 h-7 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                <div className="h-full bg-blue-500 rounded-lg transition-all" style={{ width: `${Math.max(5, (currentBalance / maxProjection) * 100)}%` }} />
              </div>
              <span className={`text-xs font-bold w-24 text-right ${privacyMode ? 'blur-sm' : ''}`}>{formatMoney(currentBalance)}</span>
            </div>
            {simulation.projection.map((p, i) => {
              const pct = Math.max(5, (Math.abs(p.balance) / maxProjection) * 100);
              return (
                <div key={i} className="flex items-center gap-3 p-2">
                  <span className="text-[10px] font-bold text-slate-400 w-10 text-right uppercase">{p.month}</span>
                  <div className="flex-1 h-7 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                    <div className={`h-full rounded-lg transition-all ${p.balance >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`text-xs font-bold w-24 text-right ${privacyMode ? 'blur-sm' : ''} ${p.balance < 0 ? 'text-red-500' : ''}`}>{formatMoney(p.balance)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* TOP EXPENSE CATEGORIES */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Dónde se va tu plata ({lastMonthData.monthLabel})</h3>
          <div className="space-y-2">
            {Object.entries(lastMonthData.categories)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 8)
              .map(([cat, amount]) => {
                const pct = lastMonthData.totalExpense > 0 ? (amount / lastMonthData.totalExpense) * 100 : 0;
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-xs font-bold w-24 truncate text-slate-500">{cat}</span>
                    <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all opacity-70" style={{ width: `${pct}%` }} />
                    </div>
                    <span className={`text-xs font-bold w-20 text-right ${privacyMode ? 'blur-sm' : ''}`}>{formatMoney(amount)}</span>
                    <span className="text-[10px] text-slate-400 w-10 text-right">{pct.toFixed(0)}%</span>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-sm text-blue-800 dark:text-blue-300 leading-relaxed border border-blue-100 dark:border-blue-800">
          <p className="flex items-start gap-2">
            <span className="material-symbols-outlined text-lg shrink-0">info</span>
            <span>Simulación basada en tus gastos de {lastMonthData.monthLabel} ({lastMonthData.transactionCount} transacciones) y tus fuentes de ingreso activas. Tocá fuentes para simular renuncias.</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default FutureSimulator;
