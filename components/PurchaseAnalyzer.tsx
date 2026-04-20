
import React, { useState, useMemo } from 'react';
import { FinancialProfile, Transaction } from '../types';
import { formatMoney, formatUSD, getDollarRate, getSalaryForMonth, isOneTimePurchase } from '../utils';

interface Props {
  profile: FinancialProfile;
  transactions: Transaction[];
  balance: number;
  onBack: () => void;
  privacyMode?: boolean;
}

const PurchaseAnalyzer: React.FC<Props> = ({ profile, transactions, balance, onBack, privacyMode }) => {
  const dollarRate = getDollarRate(profile);
  const blur = privacyMode ? 'blur-sm' : '';

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [installments, setInstallments] = useState('1');
  const [interestPct, setInterestPct] = useState('0');
  const [expectedIncomeBoost, setExpectedIncomeBoost] = useState('');

  // --- BASE METRICS (from recent months) ---
  const baseMetrics = useMemo(() => {
    const now = new Date();
    const months: { key: string; income: number; expense: number; net: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const income = getSalaryForMonth(profile, key, dollarRate);
      const expense = transactions.filter(t => t.type === 'expense' && t.date.startsWith(key) && !isOneTimePurchase(t)).reduce((a, t) => a + t.amount, 0);
      months.push({ key, income, expense, net: income - expense });
    }
    const validMonths = months.filter(m => m.income > 0 || m.expense > 0);
    const avgIncome = validMonths.length > 0 ? validMonths.reduce((a, m) => a + m.income, 0) / validMonths.length : 0;
    const avgExpense = validMonths.length > 0 ? validMonths.reduce((a, m) => a + m.expense, 0) / validMonths.length : 0;
    const avgSaving = avgIncome - avgExpense;
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthlyIncome = getSalaryForMonth(profile, currentKey, dollarRate);
    return { avgIncome, avgExpense, avgSaving, currentMonthlyIncome, months: validMonths };
  }, [profile, transactions, dollarRate]);

  // --- ANALYSIS ---
  const analysis = useMemo(() => {
    const rawAmount = parseFloat(amount) || 0;
    const totalArs = currency === 'USD' ? rawAmount * dollarRate : rawAmount;
    if (totalArs === 0) return null;

    const installmentCount = Math.max(1, parseInt(installments) || 1);
    const interest = parseFloat(interestPct) || 0;
    const totalWithInterest = totalArs * (1 + interest / 100);
    const installmentAmount = totalWithInterest / installmentCount;

    const incomeBoost = parseFloat(expectedIncomeBoost) || 0;
    const incomeBoostArs = currency === 'USD' ? incomeBoost * dollarRate : incomeBoost;

    // % of patrimonio
    const pctOfPatrimonio = balance > 0 ? (totalArs / balance) * 100 : 0;
    // % of monthly income
    const pctOfMonthlyIncome = baseMetrics.avgIncome > 0 ? (totalArs / baseMetrics.avgIncome) * 100 : 0;
    // Months to recover (based on avg saving)
    const monthsToRecover = baseMetrics.avgSaving > 0 ? totalArs / baseMetrics.avgSaving : Infinity;
    // Months to recover WITH boost
    const newSavingWithBoost = baseMetrics.avgSaving + incomeBoostArs;
    const monthsWithBoost = newSavingWithBoost > 0 ? totalArs / newSavingWithBoost : Infinity;
    // Months to pay installments
    const monthsPaying = installmentCount;
    // Post-purchase balance
    const postPurchaseBalance = balance - (installmentCount === 1 ? totalWithInterest : installmentAmount);
    // Impact on savings rate
    const newMonthlyBudget = baseMetrics.avgSaving - installmentAmount;
    const canAfford = newMonthlyBudget >= 0;

    // Runway (months until patrimonio = 0 at current pace, after purchase)
    const runwayBefore = baseMetrics.avgSaving < 0 ? balance / Math.abs(baseMetrics.avgSaving) : Infinity;
    const runwayAfter = newMonthlyBudget < 0 ? (balance - totalWithInterest) / Math.abs(newMonthlyBudget) : Infinity;

    // Future patrimonio projection (24 months)
    const projection: { month: string; withPurchase: number; withoutPurchase: number }[] = [];
    const now = new Date();
    let runningWith = balance;
    let runningWithout = balance;
    // Apply purchase now (or distributed)
    if (installmentCount === 1) runningWith -= totalWithInterest;
    for (let i = 1; i <= 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }).replace('.', '');
      runningWithout += baseMetrics.avgSaving;
      if (installmentCount > 1 && i <= installmentCount) {
        runningWith += baseMetrics.avgSaving - installmentAmount + incomeBoostArs;
      } else {
        runningWith += baseMetrics.avgSaving + incomeBoostArs;
      }
      projection.push({ month: label, withPurchase: runningWith, withoutPurchase: runningWithout });
    }

    // Opportunity cost (3 categories)
    const monthsOfExpenses = baseMetrics.avgExpense > 0 ? totalArs / baseMetrics.avgExpense : 0;
    const daysOfExpenses = baseMetrics.avgExpense > 0 ? (totalArs / (baseMetrics.avgExpense / 30)) : 0;

    // Risk assessment
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (pctOfPatrimonio > 50 || pctOfMonthlyIncome > 200 || !canAfford) riskLevel = 'critical';
    else if (pctOfPatrimonio > 25 || pctOfMonthlyIncome > 100) riskLevel = 'high';
    else if (pctOfPatrimonio > 10 || pctOfMonthlyIncome > 50) riskLevel = 'medium';

    return {
      totalArs, totalWithInterest, installmentAmount, pctOfPatrimonio, pctOfMonthlyIncome,
      monthsToRecover, monthsWithBoost, monthsPaying, postPurchaseBalance,
      canAfford, newMonthlyBudget, runwayBefore, runwayAfter,
      projection, monthsOfExpenses, daysOfExpenses, riskLevel, incomeBoostArs,
    };
  }, [amount, currency, installments, interestPct, expectedIncomeBoost, dollarRate, balance, baseMetrics]);

  const maxProj = analysis ? Math.max(...analysis.projection.map(p => Math.max(Math.abs(p.withPurchase), Math.abs(p.withoutPurchase))), 1) : 1;

  const riskColors = {
    low: { bg: 'from-emerald-600 to-teal-700', label: 'Bajo riesgo', icon: 'verified', text: 'Esta compra es perfectamente asumible' },
    medium: { bg: 'from-blue-600 to-cyan-700', label: 'Riesgo moderado', icon: 'info', text: 'Compra razonable pero analizá el timing' },
    high: { bg: 'from-amber-500 to-orange-600', label: 'Riesgo alto', icon: 'warning', text: 'Considerá esperar o reducir el monto' },
    critical: { bg: 'from-red-600 to-rose-700', label: 'Riesgo crítico', icon: 'dangerous', text: 'Esta compra compromete seriamente tus finanzas' },
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      <div className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-white/30 dark:border-slate-700/40 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><span className="material-symbols-outlined">arrow_back</span></button>
        <div><h2 className="text-lg font-bold">Analizar Compra</h2><p className="text-[10px] text-slate-400 font-bold uppercase">Simulá antes de comprar</p></div>
      </div>

      <div className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-6 space-y-6 pb-24">

        {/* FORM */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">shopping_cart</span>
            ¿Qué querés comprar?
          </h3>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Nombre del ítem</label>
            <input type="text" className="w-full bg-slate-100 dark:bg-slate-900 p-3 rounded-xl outline-none font-bold text-sm" placeholder="Ej: PC para streaming, Cámara, Setup completo" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Monto total</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currency === 'ARS' ? '$' : 'U$'}</span>
                <input type="number" className="w-full bg-slate-100 dark:bg-slate-900 p-3 pl-8 rounded-xl outline-none font-bold text-sm" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl flex items-center">
                <button onClick={() => setCurrency('ARS')} className={`px-3 py-2 rounded-lg text-xs font-bold ${currency === 'ARS' ? 'bg-white dark:bg-slate-700 shadow' : 'text-slate-400'}`}>ARS</button>
                <button onClick={() => setCurrency('USD')} className={`px-3 py-2 rounded-lg text-xs font-bold ${currency === 'USD' ? 'bg-white dark:bg-slate-700 shadow' : 'text-slate-400'}`}>USD</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Cuotas</label>
              <input type="number" className="w-full bg-slate-100 dark:bg-slate-900 p-3 rounded-xl outline-none font-bold text-sm" placeholder="1" value={installments} onChange={e => setInstallments(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Interés % (total)</label>
              <input type="number" className="w-full bg-slate-100 dark:bg-slate-900 p-3 rounded-xl outline-none font-bold text-sm" placeholder="0" value={interestPct} onChange={e => setInterestPct(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">¿Generará ingresos extra? (mensual, opcional)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currency === 'ARS' ? '$' : 'U$'}</span>
              <input type="number" className="w-full bg-slate-100 dark:bg-slate-900 p-3 pl-8 rounded-xl outline-none font-bold text-sm" placeholder="0" value={expectedIncomeBoost} onChange={e => setExpectedIncomeBoost(e.target.value)} />
            </div>
            <p className="text-[9px] text-slate-400 mt-1 ml-1">Si la compra te permitirá generar ingresos nuevos (streaming, consultorías, etc)</p>
          </div>
        </div>

        {analysis && (
          <>
            {/* VERDICT */}
            <div className={`bg-gradient-to-br ${riskColors[analysis.riskLevel].bg} text-white rounded-3xl p-6 relative overflow-hidden shadow-xl`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <span className="material-symbols-outlined text-4xl">{riskColors[analysis.riskLevel].icon}</span>
                  <div>
                    <p className="text-xs text-white/70 font-bold uppercase">Veredicto</p>
                    <p className="text-2xl font-black">{riskColors[analysis.riskLevel].label}</p>
                  </div>
                </div>
                <p className="text-sm text-white/90">{riskColors[analysis.riskLevel].text}</p>
                <div className="mt-4 pt-4 border-t border-white/20">
                  <p className="text-[10px] text-white/70 uppercase">Costo total</p>
                  <p className={`text-3xl font-black ${blur}`}>{formatMoney(analysis.totalWithInterest)}</p>
                  {parseInt(installments) > 1 && <p className="text-xs text-white/70">{installments} cuotas de {formatMoney(analysis.installmentAmount)}</p>}
                </div>
              </div>
            </div>

            {/* KEY METRICS */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">% Patrimonio</p>
                <p className={`text-2xl font-black ${analysis.pctOfPatrimonio > 30 ? 'text-red-500' : analysis.pctOfPatrimonio > 15 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {analysis.pctOfPatrimonio.toFixed(1)}%
                </p>
                <p className="text-[10px] text-slate-400">de tu {formatMoney(balance)}</p>
              </div>
              <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">% Sueldo Mensual</p>
                <p className={`text-2xl font-black ${analysis.pctOfMonthlyIncome > 100 ? 'text-red-500' : analysis.pctOfMonthlyIncome > 50 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {analysis.pctOfMonthlyIncome.toFixed(0)}%
                </p>
                <p className="text-[10px] text-slate-400">{analysis.pctOfMonthlyIncome < 100 ? 'Menos de un sueldo' : `${(analysis.pctOfMonthlyIncome / 100).toFixed(1)} sueldos`}</p>
              </div>
              <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Tiempo Recuperación</p>
                <p className={`text-2xl font-black ${analysis.monthsToRecover > 12 ? 'text-amber-500' : analysis.monthsToRecover > 6 ? 'text-blue-500' : 'text-emerald-500'}`}>
                  {analysis.monthsToRecover === Infinity ? '∞' : analysis.monthsToRecover < 1 ? '< 1 mes' : analysis.monthsToRecover.toFixed(1) + ' m'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {analysis.monthsToRecover === Infinity ? 'Sin margen de ahorro' : `A ${formatMoney(baseMetrics.avgSaving)}/mes ahorrado`}
                </p>
                {analysis.incomeBoostArs > 0 && analysis.monthsWithBoost < analysis.monthsToRecover && (
                  <p className="text-[10px] text-emerald-500 font-bold mt-1">Con boost: {analysis.monthsWithBoost.toFixed(1)} meses</p>
                )}
              </div>
              <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Post-Compra</p>
                <p className={`text-2xl font-black ${analysis.postPurchaseBalance < 0 ? 'text-red-500' : 'text-blue-500'} ${blur}`}>
                  {formatMoney(analysis.postPurchaseBalance)}
                </p>
                <p className="text-[10px] text-slate-400">Patrimonio restante</p>
              </div>
            </div>

            {/* AFFORDABILITY */}
            <div className={`rounded-2xl p-5 border ${analysis.canAfford ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-2xl ${analysis.canAfford ? 'text-emerald-500' : 'text-red-500'}`}>
                  {analysis.canAfford ? 'check_circle' : 'warning'}
                </span>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${analysis.canAfford ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                    {analysis.canAfford ? 'Podés pagar las cuotas sin problemas' : 'Las cuotas superan tu ahorro mensual'}
                  </p>
                  <p className={`text-xs mt-0.5 ${analysis.canAfford ? 'text-emerald-600' : 'text-red-600'}`}>
                    Cuota: {formatMoney(analysis.installmentAmount)}/mes • Tu ahorro promedio: {formatMoney(baseMetrics.avgSaving)}/mes
                  </p>
                  <p className={`text-xs mt-1 font-bold ${analysis.newMonthlyBudget < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    Después de la cuota te quedarían: {formatMoney(analysis.newMonthlyBudget)}/mes
                  </p>
                </div>
              </div>
            </div>

            {/* OPPORTUNITY COST */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Costo de Oportunidad</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="material-symbols-outlined text-indigo-500">calendar_month</span>
                  <span className="text-xs">Equivale a <strong>{analysis.monthsOfExpenses.toFixed(1)} meses</strong> de tus gastos totales</span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="material-symbols-outlined text-purple-500">today</span>
                  <span className="text-xs">O <strong>{Math.round(analysis.daysOfExpenses)} días</strong> viviendo al nivel actual</span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="material-symbols-outlined text-emerald-500">currency_exchange</span>
                  <span className="text-xs">Son <strong>{formatUSD(analysis.totalArs / dollarRate)}</strong> a valor dólar actual</span>
                </div>
                {baseMetrics.avgSaving > 0 && (
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <span className="material-symbols-outlined text-amber-500">savings</span>
                    <span className="text-xs">Si en vez de comprarlo lo ahorrás, en 1 año tendrías <strong>{formatMoney(baseMetrics.avgSaving * 12 + analysis.totalArs)}</strong> extra</span>
                  </div>
                )}
              </div>
            </div>

            {/* FUTURE PROJECTION */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">timeline</span>
                Proyección a 24 Meses
              </h3>
              <p className="text-[10px] text-slate-400 mb-4">Tu patrimonio con y sin la compra</p>

              <div className="space-y-1.5">
                {analysis.projection.filter((_, i) => i % 2 === 0 || i === 0 || i === 23).map((p, i) => {
                  const wp = (Math.abs(p.withPurchase) / maxProj) * 100;
                  const wop = (Math.abs(p.withoutPurchase) / maxProj) * 100;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-slate-400 w-12 capitalize">{p.month}</span>
                      <div className="flex-1 space-y-0.5">
                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${p.withoutPurchase >= 0 ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${wop}%` }} />
                        </div>
                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${p.withPurchase >= 0 ? 'bg-purple-500' : 'bg-red-500'}`} style={{ width: `${wp}%` }} />
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold w-20 text-right ${blur}`}>
                        {formatMoney(p.withPurchase)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-1 text-[9px] text-slate-400"><span className="size-2 rounded-full bg-blue-500" /> Sin comprar</span>
                <span className="flex items-center gap-1 text-[9px] text-slate-400"><span className="size-2 rounded-full bg-purple-500" /> Con la compra</span>
              </div>

              {/* Final comparison */}
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-3 text-center border border-blue-200 dark:border-blue-800">
                  <p className="text-[9px] text-blue-600 font-bold uppercase">En 2 años sin comprar</p>
                  <p className={`text-sm font-black text-blue-600 ${blur}`}>{formatMoney(analysis.projection[23].withoutPurchase)}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/10 rounded-xl p-3 text-center border border-purple-200 dark:border-purple-800">
                  <p className="text-[9px] text-purple-600 font-bold uppercase">En 2 años comprando</p>
                  <p className={`text-sm font-black text-purple-600 ${blur}`}>{formatMoney(analysis.projection[23].withPurchase)}</p>
                </div>
              </div>

              <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Diferencia a 2 años</p>
                <p className={`text-lg font-black ${analysis.projection[23].withPurchase - analysis.projection[23].withoutPurchase >= 0 ? 'text-emerald-500' : 'text-red-500'} ${blur}`}>
                  {analysis.projection[23].withPurchase - analysis.projection[23].withoutPurchase >= 0 ? '+' : ''}
                  {formatMoney(analysis.projection[23].withPurchase - analysis.projection[23].withoutPurchase)}
                </p>
                {analysis.incomeBoostArs > 0 && (
                  <p className="text-[10px] text-emerald-500 mt-1 font-bold">Incluye +{formatMoney(analysis.incomeBoostArs)}/mes de ingresos nuevos</p>
                )}
              </div>
            </div>

            {/* SMART RECOMMENDATIONS */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
              <div className="relative z-10">
                <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">lightbulb</span>
                  Recomendaciones
                </h3>
                <div className="space-y-2 text-sm">
                  {analysis.pctOfPatrimonio > 40 && (
                    <p className="flex items-start gap-2"><span className="material-symbols-outlined text-sm mt-0.5">warning</span>Estás usando {analysis.pctOfPatrimonio.toFixed(0)}% de tu patrimonio — considerá guardar más antes</p>
                  )}
                  {parseInt(installments) === 1 && analysis.totalArs > baseMetrics.avgIncome && (
                    <p className="flex items-start gap-2"><span className="material-symbols-outlined text-sm mt-0.5">credit_card</span>Analizá pagar en cuotas sin interés para preservar liquidez</p>
                  )}
                  {!analysis.canAfford && (
                    <p className="flex items-start gap-2"><span className="material-symbols-outlined text-sm mt-0.5">savings</span>Las cuotas no caben en tu budget — reducí el monto o alargá las cuotas</p>
                  )}
                  {analysis.incomeBoostArs === 0 && name.toLowerCase().match(/pc|computadora|camara|cámara|micro|setup|stream/) && (
                    <p className="flex items-start gap-2"><span className="material-symbols-outlined text-sm mt-0.5">trending_up</span>Estimá cuánto podrías generar con este equipo y cargalo arriba para ver el ROI real</p>
                  )}
                  {analysis.monthsToRecover < 12 && analysis.monthsToRecover > 0 && (
                    <p className="flex items-start gap-2"><span className="material-symbols-outlined text-sm mt-0.5">check_circle</span>Buena inversión: recuperás el monto en {analysis.monthsToRecover.toFixed(1)} meses de ahorro</p>
                  )}
                  {analysis.pctOfPatrimonio < 10 && analysis.canAfford && (
                    <p className="flex items-start gap-2"><span className="material-symbols-outlined text-sm mt-0.5">verified</span>Compra totalmente dentro de tu capacidad financiera</p>
                  )}
                  {interestPct && parseFloat(interestPct) > 15 && (
                    <p className="flex items-start gap-2"><span className="material-symbols-outlined text-sm mt-0.5">percent</span>Ese interés es alto — el ítem te cuesta {formatMoney(analysis.totalWithInterest - analysis.totalArs)} extra</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {!analysis && (
          <div className="text-center py-12 text-slate-400">
            <span className="material-symbols-outlined text-5xl mb-3 block">shopping_cart_checkout</span>
            <p className="text-sm font-bold">Ingresá un monto arriba para ver el análisis completo</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseAnalyzer;
