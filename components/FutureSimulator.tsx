
import React, { useMemo, useState } from 'react';
import { Transaction, FinancialProfile, IncomeSource } from '../types';
import { formatMoney, formatUSD, getDollarRate, isOneTimePurchase } from '../utils';

interface Props {
  transactions: Transaction[];
  profile: FinancialProfile;
  currentBalance: number;
  onBack: () => void;
  privacyMode?: boolean;
}

const getEffectiveMode = (src: IncomeSource): string =>
  src.incomeMode || (src.isCreatorSource ? 'VARIABLE' : 'FIXED');

const FutureSimulator: React.FC<Props> = ({ transactions, profile, currentBalance, onBack, privacyMode }) => {
  const dollarRate = getDollarRate(profile);
  const sources = (profile.incomeSources || []).filter(s => s.isActive !== false);
  const [removedSourceIds, setRemovedSourceIds] = useState<Set<string>>(new Set());
  const [expenseAdjust, setExpenseAdjust] = useState(0);
  const blur = privacyMode ? 'blur-sm' : '';

  // 3-month average expense baseline
  const baselineData = useMemo(() => {
    const now = new Date();
    const monthDetails: { label: string; expense: number; categories: Record<string, number> }[] = [];

    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const exps = transactions.filter(t => t.type === 'expense' && t.date.startsWith(mk) && !isOneTimePurchase(t));
      const total = exps.reduce((s, t) => s + t.amount, 0);
      if (total > 0) {
        const cats: Record<string, number> = {};
        exps.forEach(t => { cats[t.category] = (cats[t.category] || 0) + t.amount; });
        monthDetails.push({ label: d.toLocaleDateString('es-AR', { month: 'long' }), expense: total, categories: cats });
      }
    }

    const avgExpense = monthDetails.length > 0
      ? monthDetails.reduce((s, m) => s + m.expense, 0) / monthDetails.length
      : 0;

    // Aggregate categories as averages
    const aggCats: Record<string, number> = {};
    monthDetails.forEach(m => {
      Object.entries(m.categories).forEach(([cat, amt]) => {
        aggCats[cat] = (aggCats[cat] || 0) + amt / monthDetails.length;
      });
    });

    const latestLabel = monthDetails[0]?.label || 'último mes';
    return { avgExpense, categories: aggCats, latestLabel, monthCount: monthDetails.length, monthDetails };
  }, [transactions]);

  // Monthly ARS income for a source
  const getSourceIncomeARS = (src: IncomeSource): number => {
    const mode = getEffectiveMode(src);
    const now = new Date();
    let val = 0;

    if (mode === 'VARIABLE') {
      const pfx = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      val = src.payments?.filter(p => p.month.startsWith(pfx)).reduce((a, p) => a + p.realAmount, 0) || 0;
      if (val === 0) {
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const ppfx = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
        val = src.payments?.filter(p => p.month.startsWith(ppfx)).reduce((a, p) => a + p.realAmount, 0) || 0;
      }
    } else if (mode === 'PER_DELIVERY') {
      const pfx = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      val = (src.posts || []).filter(p => p.date.startsWith(pfx)).reduce((a, p) => a + p.amount, 0);
      if (val === 0) {
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const ppfx = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
        val = (src.posts || []).filter(p => p.date.startsWith(ppfx)).reduce((a, p) => a + p.amount, 0);
      }
    } else {
      val = src.amount;
      if (src.frequency === 'BIWEEKLY') val *= 2;
      if (src.frequency === 'ONE_TIME') val = 0;
    }

    if (src.currency === 'USD') val *= dollarRate;
    return val;
  };

  // Full simulation
  const sim = useMemo(() => {
    const baseExpense = baselineData.avgExpense;
    const adjustedExpense = baseExpense * (1 + expenseAdjust / 100);

    const originalIncome = sources.reduce((s, src) => s + getSourceIncomeARS(src), 0);
    const currentIncome = sources
      .filter(s => !removedSourceIds.has(s.id))
      .reduce((s, src) => s + getSourceIncomeARS(src), 0);

    const originalCashflow = originalIncome - baseExpense;
    const monthlyCashflow = currentIncome - adjustedExpense;
    const lostIncome = originalIncome - currentIncome;
    const incomeDropPct = originalIncome > 0 ? (lostIncome / originalIncome) * 100 : 0;
    const originalSavingsRate = originalIncome > 0 ? (originalCashflow / originalIncome) * 100 : 0;
    const savingsRate = currentIncome > 0 ? (monthlyCashflow / currentIncome) * 100 : (monthlyCashflow < 0 ? -100 : 0);

    // Runway: months until balance = 0
    const runway = monthlyCashflow < 0 ? Math.floor(currentBalance / Math.abs(monthlyCashflow)) : -1;

    // Danger threshold: 3 months of expenses
    const dangerThreshold = adjustedExpense * 3;
    const monthsUntilDanger = (() => {
      if (currentBalance <= dangerThreshold) return 0;
      if (monthlyCashflow >= 0) return -1;
      return Math.floor((currentBalance - dangerThreshold) / Math.abs(monthlyCashflow));
    })();

    // Break-even: minimum new income or expense cut
    const replacementIncome = monthlyCashflow < 0 ? Math.abs(monthlyCashflow) : 0;
    const requiredExpenseCut = monthlyCashflow < 0 ? Math.abs(monthlyCashflow) : 0;
    const requiredExpenseCutPct = adjustedExpense > 0 ? (requiredExpenseCut / adjustedExpense) * 100 : 0;
    const replacementToMatchOriginal = originalCashflow - monthlyCashflow;

    // Risk level
    const riskLevel = (() => {
      if (removedSourceIds.size === 0) return 'none' as const;
      if (monthlyCashflow < 0 && runway >= 0 && runway <= 6) return 'red' as const;
      if (monthlyCashflow < 0 || savingsRate < 10 || incomeDropPct > 35) return 'yellow' as const;
      return 'green' as const;
    })();

    // 12-month projection
    const projection: { month: string; balance: number }[] = [];
    let running = currentBalance;
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      running += monthlyCashflow;
      projection.push({ month: d.toLocaleDateString('es-AR', { month: 'short' }), balance: running });
    }

    // Removed source details
    const removedSources = sources
      .filter(s => removedSourceIds.has(s.id))
      .map(s => ({ src: s, amount: getSourceIncomeARS(s), pct: originalIncome > 0 ? (getSourceIncomeARS(s) / originalIncome) * 100 : 0 }));

    // Top categories for cut suggestions
    const topCats = Object.entries(baselineData.categories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat, avg]) => ({ cat, avg, cut25: avg * 0.25 }));

    return {
      originalIncome, currentIncome, adjustedExpense, baseExpense,
      originalCashflow, monthlyCashflow, lostIncome, incomeDropPct,
      originalSavingsRate, savingsRate, runway, monthsUntilDanger,
      replacementIncome, replacementToMatchOriginal, requiredExpenseCut, requiredExpenseCutPct,
      riskLevel, projection, removedSources, topCats, dangerThreshold,
    };
  }, [sources, removedSourceIds, expenseAdjust, baselineData, currentBalance, dollarRate]);

  const maxProjection = Math.max(...sim.projection.map(p => Math.abs(p.balance)), Math.abs(currentBalance), 1);

  const toggleSource = (id: string) => {
    const next = new Set(removedSourceIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setRemovedSourceIds(next);
  };

  const RISK = {
    red: {
      label: 'RIESGO CRÍTICO',
      icon: 'crisis_alert',
      bg: 'bg-red-500',
      textColor: 'text-red-600 dark:text-red-400',
      cardBg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-300 dark:border-red-700',
      desc: 'Con este escenario tus ahorros se agotan en menos de 6 meses.',
    },
    yellow: {
      label: 'RIESGO MODERADO',
      icon: 'warning',
      bg: 'bg-amber-500',
      textColor: 'text-amber-600 dark:text-amber-400',
      cardBg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-300 dark:border-amber-700',
      desc: 'Podés sostenerte un tiempo, pero necesitás reemplazar ingresos o ajustar gastos.',
    },
    green: {
      label: 'IMPACTO MANEJABLE',
      icon: 'check_circle',
      bg: 'bg-emerald-500',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      cardBg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-300 dark:border-emerald-700',
      desc: 'El impacto es asumible. Tu tasa de ahorro se mantiene positiva.',
    },
    none: { label: '', icon: '', bg: '', textColor: '', cardBg: '', border: '', desc: '' },
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      <div className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-white/30 dark:border-slate-700/40 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="text-lg font-bold">Simulador: ¿Y si dejo un trabajo?</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase">
            Gastos: prom. {baselineData.monthCount} {baselineData.monthCount === 1 ? 'mes' : 'meses'} ({baselineData.latestLabel})
          </p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-6 space-y-6 pb-24">

        {/* HERO */}
        <div className={`rounded-3xl p-6 text-white shadow-xl relative overflow-hidden ${sim.monthlyCashflow >= 0 ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-red-600 to-orange-700'}`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="relative z-10">
            <p className="text-xs text-white/70 font-bold uppercase mb-1">
              Flujo mensual {removedSourceIds.size > 0 ? 'simulado' : 'actual'}
            </p>
            <h1 className={`text-4xl font-black tracking-tight ${blur}`}>
              {sim.monthlyCashflow >= 0 ? '+' : ''}{formatMoney(sim.monthlyCashflow)}
            </h1>
            {removedSourceIds.size > 0 && (
              <p className="text-sm text-white/80 mt-1">
                vs {sim.originalCashflow >= 0 ? '+' : ''}{formatMoney(sim.originalCashflow)} sin cambios
              </p>
            )}
            <div className="flex flex-wrap gap-3 mt-4">
              <div className="bg-black/20 rounded-xl px-4 py-2">
                <p className="text-[10px] opacity-70">Ingresos</p>
                <p className={`font-bold ${blur}`}>{formatMoney(sim.currentIncome)}</p>
              </div>
              <div className="bg-black/20 rounded-xl px-4 py-2">
                <p className="text-[10px] opacity-70">Gastos prom.</p>
                <p className={`font-bold ${blur}`}>{formatMoney(sim.adjustedExpense)}</p>
              </div>
              <div className="bg-white/20 rounded-xl px-4 py-2">
                <p className="text-[10px] opacity-70">Tasa de ahorro</p>
                <p className="font-bold">{sim.savingsRate.toFixed(1)}%</p>
              </div>
              {sim.runway >= 0 && (
                <div className="bg-white/20 rounded-xl px-4 py-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-yellow-300 text-xl">schedule</span>
                  <div>
                    <p className="text-[10px] opacity-70">Runway</p>
                    <p className="font-bold">{sim.runway} meses</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SELECT SOURCES */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">work_off</span>
            ¿Qué trabajo/s dejás?
          </h3>
          <p className="text-[10px] text-slate-400 mb-4">Tocá una o más fuentes para simular el escenario</p>
          <div className="space-y-2">
            {sources.map(src => {
              const isRemoved = removedSourceIds.has(src.id);
              const srcIncome = getSourceIncomeARS(src);
              const pct = sim.originalIncome > 0 ? (srcIncome / sim.originalIncome) * 100 : 0;
              const mode = getEffectiveMode(src);
              return (
                <button
                  key={src.id}
                  onClick={() => toggleSource(src.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left border-2 ${
                    isRemoved
                      ? 'bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-800'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`size-11 rounded-full flex items-center justify-center shrink-0 transition-all ${isRemoved ? 'bg-red-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                    <span className="material-symbols-outlined">{isRemoved ? 'work_off' : 'work'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${isRemoved ? 'line-through text-slate-400' : ''}`}>{src.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 w-20 overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {pct.toFixed(1)}% del ingreso · {mode === 'FIXED' ? 'Fijo' : mode === 'VARIABLE' ? 'Variable' : 'Por entrega'}
                        {src.currency === 'USD' ? ' · USD' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-black ${blur} ${isRemoved ? 'text-red-400' : ''}`}>
                      {isRemoved ? '−' : ''}{formatMoney(srcIncome)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* IMPACT ANALYSIS — only when sources removed */}
        {removedSourceIds.size > 0 && (() => {
          const risk = RISK[sim.riskLevel];
          return (
            <div className={`rounded-3xl border-2 p-6 space-y-5 ${risk.cardBg} ${risk.border}`}>

              {/* Risk badge */}
              <div className="flex items-center gap-3">
                <div className={`size-12 rounded-2xl ${risk.bg} flex items-center justify-center text-white shadow-lg shrink-0`}>
                  <span className="material-symbols-outlined text-xl">{risk.icon}</span>
                </div>
                <div>
                  <p className={`text-sm font-black uppercase tracking-wide ${risk.textColor}`}>{risk.label}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{risk.desc}</p>
                </div>
              </div>

              {/* Key metrics 2x2 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/70 dark:bg-slate-900/60 rounded-2xl p-4">
                  <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Ingreso perdido</p>
                  <p className={`text-xl font-black text-red-600 dark:text-red-400 ${blur}`}>−{formatMoney(sim.lostIncome)}</p>
                  <p className="text-[10px] text-red-500 font-bold mt-0.5">{sim.incomeDropPct.toFixed(1)}% de tus ingresos</p>
                </div>
                <div className="bg-white/70 dark:bg-slate-900/60 rounded-2xl p-4">
                  <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Flujo mensual</p>
                  <p className={`text-xl font-black ${blur} ${sim.monthlyCashflow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {sim.monthlyCashflow >= 0 ? '+' : ''}{formatMoney(sim.monthlyCashflow)}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">era {sim.originalCashflow >= 0 ? '+' : ''}{formatMoney(sim.originalCashflow)}</p>
                </div>
                <div className="bg-white/70 dark:bg-slate-900/60 rounded-2xl p-4">
                  <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Tasa de ahorro</p>
                  <p className={`text-xl font-black ${sim.savingsRate >= 15 ? 'text-emerald-600 dark:text-emerald-400' : sim.savingsRate >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                    {sim.savingsRate.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">era {sim.originalSavingsRate.toFixed(1)}%</p>
                </div>
                <div className="bg-white/70 dark:bg-slate-900/60 rounded-2xl p-4">
                  <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">
                    {sim.runway >= 0 ? 'Runway' : 'Estado'}
                  </p>
                  <p className={`text-xl font-black ${sim.runway < 0 ? 'text-emerald-600 dark:text-emerald-400' : sim.runway < 6 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {sim.runway >= 0 ? `${sim.runway} meses` : '∞'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                    {sim.runway >= 0 ? 'hasta agotar ahorros' : 'seguís creciendo'}
                  </p>
                </div>
              </div>

              {/* Decision window */}
              {sim.monthsUntilDanger >= 0 && (
                <div className={`rounded-2xl p-4 flex items-start gap-3 ${sim.monthsUntilDanger <= 3 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-white/70 dark:bg-slate-900/60'}`}>
                  <span className={`material-symbols-outlined shrink-0 text-xl ${sim.monthsUntilDanger <= 3 ? 'text-red-500' : 'text-amber-500'}`}>timer</span>
                  <div>
                    <p className="text-sm font-bold">
                      {sim.monthsUntilDanger === 0
                        ? 'Ya estás en zona de peligro'
                        : `Tenés ${sim.monthsUntilDanger} ${sim.monthsUntilDanger === 1 ? 'mes' : 'meses'} para tomar una decisión`}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Antes de que tu reserva baje de {formatMoney(sim.dangerThreshold)} (3 meses de gastos)
                    </p>
                  </div>
                </div>
              )}

              {/* What you need to compensate */}
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Para compensar la pérdida:</p>
                <div className="space-y-2">
                  {sim.replacementIncome > 0 ? (
                    <>
                      <div className="bg-white/70 dark:bg-slate-900/60 rounded-xl p-3 flex items-center gap-3">
                        <span className="material-symbols-outlined text-blue-500 shrink-0">add_business</span>
                        <div className="flex-1">
                          <p className="text-xs font-bold">Opción A: Nuevo ingreso</p>
                          <p className="text-[10px] text-slate-400">Necesitás al menos {formatMoney(sim.replacementIncome)}/mes para no perder plata</p>
                        </div>
                        <p className={`text-sm font-black text-blue-600 shrink-0 ${blur}`}>{formatMoney(sim.replacementIncome)}</p>
                      </div>
                      <div className="bg-white/70 dark:bg-slate-900/60 rounded-xl p-3 flex items-center gap-3">
                        <span className="material-symbols-outlined text-amber-500 shrink-0">content_cut</span>
                        <div className="flex-1">
                          <p className="text-xs font-bold">Opción B: Recortar gastos</p>
                          <p className="text-[10px] text-slate-400">Reducir {sim.requiredExpenseCutPct.toFixed(0)}% de tus gastos para llegar al equilibrio</p>
                        </div>
                        <p className={`text-sm font-black text-amber-600 shrink-0 ${blur}`}>{formatMoney(sim.requiredExpenseCut)}/mes</p>
                      </div>
                    </>
                  ) : (
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-xl p-3 flex items-center gap-3">
                      <span className="material-symbols-outlined text-emerald-500">savings</span>
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        Podés sostenerte sin ajustes. Tu flujo sigue siendo positivo.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Category cut suggestions */}
              {sim.requiredExpenseCut > 0 && sim.topCats.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[13px]">category</span>
                    Dónde recortar 25% para ahorrar:
                  </p>
                  <div className="space-y-1.5">
                    {sim.topCats.map(({ cat, avg, cut25 }) => (
                      <div key={cat} className="flex items-center gap-3 bg-white/50 dark:bg-slate-900/40 rounded-xl px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{cat}</p>
                          <p className={`text-[10px] text-slate-400 ${blur}`}>{formatMoney(avg)}/mes promedio</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-xs font-black text-emerald-600 ${blur}`}>ahorrás {formatMoney(cut25)}</p>
                          <p className="text-[9px] text-slate-400">recortando 25%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => setRemovedSourceIds(new Set())} className="text-[10px] text-slate-400 hover:text-primary font-bold underline">
                Resetear simulación
              </button>
            </div>
          );
        })()}

        {/* EXPENSE ADJUSTER */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">tune</span>
            Ajustar nivel de gastos
          </h3>
          <p className="text-[10px] text-slate-400 mb-4">
            Base: {formatMoney(baselineData.avgExpense)}/mes (prom. {baselineData.monthCount} {baselineData.monthCount === 1 ? 'mes' : 'meses'})
          </p>
          <div className="flex gap-2">
            {[-20, -10, 0, +10, +20].map(pct => (
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
          {expenseAdjust !== 0 && (
            <p className={`text-[10px] text-slate-400 mt-2 text-center ${blur}`}>
              {formatMoney(baselineData.avgExpense)} → {formatMoney(sim.adjustedExpense)} ({expenseAdjust > 0 ? '+' : ''}{formatMoney(sim.adjustedExpense - baselineData.avgExpense)}/mes)
            </p>
          )}
        </div>

        {/* 12-MONTH PROJECTION */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            Proyección a 12 meses
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3 py-1">
              <span className="text-[10px] font-bold text-slate-400 w-12 text-right shrink-0">Hoy</span>
              <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                <div className="h-full bg-blue-500 rounded-lg" style={{ width: `${Math.max(4, (currentBalance / maxProjection) * 100)}%` }} />
              </div>
              <span className={`text-xs font-bold w-24 text-right shrink-0 ${blur}`}>{formatMoney(currentBalance)}</span>
            </div>
            {sim.projection.map((p, i) => {
              const pct = Math.max(3, (Math.abs(p.balance) / maxProjection) * 100);
              const isNeg = p.balance < 0;
              const isDanger = !isNeg && p.balance < sim.dangerThreshold && sim.runway >= 0;
              return (
                <div key={i} className="flex items-center gap-3 py-1">
                  <span className="text-[10px] font-bold text-slate-400 w-12 text-right shrink-0 uppercase">{p.month}</span>
                  <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                    <div
                      className={`h-full rounded-lg transition-all ${isNeg ? 'bg-red-500' : isDanger ? 'bg-amber-400' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold w-24 text-right shrink-0 ${blur} ${isNeg ? 'text-red-500' : isDanger ? 'text-amber-500' : ''}`}>
                    {formatMoney(p.balance)}
                  </span>
                </div>
              );
            })}
          </div>
          {sim.runway >= 0 && sim.runway <= 12 && (
            <p className="text-[10px] text-red-500 font-bold mt-3 text-center flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-sm">warning</span>
              Los ahorros llegan a 0 en {sim.runway} meses con este escenario
            </p>
          )}
        </div>

        {/* CATEGORY BREAKDOWN */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            En qué se va tu plata (prom. {baselineData.monthCount} meses)
          </h3>
          <div className="space-y-2">
            {Object.entries(baselineData.categories)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 8)
              .map(([cat, amount]) => {
                const pct = baselineData.avgExpense > 0 ? (amount / baselineData.avgExpense) * 100 : 0;
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-xs font-bold w-24 truncate text-slate-500">{cat}</span>
                    <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full opacity-70" style={{ width: `${pct}%` }} />
                    </div>
                    <span className={`text-xs font-bold w-20 text-right ${blur}`}>{formatMoney(amount)}</span>
                    <span className="text-[10px] text-slate-400 w-10 text-right">{pct.toFixed(0)}%</span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Info footer */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-xs text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-800 flex items-start gap-2 leading-relaxed">
          <span className="material-symbols-outlined text-lg shrink-0">info</span>
          <span>
            Los gastos usan el promedio de los últimos {baselineData.monthCount} meses (excluye compras únicas).
            Los ingresos variables y por entrega usan los datos más recientes disponibles. Tocá fuentes para simular diferentes escenarios.
          </span>
        </div>
      </div>
    </div>
  );
};

export default FutureSimulator;
