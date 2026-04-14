
import React, { useMemo } from 'react';
import { FinancialProfile, FinancialMetrics, Transaction } from '../types';
import { formatMoney, formatMoneyUSD, getDollarRate, getCurrentMonthKey, getPrevMonthKey, getSalaryForMonth } from '../utils';

interface Props {
  profile: FinancialProfile;
  metrics: FinancialMetrics;
  transactions: Transaction[];
  onBack: () => void;
  privacyMode?: boolean;
}

const FinancialXRay: React.FC<Props> = ({ profile, metrics, transactions, onBack, privacyMode }) => {
  const dollarRate = getDollarRate(profile);
  const currentMonthKey = getCurrentMonthKey();
  const prevMonthKey = getPrevMonthKey(currentMonthKey);
  const blur = privacyMode ? 'blur-sm' : '';

  const data = useMemo(() => {
    const sources = (profile.incomeSources || []).filter(s => s.isActive !== false);
    const now = new Date();
    const pfx = currentMonthKey;

    // Income
    const totalIncome = getSalaryForMonth(profile, pfx, dollarRate);
    const prevIncome = getSalaryForMonth(profile, prevMonthKey, dollarRate);

    // Expenses
    const currentExpenses = transactions.filter(t => t.type === 'expense' && t.date.startsWith(pfx));
    const totalExpense = currentExpenses.reduce((s, t) => s + t.amount, 0);
    const prevExpenses = transactions.filter(t => t.type === 'expense' && t.date.startsWith(prevMonthKey));
    const prevExpenseTotal = prevExpenses.reduce((s, t) => s + t.amount, 0);

    // Savings rate
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    const prevSavingsRate = prevIncome > 0 ? ((prevIncome - prevExpenseTotal) / prevIncome) * 100 : 0;

    // Income mix
    let fixedIncome = 0, variableIncome = 0, deliveryIncome = 0;
    sources.forEach(src => {
      const mode = src.incomeMode || (src.isCreatorSource ? 'VARIABLE' : 'FIXED');
      let val = 0;
      if (mode === 'VARIABLE') {
        val = src.payments?.filter(p => p.month.startsWith(pfx)).reduce((a, p) => a + p.realAmount, 0) || 0;
      } else if (mode === 'PER_DELIVERY') {
        val = (src.posts || []).filter(p => p.isPaid).reduce((a, p) => a + p.amount, 0);
      } else {
        val = src.amount; if (src.frequency === 'BIWEEKLY') val *= 2;
        if (src.frequency === 'ONE_TIME') val = 0;
      }
      if (src.currency === 'USD') val *= dollarRate;
      if (mode === 'FIXED') fixedIncome += val;
      else if (mode === 'VARIABLE') variableIncome += val;
      else deliveryIncome += val;
    });
    const fixedPct = totalIncome > 0 ? (fixedIncome / totalIncome) * 100 : 0;

    // Collection rate
    let totalExpected = 0, totalCollected = 0;
    sources.forEach(src => {
      const mode = src.incomeMode || (src.isCreatorSource ? 'VARIABLE' : 'FIXED');
      if (mode === 'FIXED') {
        let exp = src.amount; if (src.frequency === 'BIWEEKLY') exp *= 2;
        if (src.currency === 'USD') exp *= dollarRate;
        totalExpected += exp;
        const isPaid = src.payments?.some(p => p.month.startsWith(pfx) && p.isPaid);
        if (isPaid) totalCollected += exp;
      } else if (mode === 'PER_DELIVERY') {
        const paid = (src.posts || []).filter(p => p.isPaid).reduce((a, p) => a + p.amount, 0);
        if (src.currency === 'USD') { totalCollected += paid * dollarRate; }
        else totalCollected += paid;
      }
    });
    const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : (totalCollected > 0 ? 100 : 0);

    // Concentration
    const sourceIncomes = sources.map(src => {
      const mode = src.incomeMode || (src.isCreatorSource ? 'VARIABLE' : 'FIXED');
      let val = 0;
      if (mode === 'VARIABLE') val = src.payments?.filter(p => p.month.startsWith(pfx)).reduce((a, p) => a + p.realAmount, 0) || 0;
      else if (mode === 'PER_DELIVERY') val = (src.posts || []).filter(p => p.isPaid).reduce((a, p) => a + p.amount, 0);
      else { val = src.amount; if (src.frequency === 'BIWEEKLY') val *= 2; if (src.frequency === 'ONE_TIME') val = 0; }
      if (src.currency === 'USD') val *= dollarRate;
      return { name: src.name, amount: val };
    }).sort((a, b) => b.amount - a.amount);
    const topSourcePct = totalIncome > 0 && sourceIncomes[0] ? (sourceIncomes[0].amount / totalIncome) * 100 : 0;

    // Currency exposure
    const usdIncome = sources.filter(s => s.currency === 'USD').reduce((sum, src) => {
      const mode = src.incomeMode || (src.isCreatorSource ? 'VARIABLE' : 'FIXED');
      let v = src.amount;
      if (mode === 'VARIABLE') v = src.payments?.filter(p => p.month.startsWith(pfx)).reduce((a, p) => a + p.realAmount, 0) || 0;
      else if (mode === 'PER_DELIVERY') v = (src.posts || []).filter(p => p.isPaid).reduce((a, p) => a + p.amount, 0);
      else { if (src.frequency === 'BIWEEKLY') v *= 2; }
      return sum + v;
    }, 0);
    const usdPct = totalIncome > 0 ? ((usdIncome * dollarRate) / totalIncome) * 100 : 0;

    // Debt to income
    const totalDebt = metrics.totalDebt || 0;
    const debtToIncome = totalIncome > 0 ? (totalDebt / totalIncome) * 100 : 0;

    // Health score (0-100)
    let score = 50;
    if (savingsRate > 20) score += 15; else if (savingsRate > 10) score += 8; else if (savingsRate < 0) score -= 15;
    if (fixedPct > 50) score += 10; else if (fixedPct < 30) score -= 5;
    if (collectionRate > 80) score += 10; else if (collectionRate < 50) score -= 10;
    if (topSourcePct < 40) score += 10; else if (topSourcePct > 70) score -= 10;
    if (debtToIncome < 20) score += 5; else if (debtToIncome > 50) score -= 10;
    score = Math.max(0, Math.min(100, score));

    // Categories
    const categories: Record<string, number> = {};
    currentExpenses.forEach(t => { categories[t.category] = (categories[t.category] || 0) + t.amount; });

    // Personal inflation (3m and 6m comparison)
    const now2 = new Date();
    const m3 = new Date(now2.getFullYear(), now2.getMonth() - 3, 1);
    const m3Key = `${m3.getFullYear()}-${String(m3.getMonth() + 1).padStart(2, '0')}`;
    const m6 = new Date(now2.getFullYear(), now2.getMonth() - 6, 1);
    const m6Key = `${m6.getFullYear()}-${String(m6.getMonth() + 1).padStart(2, '0')}`;
    const m3Expenses: Record<string, number> = {};
    const m6Expenses: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense' && t.date.startsWith(m3Key)).forEach(t => { m3Expenses[t.category] = (m3Expenses[t.category] || 0) + t.amount; });
    transactions.filter(t => t.type === 'expense' && t.date.startsWith(m6Key)).forEach(t => { m6Expenses[t.category] = (m6Expenses[t.category] || 0) + t.amount; });

    const inflation: { cat: string; current: number; m3: number; m6: number; pct3: number; pct6: number }[] = [];
    Object.keys(categories).forEach(cat => {
      if (cat === 'Otros' || cat === 'Ingreso') return;
      const curr = categories[cat];
      const prev3 = m3Expenses[cat] || 0;
      const prev6 = m6Expenses[cat] || 0;
      if (prev3 > 0 || prev6 > 0) {
        inflation.push({
          cat, current: curr,
          m3: prev3, m6: prev6,
          pct3: prev3 > 0 ? ((curr - prev3) / prev3) * 100 : 0,
          pct6: prev6 > 0 ? ((curr - prev6) / prev6) * 100 : 0,
        });
      }
    });
    inflation.sort((a, b) => Math.abs(b.pct3) - Math.abs(a.pct3));

    return {
      totalIncome, prevIncome, totalExpense, prevExpenseTotal, savingsRate, prevSavingsRate,
      fixedIncome, variableIncome, deliveryIncome, fixedPct,
      collectionRate, topSourcePct, topSourceName: sourceIncomes[0]?.name || '-',
      usdPct, usdIncome, debtToIncome, totalDebt, score, sources, categories, inflation,
    };
  }, [profile, transactions, metrics, dollarRate, currentMonthKey]);

  const scoreColor = data.score >= 70 ? 'text-emerald-500' : data.score >= 45 ? 'text-amber-500' : 'text-red-500';
  const scoreBg = data.score >= 70 ? 'from-emerald-600 to-teal-700' : data.score >= 45 ? 'from-amber-500 to-orange-600' : 'from-red-600 to-rose-700';

  const MetricCard = ({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) => (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
      <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">{label}</p>
      <p className={`text-xl font-black ${color || ''} ${blur}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      <div className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-white/30 dark:border-slate-700/40 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><span className="material-symbols-outlined">arrow_back</span></button>
        <div><h2 className="text-lg font-bold">Radiografía Financiera</h2><p className="text-[10px] text-slate-400 font-bold uppercase">Análisis profundo</p></div>
      </div>

      <div className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-6 space-y-6 pb-24">
        {/* HEALTH SCORE */}
        <div className={`bg-gradient-to-br ${scoreBg} text-white rounded-3xl p-6 relative overflow-hidden shadow-xl`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-xs text-white/70 font-bold uppercase mb-1">Score de Salud Financiera</p>
              <p className="text-6xl font-black">{data.score}</p>
              <p className="text-sm text-white/80 mt-1">
                {data.score >= 70 ? 'Excelente — tus finanzas están sólidas' :
                 data.score >= 45 ? 'Aceptable — hay margen de mejora' :
                 'Atención — revisá tu situación financiera'}
              </p>
            </div>
            <div className="text-right">
              <span className="material-symbols-outlined text-6xl opacity-20">
                {data.score >= 70 ? 'verified' : data.score >= 45 ? 'info' : 'warning'}
              </span>
            </div>
          </div>
        </div>

        {/* KEY METRICS */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Tasa de Ahorro" value={`${data.savingsRate.toFixed(1)}%`} sub={data.savingsRate > data.prevSavingsRate ? '↑ Mejoró vs mes anterior' : '↓ Bajó vs mes anterior'} color={data.savingsRate > 15 ? 'text-emerald-500' : data.savingsRate > 0 ? 'text-amber-500' : 'text-red-500'} />
          <MetricCard label="Tasa de Cobranza" value={`${data.collectionRate.toFixed(0)}%`} sub="De tus sueldos fijos" color={data.collectionRate >= 80 ? 'text-emerald-500' : 'text-amber-500'} />
          <MetricCard label="Estabilidad" value={`${data.fixedPct.toFixed(0)}% fijo`} sub={`${(100 - data.fixedPct).toFixed(0)}% variable`} color={data.fixedPct > 50 ? 'text-blue-500' : 'text-amber-500'} />
          <MetricCard label="Concentración" value={`${data.topSourcePct.toFixed(0)}%`} sub={`Top: ${data.topSourceName}`} color={data.topSourcePct < 40 ? 'text-emerald-500' : data.topSourcePct < 60 ? 'text-amber-500' : 'text-red-500'} />
        </div>

        {/* INCOME VS EXPENSE */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Flujo del Mes</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1"><span className="text-xs font-bold text-emerald-500">Ingresos</span><span className={`text-xs font-black ${blur}`}>{formatMoney(data.totalIncome)}</span></div>
              <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} /></div>
            </div>
            <div>
              <div className="flex justify-between mb-1"><span className="text-xs font-bold text-red-500">Gastos</span><span className={`text-xs font-black ${blur}`}>{formatMoney(data.totalExpense)}</span></div>
              <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full" style={{ width: `${data.totalIncome > 0 ? Math.min(100, (data.totalExpense / data.totalIncome) * 100) : 0}%` }} /></div>
            </div>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400">Neto</span>
              <span className={`text-lg font-black ${data.totalIncome - data.totalExpense >= 0 ? 'text-emerald-500' : 'text-red-500'} ${blur}`}>
                {data.totalIncome - data.totalExpense >= 0 ? '+' : ''}{formatMoney(data.totalIncome - data.totalExpense)}
              </span>
            </div>
          </div>
        </div>

        {/* INCOME MIX */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Composición del Ingreso</h3>
          <div className="flex gap-2 mb-4">
            {data.fixedIncome > 0 && <div className="bg-blue-500 h-4 rounded-full transition-all" style={{ flex: data.fixedIncome }} title="Fijo" />}
            {data.variableIncome > 0 && <div className="bg-amber-500 h-4 rounded-full transition-all" style={{ flex: data.variableIncome }} title="Variable" />}
            {data.deliveryIncome > 0 && <div className="bg-indigo-500 h-4 rounded-full transition-all" style={{ flex: data.deliveryIncome }} title="Por Entrega" />}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center"><div className="size-2 bg-blue-500 rounded-full mx-auto mb-1" /><p className="text-[9px] text-slate-400 font-bold">FIJO</p><p className={`text-sm font-black ${blur}`}>{formatMoney(data.fixedIncome)}</p></div>
            <div className="text-center"><div className="size-2 bg-amber-500 rounded-full mx-auto mb-1" /><p className="text-[9px] text-slate-400 font-bold">VARIABLE</p><p className={`text-sm font-black ${blur}`}>{formatMoney(data.variableIncome)}</p></div>
            <div className="text-center"><div className="size-2 bg-indigo-500 rounded-full mx-auto mb-1" /><p className="text-[9px] text-slate-400 font-bold">ENTREGAS</p><p className={`text-sm font-black ${blur}`}>{formatMoney(data.deliveryIncome)}</p></div>
          </div>
        </div>

        {/* EXTRA METRICS */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Exposición USD" value={`${data.usdPct.toFixed(0)}%`} sub={data.usdIncome > 0 ? `~USD ${Math.round(data.usdIncome)}` : 'Sin ingresos USD'} color="text-emerald-500" />
          <MetricCard label="Deuda / Ingreso" value={`${data.debtToIncome.toFixed(0)}%`} sub={data.totalDebt > 0 ? formatMoney(data.totalDebt) : 'Sin deudas'} color={data.debtToIncome < 20 ? 'text-emerald-500' : data.debtToIncome < 50 ? 'text-amber-500' : 'text-red-500'} />
        </div>

        {/* TOP CATEGORIES */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Top Gastos del Mes</h3>
          <div className="space-y-2">
            {Object.entries(data.categories).sort(([,a],[,b]) => b - a).slice(0, 6).map(([cat, amount]) => {
              const pct = data.totalExpense > 0 ? (amount / data.totalExpense) * 100 : 0;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs font-bold w-24 truncate text-slate-500">{cat}</span>
                  <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full opacity-70" style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`text-xs font-bold w-20 text-right ${blur}`}>{formatMoney(amount)}</span>
                  <span className="text-[10px] text-slate-400 w-10 text-right">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
        {/* PERSONAL INFLATION */}
        {data.inflation.length > 0 && (
          <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">local_fire_department</span>
              Tu Inflación Personal
            </h3>
            <p className="text-[10px] text-slate-400 mb-4">Cómo cambió tu gasto por categoría vs hace 3 y 6 meses</p>
            <div className="space-y-3">
              {data.inflation.slice(0, 8).map(item => (
                <div key={item.cat} className="flex items-center gap-3">
                  <span className="text-xs font-bold w-24 truncate text-slate-500">{item.cat}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <span className={`text-[10px] font-black w-14 text-center px-1.5 py-0.5 rounded-full ${
                      item.pct3 > 20 ? 'bg-red-100 dark:bg-red-900/20 text-red-600' :
                      item.pct3 < -10 ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600' :
                      'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {item.m3 > 0 ? (item.pct3 > 0 ? '+' : '') + item.pct3.toFixed(0) + '%' : '-'}
                    </span>
                    <span className="text-[9px] text-slate-400">3m</span>
                    <span className={`text-[10px] font-black w-14 text-center px-1.5 py-0.5 rounded-full ${
                      item.pct6 > 30 ? 'bg-red-100 dark:bg-red-900/20 text-red-600' :
                      item.pct6 < -10 ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600' :
                      'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {item.m6 > 0 ? (item.pct6 > 0 ? '+' : '') + item.pct6.toFixed(0) + '%' : '-'}
                    </span>
                    <span className="text-[9px] text-slate-400">6m</span>
                  </div>
                  <span className={`text-xs font-bold w-20 text-right ${blur}`}>{formatMoney(item.current)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialXRay;
