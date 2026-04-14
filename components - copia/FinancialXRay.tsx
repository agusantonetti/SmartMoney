
import React, { useMemo } from 'react';
import { FinancialProfile, FinancialMetrics, Transaction } from '../types';
import { formatMoney, formatMoneyUSD, getDollarRate, getCurrentMonthKey, getPrevMonthKey, formatMonthKey } from '../utils';

interface Props {
  profile: FinancialProfile;
  metrics: FinancialMetrics;
  transactions: Transaction[];
  onBack: () => void;
}

const FinancialXRay: React.FC<Props> = ({ profile, metrics, transactions, onBack }) => {
  const dollarRate = getDollarRate(profile);
  const currentMonthKey = getCurrentMonthKey();
  const prevMonthKey = getPrevMonthKey(currentMonthKey);

  const data = useMemo(() => {
    // Ingresos desde sueldos
    const getSalary = (mk: string) => (profile.incomeSources || []).reduce((sum, src) => {
      if (src.isActive === false) return sum;
      let val = 0;
      if (src.isCreatorSource) {
        val = (src.payments?.filter(p => p.month.startsWith(mk)) || []).reduce((a, p) => a + p.realAmount, 0);
      } else {
        val = src.amount;
        if (src.frequency === 'BIWEEKLY') val *= 2;
        if (src.frequency === 'ONE_TIME') val = 0;
      }
      if (src.currency === 'USD') val *= dollarRate;
      return sum + val;
    }, 0);

    const currentIncome = getSalary(currentMonthKey);
    const prevIncome = getSalary(prevMonthKey);

    // Gastos del mes
    const currentExpenses = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonthKey));
    const prevExpenses = transactions.filter(t => t.type === 'expense' && t.date.startsWith(prevMonthKey));
    const totalExpense = currentExpenses.reduce((a, t) => a + t.amount, 0);
    const prevTotalExpense = prevExpenses.reduce((a, t) => a + t.amount, 0);

    // Ahorro
    const saving = currentIncome - totalExpense;
    const prevSaving = prevIncome - prevTotalExpense;

    // Top categorías
    const byCat: Record<string, number> = {};
    currentExpenses.forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
    const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Fuentes de ingreso detalle
    const sources = (profile.incomeSources || []).filter(s => s.isActive !== false).map(src => {
      let val = src.amount;
      if (src.frequency === 'BIWEEKLY') val *= 2;
      if (src.frequency === 'ONE_TIME') val = 0;
      if (src.isCreatorSource) {
        val = (src.payments?.filter(p => p.month.startsWith(currentMonthKey)) || []).reduce((a, p) => a + p.realAmount, 0);
      }
      const arsAmount = src.currency === 'USD' ? val * dollarRate : val;
      return { name: src.name, amount: val, arsAmount, currency: src.currency || 'ARS' };
    }).filter(s => s.amount > 0).sort((a, b) => b.arsAmount - a.arsAmount);

    // Distribución
    const patrimonio = metrics.balance;
    const apartado = metrics.totalReserved;
    const deudas = metrics.totalDebt;
    const libre = patrimonio - apartado;

    const calcPct = (c: number, p: number) => p === 0 ? (c === 0 ? 0 : 100) : ((c - p) / p) * 100;

    return {
      currentIncome, prevIncome, incomePct: calcPct(currentIncome, prevIncome),
      totalExpense, prevTotalExpense, expensePct: calcPct(totalExpense, prevTotalExpense),
      saving, prevSaving, savingPct: calcPct(saving, prevSaving),
      topCats, sources,
      patrimonio, apartado, deudas, libre,
    };
  }, [transactions, profile, metrics, dollarRate, currentMonthKey, prevMonthKey]);

  const StatCard = ({ label, icon, amount, prevAmount, pct, color, inverse = false }: { label: string, icon: string, amount: number, prevAmount: number, pct: number, color: string, inverse?: boolean }) => {
    const isGood = inverse ? pct < 0 : pct > 0;
    return (
      <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-4">
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`material-symbols-outlined text-[18px] text-${color}-500`}>{icon}</span>
          <span className="text-[10px] font-bold uppercase text-slate-400">{label}</span>
          {pct !== 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto ${isGood ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
              {pct > 0 ? '+' : ''}{pct.toFixed(0)}%
            </span>
          )}
        </div>
        <p className="text-xl font-black text-slate-900 dark:text-white">{formatMoney(amount)}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Anterior: {formatMoney(prevAmount)}</p>
      </div>
    );
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      <div className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-white/30 dark:border-slate-700/40 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="text-lg font-bold">Radiografía Financiera</h2>
          <p className="text-xs text-slate-500">{formatMonthKey(currentMonthKey)}</p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto p-6 space-y-5 pb-24">

        {/* PATRIMONIO HERO */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-blue-950/90 dark:via-slate-900 dark:to-slate-950 rounded-2xl p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 relative z-10">Patrimonio neto</p>
          <p className="text-4xl font-black relative z-10">{formatMoney(data.patrimonio)}</p>
          <p className="text-lg font-bold text-slate-400 relative z-10">= {formatMoneyUSD(data.patrimonio / dollarRate)}</p>
        </div>

        {/* RESUMEN DEL MES: 3 cards */}
        <div className="grid grid-cols-3 gap-2.5">
          <StatCard label="Ingresos" icon="trending_up" amount={data.currentIncome} prevAmount={data.prevIncome} pct={data.incomePct} color="emerald" />
          <StatCard label="Gastos" icon="trending_down" amount={data.totalExpense} prevAmount={data.prevTotalExpense} pct={data.expensePct} color="red" inverse />
          <StatCard label="Ahorro" icon="savings" amount={data.saving} prevAmount={data.prevSaving} pct={data.savingPct} color="blue" />
        </div>

        {/* FUENTES DE INGRESO */}
        {data.sources.length > 0 && (
          <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-4">
            <h3 className="text-xs font-bold uppercase text-slate-400 mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">payments</span>
              Fuentes de ingreso
            </h3>
            <div className="space-y-2">
              {data.sources.map((src, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-300">{src.name}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {formatMoney(src.arsAmount)}
                    </span>
                    {src.currency === 'USD' && (
                      <span className="text-[10px] text-slate-400 block">US$ {src.amount.toLocaleString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TOP GASTOS */}
        {data.topCats.length > 0 && (
          <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-4">
            <h3 className="text-xs font-bold uppercase text-slate-400 mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">leaderboard</span>
              Top gastos del mes
            </h3>
            <div className="space-y-2.5">
              {data.topCats.map(([cat, amount]) => {
                const pct = data.totalExpense > 0 ? (amount / data.totalExpense) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{cat}</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{formatMoney(amount)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-red-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DISTRIBUCIÓN DE TU PLATA */}
        <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">pie_chart</span>
            Distribución de tu plata
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-blue-500" />
                <span className="text-sm text-slate-600 dark:text-slate-300">Disponible libre</span>
              </div>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatMoney(data.libre)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-purple-500" />
                <span className="text-sm text-slate-600 dark:text-slate-300">Apartado (metas)</span>
              </div>
              <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{formatMoney(data.apartado)}</span>
            </div>
            {data.deudas > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-red-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-300">Deudas pendientes</span>
                </div>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">{formatMoney(data.deudas)}</span>
              </div>
            )}
          </div>
          {/* Mini visual bar */}
          <div className="flex h-3 rounded-full overflow-hidden mt-3 bg-slate-100 dark:bg-slate-800">
            {data.patrimonio > 0 && (
              <>
                <div className="bg-blue-500 transition-all duration-500" style={{ width: `${(data.libre / data.patrimonio) * 100}%` }} />
                <div className="bg-purple-500 transition-all duration-500" style={{ width: `${(data.apartado / data.patrimonio) * 100}%` }} />
                {data.deudas > 0 && <div className="bg-red-500 transition-all duration-500" style={{ width: `${(data.deudas / data.patrimonio) * 100}%` }} />}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default FinancialXRay;
