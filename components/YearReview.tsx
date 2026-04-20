
import React, { useMemo, useState } from 'react';
import { FinancialProfile, Transaction } from '../types';
import { formatMoney, formatUSD, getDollarRate, getSalaryForMonth, isOneTimePurchase } from '../utils';

interface Props {
  profile: FinancialProfile;
  transactions: Transaction[];
  balance: number;
  onBack: () => void;
  privacyMode?: boolean;
}

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const YearReview: React.FC<Props> = ({ profile, transactions, balance, onBack, privacyMode }) => {
  const dollarRate = getDollarRate(profile);
  const [year, setYear] = useState(new Date().getFullYear());
  const blur = privacyMode ? 'blur-sm' : '';
  const sources = (profile.incomeSources || []).filter(s => s.isActive !== false);

  const data = useMemo(() => {
    const monthlyData: { key: string; label: string; income: number; expense: number; net: number }[] = [];
    let totalIncome = 0, totalExpense = 0, totalRecurringExpense = 0, totalOneTimeExpense = 0, totalTxCount = 0;
    let bestMonth = { key: '', net: -Infinity, label: '' };
    let worstMonth = { key: '', net: Infinity, label: '' };
    const catTotals: Record<string, number> = {};

    for (let m = 0; m < 12; m++) {
      const key = `${year}-${String(m + 1).padStart(2, '0')}`;
      const label = MONTH_NAMES[m];
      const income = getSalaryForMonth(profile, key, dollarRate);
      const monthTxs = transactions.filter(t => t.type === 'expense' && t.date.startsWith(key));
      const expense = monthTxs.reduce((a, t) => a + t.amount, 0);
      const net = income - expense;

      totalIncome += income;
      totalExpense += expense;
      totalTxCount += monthTxs.length;

      monthTxs.forEach(t => {
        if (isOneTimePurchase(t)) {
          totalOneTimeExpense += t.amount;
        } else {
          totalRecurringExpense += t.amount;
          catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
        }
      });

      if (net > bestMonth.net && (income > 0 || expense > 0)) bestMonth = { key, net, label: `${label} ${year}` };
      if (net < worstMonth.net && (income > 0 || expense > 0)) worstMonth = { key, net, label: `${label} ${year}` };

      monthlyData.push({ key, label, income, expense, net });
    }

    const totalNet = totalIncome - totalExpense;
    const avgSavingsRate = totalIncome > 0 ? (totalNet / totalIncome) * 100 : 0;
    const avgMonthlyIncome = totalIncome / 12;
    const avgMonthlyExpense = totalRecurringExpense / 12;

    // Top categories
    const topCategories = Object.entries(catTotals).sort(([, a], [, b]) => b - a).slice(0, 5);

    // Positive months count
    const positiveMonths = monthlyData.filter(m => m.net > 0 && (m.income > 0 || m.expense > 0)).length;
    const activeMonths = monthlyData.filter(m => m.income > 0 || m.expense > 0).length;

    // Income source rankings
    const sourceStats = sources.map(src => {
      let yearTotal = 0;
      for (let m = 0; m < 12; m++) {
        const key = `${year}-${String(m + 1).padStart(2, '0')}`;
        const mode = src.incomeMode || (src.isCreatorSource ? 'VARIABLE' : 'FIXED');
        let val = 0;
        if (mode === 'VARIABLE') {
          val = (src.payments || []).filter(p => p.month.startsWith(key)).reduce((a, p) => a + p.realAmount, 0);
        } else if (mode === 'PER_DELIVERY') {
          val = (src.posts || []).filter(p => p.isPaid && p.date.startsWith(key)).reduce((a, p) => a + p.amount, 0);
        } else {
          val = src.amount; if (src.frequency === 'BIWEEKLY') val *= 2; if (src.frequency === 'ONE_TIME') val = 0;
        }
        if (src.currency === 'USD') val *= dollarRate;
        yearTotal += val;
      }
      return { name: src.name, total: yearTotal };
    }).sort((a, b) => b.total - a.total);

    // Delivery stats
    let totalDeliveries = 0;
    sources.forEach(src => {
      const mode = src.incomeMode || (src.isCreatorSource ? 'VARIABLE' : 'FIXED');
      if (mode === 'PER_DELIVERY') {
        totalDeliveries += (src.posts || []).filter(p => p.date.startsWith(String(year))).length;
      } else if (src.targetPosts && src.targetPosts > 0) {
        for (let m = 0; m < 12; m++) {
          const key = `${year}-${String(m + 1).padStart(2, '0')}`;
          const payment = (src.payments || []).find(p => p.month.startsWith(key));
          totalDeliveries += payment?.postsCompleted || 0;
        }
      }
    });

    return {
      monthlyData, totalIncome, totalExpense, totalRecurringExpense, totalOneTimeExpense, totalNet, avgSavingsRate,
      avgMonthlyIncome, avgMonthlyExpense, bestMonth, worstMonth,
      topCategories, positiveMonths, activeMonths, sourceStats,
      totalTxCount, totalDeliveries,
    };
  }, [year, profile, transactions, dollarRate, sources]);

  const maxMonthVal = Math.max(...data.monthlyData.map(m => Math.max(m.income, m.expense)), 1);

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      <div className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-white/30 dark:border-slate-700/40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><span className="material-symbols-outlined">arrow_back</span></button>
          <div><h2 className="text-lg font-bold">Resumen Anual</h2><p className="text-[10px] text-slate-400 font-bold uppercase">Year in Review</p></div>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          <button onClick={() => setYear(year - 1)} className="size-8 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-slate-700"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
          <span className="text-sm font-black w-12 text-center">{year}</span>
          <button onClick={() => setYear(year + 1)} className="size-8 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-slate-700"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
        </div>
      </div>

      <div className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-6 space-y-6 pb-24">

        {/* HERO */}
        <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white rounded-3xl p-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
          <div className="relative z-10 text-center">
            <p className="text-xs text-purple-200 font-bold uppercase tracking-widest mb-2">Tu {year} en números</p>
            <p className={`text-5xl font-black tracking-tight mb-1 ${blur}`}>{formatMoney(data.totalNet)}</p>
            <p className="text-sm text-purple-200">{data.totalNet >= 0 ? 'Ahorraste' : 'Déficit de'} en el año</p>
            <div className="flex justify-center gap-4 mt-5">
              <div className="bg-white/15 rounded-xl px-4 py-2 backdrop-blur-sm">
                <p className="text-[10px] opacity-70">Ingresó</p>
                <p className={`text-sm font-black ${blur}`}>{formatMoney(data.totalIncome)}</p>
              </div>
              <div className="bg-white/15 rounded-xl px-4 py-2 backdrop-blur-sm">
                <p className="text-[10px] opacity-70">Gastó</p>
                <p className={`text-sm font-black ${blur}`}>{formatMoney(data.totalExpense)}</p>
              </div>
              <div className="bg-white/15 rounded-xl px-4 py-2 backdrop-blur-sm">
                <p className="text-[10px] opacity-70">Ahorro</p>
                <p className="text-sm font-black">{data.avgSavingsRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* QUICK STATS */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-3 text-center border border-slate-200 dark:border-slate-700">
            <p className="text-[8px] text-slate-400 font-bold uppercase">Meses +</p>
            <p className="text-xl font-black text-emerald-500">{data.positiveMonths}</p>
            <p className="text-[9px] text-slate-400">de {data.activeMonths}</p>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-3 text-center border border-slate-200 dark:border-slate-700">
            <p className="text-[8px] text-slate-400 font-bold uppercase">Movimientos</p>
            <p className="text-xl font-black">{data.totalTxCount}</p>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-3 text-center border border-slate-200 dark:border-slate-700">
            <p className="text-[8px] text-slate-400 font-bold uppercase">Entregas</p>
            <p className="text-xl font-black text-indigo-500">{data.totalDeliveries}</p>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-3 text-center border border-slate-200 dark:border-slate-700">
            <p className="text-[8px] text-slate-400 font-bold uppercase">Fuentes</p>
            <p className="text-xl font-black text-blue-500">{sources.length}</p>
          </div>
        </div>

        {/* MONTHLY CHART */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Mes a Mes</h3>
          <div className="space-y-2">
            {data.monthlyData.map(m => {
              const incW = (m.income / maxMonthVal) * 100;
              const expW = (m.expense / maxMonthVal) * 100;
              const hasData = m.income > 0 || m.expense > 0;
              return (
                <div key={m.key} className={`${!hasData ? 'opacity-30' : ''}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-slate-400 w-7">{m.label}</span>
                    <div className="flex-1 space-y-0.5">
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${incW}%` }} />
                      </div>
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${expW}%` }} />
                      </div>
                    </div>
                    <span className={`text-[10px] font-black w-16 text-right ${m.net >= 0 ? 'text-emerald-500' : 'text-red-500'} ${blur}`}>
                      {hasData ? (m.net >= 0 ? '+' : '') + formatMoney(m.net).replace('$\u00a0','$') : '-'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1 text-[9px] text-slate-400"><span className="size-2 rounded-full bg-emerald-500" /> Ingresos</span>
            <span className="flex items-center gap-1 text-[9px] text-slate-400"><span className="size-2 rounded-full bg-red-400" /> Gastos</span>
          </div>
        </div>

        {/* BEST & WORST */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-5 border border-emerald-200 dark:border-emerald-800 text-center">
            <span className="text-3xl mb-2 block">🏆</span>
            <p className="text-[9px] text-emerald-600 font-bold uppercase">Mejor Mes</p>
            <p className="text-sm font-black mt-1">{data.bestMonth.label || '-'}</p>
            <p className={`text-lg font-black text-emerald-600 ${blur}`}>{data.bestMonth.net > -Infinity ? '+' + formatMoney(data.bestMonth.net) : '-'}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-5 border border-red-200 dark:border-red-800 text-center">
            <span className="text-3xl mb-2 block">📉</span>
            <p className="text-[9px] text-red-600 font-bold uppercase">Peor Mes</p>
            <p className="text-sm font-black mt-1">{data.worstMonth.label || '-'}</p>
            <p className={`text-lg font-black text-red-600 ${blur}`}>{data.worstMonth.net < Infinity ? formatMoney(data.worstMonth.net) : '-'}</p>
          </div>
        </div>

        {/* INCOME SOURCE RANKING */}
        {data.sourceStats.length > 0 && (
          <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Ranking de Ingresos</h3>
            <div className="space-y-3">
              {data.sourceStats.map((s, i) => {
                const pct = data.totalIncome > 0 ? (s.total / data.totalIncome) * 100 : 0;
                return (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="text-lg w-8 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{s.name}</p>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-1">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-black ${blur}`}>{formatMoney(s.total)}</p>
                      <p className="text-[10px] text-slate-400">{pct.toFixed(1)}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TOP EXPENSE CATEGORIES */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Dónde se fue tu plata</h3>
          <div className="space-y-3">
            {data.topCategories.map(([cat, amount], i) => {
              const pct = data.totalExpense > 0 ? (amount / data.totalExpense) * 100 : 0;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-lg w-8 text-center">{i === 0 ? '💸' : i === 1 ? '💰' : '📊'}</span>
                  <div className="flex-1">
                    <div className="flex justify-between"><p className="text-sm font-bold">{cat}</p><p className={`text-sm font-black ${blur}`}>{formatMoney(amount)}</p></div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-1"><div className="h-full bg-red-400 rounded-full" style={{ width: `${pct}%` }} /></div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{pct.toFixed(1)}% del total • ~{formatMoney(amount / 12)}/mes</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AVERAGES */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 text-center">
            <p className="text-[9px] text-slate-400 font-bold uppercase">Promedio Mensual Ingreso</p>
            <p className={`text-xl font-black text-emerald-500 mt-1 ${blur}`}>{formatMoney(data.avgMonthlyIncome)}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 text-center">
            <p className="text-[9px] text-slate-400 font-bold uppercase">Promedio Mensual Gasto</p>
            <p className={`text-xl font-black text-red-500 mt-1 ${blur}`}>{formatMoney(data.avgMonthlyExpense)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YearReview;
