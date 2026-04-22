
import React, { useMemo, useState, useEffect } from 'react';
import { FinancialProfile, FinancialMetrics, Transaction, PatrimonioSnapshot } from '../types';
import {
  formatMoney, formatMoneyUSD, getDollarRate, getSalaryForMonth, getCurrentMonthKey,
  isOneTimePurchase, getInflationMultiplier, getRecentAvgInflation,
} from '../utils';

interface Props {
  profile: FinancialProfile;
  metrics: FinancialMetrics;
  transactions: Transaction[];
  onUpdateProfile: (profile: FinancialProfile) => void;
  onBack: () => void;
  privacyMode?: boolean;
}

type ViewMode = 'nominal' | 'real' | 'usd';
type Horizon = 12 | 24 | 36;
type Scenario = 'optimistic' | 'realistic' | 'pessimistic';

const SCENARIO_META: Record<Scenario, { label: string; color: string; icon: string }> = {
  optimistic: { label: 'Optimista', color: '#10b981', icon: 'trending_up' },
  realistic:  { label: 'Realista',  color: '#8b5cf6', icon: 'timeline' },
  pessimistic:{ label: 'Pesimista', color: '#f59e0b', icon: 'trending_down' },
};

const formatVal = (val: number, mode: ViewMode): string => {
  if (mode === 'usd') return formatMoneyUSD(val);
  return formatMoney(val);
};

const PatrimonioTracker: React.FC<Props> = ({ profile, metrics, transactions, onUpdateProfile, onBack, privacyMode }) => {
  const dollarRate = getDollarRate(profile);
  const patrimonio = metrics.balance;
  const patrimonioUSD = patrimonio / dollarRate;
  const currentMonthKey = getCurrentMonthKey();
  const blur = privacyMode ? 'blur-sm' : '';

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('nominal');
  const [horizon, setHorizon] = useState<Horizon>(12);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [whatIfExtra, setWhatIfExtra] = useState(0);
  const [whatIfDollarPct, setWhatIfDollarPct] = useState(0); // % sobre el rate actual
  const [goalAmount, setGoalAmount] = useState('');

  // Auto snapshot
  useEffect(() => {
    const history = profile.patrimonioHistory || [];
    const existing = history.find(h => h.month === currentMonthKey);
    if (patrimonio !== 0 && (!existing || Math.abs(existing.balance - patrimonio) > 1000)) {
      const snap: PatrimonioSnapshot = { month: currentMonthKey, balance: patrimonio, dollarRate, date: new Date().toISOString() };
      const updatedHistory = [...history.filter(h => h.month !== currentMonthKey), snap].sort((a, b) => a.month.localeCompare(b.month));
      onUpdateProfile({ ...profile, patrimonioHistory: updatedHistory });
    }
  }, [currentMonthKey, patrimonio]);

  // Core analysis
  const analysis = useMemo(() => {
    type PastMonth = { key: string; label: string; income: number; expense: number; net: number; balance: number; multiplier: number; realBalance: number; usdBalance: number };
    const past: PastMonth[] = [];
    const now = new Date();

    // 24 meses hacia atrás
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }).replace('.', '');
      const income = getSalaryForMonth(profile, mk, dollarRate);
      const expense = transactions.filter(t => t.type === 'expense' && t.date.startsWith(mk) && !isOneTimePurchase(t)).reduce((a, t) => a + t.amount, 0);
      past.push({ key: mk, label, income, expense, net: income - expense, balance: 0, multiplier: 1, realBalance: 0, usdBalance: 0 });
    }

    // Reconstruir balances hacia atrás desde hoy
    past[past.length - 1].balance = patrimonio;
    for (let i = past.length - 2; i >= 0; i--) {
      past[i].balance = past[i + 1].balance - past[i + 1].net;
    }

    // Multiplicadores de inflación + real/usd balances
    past.forEach(p => {
      p.multiplier = getInflationMultiplier(profile, p.key, currentMonthKey);
      p.realBalance = p.balance * p.multiplier;
      p.usdBalance = p.balance / dollarRate;
    });

    // Escenarios: usar últimos 6 meses con actividad real
    const last6 = past.slice(-6).filter(m => m.income > 0 || m.expense > 0);
    const reference = last6.length > 0 ? last6 : past.slice(-6);
    const nets = reference.map(m => m.net);
    const realistic = nets.reduce((a, n) => a + n, 0) / Math.max(1, nets.length);
    const sorted = [...nets].sort((a, b) => a - b);
    const topN = Math.max(1, Math.ceil(nets.length / 2));
    const optimistic = sorted.slice(-topN).reduce((a, n) => a + n, 0) / topN;
    const pessimistic = sorted.slice(0, topN).reduce((a, n) => a + n, 0) / topN;

    // Health
    const totalIncome = reference.reduce((a, m) => a + m.income, 0);
    const totalSaving = reference.reduce((a, m) => a + m.net, 0);
    const savingsRate = totalIncome > 0 ? (totalSaving / totalIncome) * 100 : 0;

    const variance = nets.length > 1 ? nets.reduce((a, n) => a + (n - realistic) ** 2, 0) / nets.length : 0;
    const stddev = Math.sqrt(variance);
    const volatility = Math.abs(realistic) > 0 ? (stddev / Math.abs(realistic)) * 100 : 0;

    const best = reference.length > 0 ? reference.reduce((a, m) => m.net > a.net ? m : a) : null;
    const worst = reference.length > 0 ? reference.reduce((a, m) => m.net < a.net ? m : a) : null;

    // YoY growth (12 meses)
    let yoy = 0;
    let yoyPct = 0;
    if (past.length >= 12) {
      const twelveAgo = past[past.length - 12].balance;
      const current = past[past.length - 1].balance;
      yoy = current - twelveAgo;
      yoyPct = twelveAgo > 0 ? (yoy / twelveAgo) * 100 : 0;
    }

    // Max drawdown
    let peak = past[0].balance;
    let maxDD = 0, maxDDPct = 0, ddMonth = '';
    past.forEach(p => {
      if (p.balance > peak) peak = p.balance;
      const dd = peak - p.balance;
      if (dd > maxDD) {
        maxDD = dd;
        maxDDPct = peak > 0 ? (dd / peak) * 100 : 0;
        ddMonth = p.label;
      }
    });

    const avgInflation = getRecentAvgInflation(profile, 6);

    return {
      past,
      scenarios: { optimistic, realistic, pessimistic },
      health: { savingsRate, volatility, best, worst, yoy, yoyPct, maxDD, maxDDPct, ddMonth },
      avgInflation,
    };
  }, [transactions, profile, patrimonio, dollarRate, currentMonthKey]);

  // Proyección: aplica whatIfExtra + whatIfDollar
  const projection = useMemo(() => {
    const extra = whatIfExtra;
    const dollarFuture = dollarRate * (1 + whatIfDollarPct / 100);
    const inflRate = analysis.avgInflation / 100;
    const now = new Date();

    const buildSeries = (monthlyReal: number) => {
      const series: { key: string; label: string; nominal: number; real: number; usd: number }[] = [];
      let nominal = patrimonio;
      for (let i = 1; i <= horizon; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }).replace('.', '');
        // Asumimos ahorro real constante → nominal sube con inflación
        const nominalSaving = monthlyReal * Math.pow(1 + inflRate, i);
        nominal += nominalSaving;
        const real = patrimonio + i * monthlyReal;
        // Dólar sube con inflación (aprox 70% del ritmo para ser conservador) + ajuste del slider
        const projectedDollar = dollarFuture * Math.pow(1 + inflRate * 0.7, i);
        const usd = nominal / projectedDollar;
        series.push({ key, label, nominal, real, usd });
      }
      return series;
    };

    return {
      optimistic: buildSeries(analysis.scenarios.optimistic + extra),
      realistic:  buildSeries(analysis.scenarios.realistic + extra),
      pessimistic:buildSeries(analysis.scenarios.pessimistic + extra),
      effectiveSavings: {
        optimistic: analysis.scenarios.optimistic + extra,
        realistic:  analysis.scenarios.realistic + extra,
        pessimistic:analysis.scenarios.pessimistic + extra,
      },
    };
  }, [analysis, patrimonio, whatIfExtra, whatIfDollarPct, horizon, dollarRate]);

  // Chart data según viewMode
  const chart = useMemo(() => {
    const pickValue = (nominal: number, real: number, usd: number): number =>
      viewMode === 'nominal' ? nominal : viewMode === 'real' ? real : usd;

    const past = analysis.past.map(p => ({ key: p.key, label: p.label, value: pickValue(p.balance, p.realBalance, p.usdBalance) }));
    const optimistic = projection.optimistic.map(s => ({ key: s.key, label: s.label, value: pickValue(s.nominal, s.real, s.usd) }));
    const realistic  = projection.realistic.map(s => ({ key: s.key, label: s.label, value: pickValue(s.nominal, s.real, s.usd) }));
    const pessimistic= projection.pessimistic.map(s => ({ key: s.key, label: s.label, value: pickValue(s.nominal, s.real, s.usd) }));

    const all = [...past, ...optimistic, ...pessimistic, ...realistic];
    const maxVal = Math.max(...all.map(a => a.value), 1);
    const minVal = Math.min(...all.map(a => a.value), 0);

    return { past, optimistic, realistic, pessimistic, maxVal, minVal };
  }, [analysis, projection, viewMode]);

  // What-if
  const whatIf = useMemo(() => {
    const avgSaving = analysis.scenarios.realistic + whatIfExtra;
    const goalNum = parseFloat(goalAmount.replace(/[^0-9.-]/g, '')) || 0;
    let goalETA = 0;
    if (goalNum > patrimonio && avgSaving > 0) {
      // Estimar con real saving (en pesos de hoy), más preciso
      goalETA = Math.ceil((goalNum - patrimonio) / avgSaving);
    }
    const finalR = projection.realistic[projection.realistic.length - 1];
    return { avgSaving, goalNum, goalETA, finalR };
  }, [analysis, whatIfExtra, goalAmount, projection, patrimonio]);

  // Niveles
  const levels = [
    { label: 'Novato', limit: 0, icon: 'start', color: 'text-slate-400' },
    { label: 'Ahorrador', limit: 1000, icon: 'savings', color: 'text-orange-400' },
    { label: 'Escudero', limit: 5000, icon: 'shield', color: 'text-amber-400' },
    { label: 'Mercader', limit: 25000, icon: 'storefront', color: 'text-cyan-400' },
    { label: 'Inversionista', limit: 100000, icon: 'trending_up', color: 'text-emerald-400' },
    { label: 'Magnate', limit: 500000, icon: 'domain', color: 'text-purple-400' },
    { label: 'Leyenda', limit: 1000000, icon: 'diamond', color: 'text-yellow-400' },
  ];
  const currentLevelIndex = levels.reduce((acc, lvl, i) => patrimonioUSD >= lvl.limit ? i : acc, 0);
  const currentLevel = levels[currentLevelIndex];
  const nextLevel = levels[currentLevelIndex + 1];
  const progressToNext = nextLevel ? Math.min(100, ((patrimonioUSD - currentLevel.limit) / (nextLevel.limit - currentLevel.limit)) * 100) : 100;
  const amountToNext = nextLevel ? (nextLevel.limit - patrimonioUSD) * dollarRate : 0;
  const etaToNext = nextLevel && whatIf.avgSaving > 0 ? Math.ceil(amountToNext / whatIf.avgSaving) : Infinity;

  // ===== Chart rendering helpers =====
  const chartH = 160;
  const chartW = (chart.past.length + horizon) * 42;
  const range = chart.maxVal - chart.minVal;
  const getY = (val: number) => range > 0 ? chartH - ((val - chart.minVal) / range) * chartH : chartH / 2;
  const getX = (index: number) => index * 42 + 20;

  // Construir paths para cada scenario (concatenando último punto pasado)
  const lastPastIdx = chart.past.length - 1;
  const lastPastPoint = chart.past[lastPastIdx];

  const scenarioPoints = (series: { value: number }[]) => {
    const pts: string[] = [];
    if (lastPastPoint) pts.push(`${getX(lastPastIdx)},${getY(lastPastPoint.value)}`);
    series.forEach((s, i) => pts.push(`${getX(lastPastIdx + 1 + i)},${getY(s.value)}`));
    return pts.join(' ');
  };

  // Banda de confianza: polygon opt (forward) + pess (reverse)
  const bandPath = (() => {
    const fwd: string[] = [];
    const rev: string[] = [];
    if (lastPastPoint) {
      fwd.push(`${getX(lastPastIdx)},${getY(lastPastPoint.value)}`);
    }
    chart.optimistic.forEach((s, i) => fwd.push(`${getX(lastPastIdx + 1 + i)},${getY(s.value)}`));
    [...chart.pessimistic].reverse().forEach((s, i) => rev.push(`${getX(lastPastIdx + 1 + (chart.pessimistic.length - 1 - i))},${getY(s.value)}`));
    if (lastPastPoint) rev.push(`${getX(lastPastIdx)},${getY(lastPastPoint.value)}`);
    return [...fwd, ...rev].join(' ');
  })();

  const expandedData = expandedMonth ? (() => {
    const pastHit = analysis.past.find(p => p.key === expandedMonth);
    if (pastHit) {
      return {
        isProjection: false,
        label: pastHit.label,
        nominal: pastHit.balance,
        real: pastHit.realBalance,
        usd: pastHit.usdBalance,
        income: pastHit.income,
        expense: pastHit.expense,
        saving: pastHit.net,
        multiplier: pastHit.multiplier,
      };
    }
    const projR = projection.realistic.find(p => p.key === expandedMonth);
    const projO = projection.optimistic.find(p => p.key === expandedMonth);
    const projP = projection.pessimistic.find(p => p.key === expandedMonth);
    if (projR) {
      return {
        isProjection: true,
        label: projR.label,
        nominal: projR.nominal,
        real: projR.real,
        usd: projR.usd,
        optNominal: projO?.nominal ?? 0,
        pessNominal: projP?.nominal ?? 0,
      };
    }
    return null;
  })() : null;

  // Gauge para savings rate
  const rateColor = analysis.health.savingsRate >= 20 ? 'text-emerald-500' : analysis.health.savingsRate >= 10 ? 'text-amber-500' : analysis.health.savingsRate > 0 ? 'text-orange-500' : 'text-red-500';
  const rateLabel = analysis.health.savingsRate >= 20 ? 'Excelente' : analysis.health.savingsRate >= 10 ? 'Bueno' : analysis.health.savingsRate > 0 ? 'Bajo' : 'Negativo';

  const volLabel = analysis.health.volatility < 30 ? 'Estable' : analysis.health.volatility < 70 ? 'Moderada' : 'Alta';
  const volColor = analysis.health.volatility < 30 ? 'text-emerald-500' : analysis.health.volatility < 70 ? 'text-amber-500' : 'text-red-500';

  // VIEW MODE formatter
  const vm = (p: { balance: number; realBalance: number; usdBalance: number }): number =>
    viewMode === 'nominal' ? p.balance : viewMode === 'real' ? p.realBalance : p.usdBalance;

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      <div className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-white/30 dark:border-slate-700/40 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold">Mi Patrimonio</h2>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto p-6 space-y-5 pb-24">

        {/* HERO */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-blue-950/90 dark:via-slate-900 dark:to-slate-950 rounded-2xl p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 relative z-10">Patrimonio total</p>
          <p className={`text-4xl font-black relative z-10 ${blur}`}>{formatMoney(patrimonio)}</p>
          <p className={`text-lg font-bold text-slate-400 relative z-10 ${blur}`}>= {formatMoneyUSD(patrimonioUSD)}</p>
          {analysis.scenarios.realistic !== 0 && (
            <p className={`text-xs font-bold mt-2 relative z-10 ${analysis.scenarios.realistic > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {analysis.scenarios.realistic > 0 ? '+' : ''}{formatMoney(analysis.scenarios.realistic)}/mes promedio
            </p>
          )}
          {analysis.avgInflation > 0 && (
            <p className="text-[10px] text-slate-500 mt-1 relative z-10">
              Inflación reciente: {analysis.avgInflation.toFixed(1)}%/mes
            </p>
          )}
        </div>

        {/* NIVEL */}
        <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`material-symbols-outlined text-2xl ${currentLevel.color}`}>{currentLevel.icon}</span>
              <div>
                <p className="font-bold text-sm">{currentLevel.label}</p>
                <p className="text-[10px] text-slate-400">Nivel actual</p>
              </div>
            </div>
            {nextLevel && (
              <div className="text-right">
                <p className="text-[10px] text-slate-400">Siguiente</p>
                <p className="text-sm font-bold flex items-center gap-1">
                  <span className={`material-symbols-outlined text-sm ${nextLevel.color}`}>{nextLevel.icon}</span>
                  {nextLevel.label}
                </p>
              </div>
            )}
          </div>
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${progressToNext}%` }} />
          </div>
          {nextLevel && (
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              Faltan {formatMoney(amountToNext)} ({formatMoneyUSD(amountToNext / dollarRate)})
              {etaToNext !== Infinity && ` — ETA ${etaToNext} ${etaToNext === 1 ? 'mes' : 'meses'}`}
            </p>
          )}
        </div>

        {/* VIEW MODE + HORIZONTE */}
        <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-4 space-y-3">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Mostrar en</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(['nominal', 'real', 'usd'] as ViewMode[]).map(m => (
                <button key={m} onClick={() => setViewMode(m)}
                  className={`py-2 rounded-xl text-[11px] font-bold transition-all ${viewMode === m ? 'bg-primary text-white shadow' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'}`}>
                  {m === 'nominal' ? 'Nominal ARS' : m === 'real' ? 'Real (hoy)' : 'USD'}
                </button>
              ))}
            </div>
            {viewMode === 'real' && (
              <p className="text-[9px] text-slate-400 mt-2 leading-tight">
                Ajustado por IPC INDEC. Todo expresado en pesos de hoy — muestra tu poder adquisitivo real.
              </p>
            )}
            {viewMode === 'usd' && (
              <p className="text-[9px] text-slate-400 mt-2 leading-tight">
                Convertido a dólares al tipo de cambio actual ({formatMoneyUSD(1 / dollarRate * 1000)}/$1000).
              </p>
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Horizonte</p>
            <div className="grid grid-cols-3 gap-1.5">
              {([12, 24, 36] as Horizon[]).map(h => (
                <button key={h} onClick={() => setHorizon(h)}
                  className={`py-2 rounded-xl text-[11px] font-bold transition-all ${horizon === h ? 'bg-primary text-white shadow' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'}`}>
                  {h} meses
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ESCENARIOS CARDS */}
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(SCENARIO_META) as Scenario[]).map(s => {
            const meta = SCENARIO_META[s];
            const saving = projection.effectiveSavings[s];
            const final = projection[s][projection[s].length - 1];
            const finalVal = final ? (viewMode === 'nominal' ? final.nominal : viewMode === 'real' ? final.real : final.usd) : 0;
            return (
              <div key={s} className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border rounded-2xl p-3" style={{ borderColor: `${meta.color}40` }}>
                <div className="flex items-center gap-1 mb-1">
                  <span className="material-symbols-outlined text-sm" style={{ color: meta.color }}>{meta.icon}</span>
                  <p className="text-[10px] font-bold uppercase" style={{ color: meta.color }}>{meta.label}</p>
                </div>
                <p className="text-[9px] text-slate-400">Ahorro/mes</p>
                <p className={`text-xs font-bold ${blur}`}>{formatMoney(saving)}</p>
                <p className="text-[9px] text-slate-400 mt-1.5">En {horizon}m</p>
                <p className={`text-sm font-black ${blur}`} style={{ color: meta.color }}>{formatVal(finalVal, viewMode)}</p>
              </div>
            );
          })}
        </div>

        {/* GRÁFICO */}
        <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">show_chart</span>
            Evolución + proyección con escenarios
          </h3>
          <div className="overflow-x-auto">
            <div style={{ minWidth: chartW }}>
              <svg width="100%" height={chartH + 40} viewBox={`0 0 ${chartW} ${chartH + 40}`} className="overflow-visible">
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
                  <line key={i} x1="0" y1={chartH * pct} x2={chartW} y2={chartH * pct} stroke="currentColor" strokeOpacity="0.05" strokeWidth="1" />
                ))}
                {/* Separador past/future */}
                {lastPastPoint && (
                  <line x1={getX(lastPastIdx)} y1="0" x2={getX(lastPastIdx)} y2={chartH} stroke="currentColor" strokeOpacity="0.2" strokeDasharray="2 3" strokeWidth="1" />
                )}
                {/* Banda de confianza */}
                <polygon points={bandPath} fill="#8b5cf6" fillOpacity="0.08" />
                {/* Pasado */}
                <polyline
                  points={chart.past.map((m, i) => `${getX(i)},${getY(m.value)}`).join(' ')}
                  fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                />
                {/* Proyección pesimista */}
                <polyline points={scenarioPoints(chart.pessimistic)} fill="none" stroke={SCENARIO_META.pessimistic.color} strokeWidth="1.8" strokeDasharray="5 3" opacity="0.85" />
                {/* Proyección optimista */}
                <polyline points={scenarioPoints(chart.optimistic)} fill="none" stroke={SCENARIO_META.optimistic.color} strokeWidth="1.8" strokeDasharray="5 3" opacity="0.85" />
                {/* Proyección realista (más prominente) */}
                <polyline points={scenarioPoints(chart.realistic)} fill="none" stroke={SCENARIO_META.realistic.color} strokeWidth="2.5" strokeDasharray="6 3" />
                {/* Dots pasado */}
                {chart.past.map((m, i) => (
                  <circle key={`p-${i}`} cx={getX(i)} cy={getY(m.value)} r={expandedMonth === m.key ? 5 : 2.5}
                    fill="#3b82f6" stroke={expandedMonth === m.key ? 'white' : 'none'} strokeWidth="2"
                    className="cursor-pointer" onClick={() => setExpandedMonth(expandedMonth === m.key ? null : m.key)} />
                ))}
                {/* Dots realista (proyección) */}
                {chart.realistic.map((m, i) => (
                  <circle key={`r-${i}`} cx={getX(lastPastIdx + 1 + i)} cy={getY(m.value)} r={expandedMonth === m.key ? 5 : 2.5}
                    fill={SCENARIO_META.realistic.color} stroke={expandedMonth === m.key ? 'white' : 'none'} strokeWidth="2"
                    className="cursor-pointer" onClick={() => setExpandedMonth(expandedMonth === m.key ? null : m.key)} />
                ))}
                {/* Labels cada 3 meses para no saturar */}
                {[...chart.past, ...chart.realistic].map((m, i) => i % 3 === 0 ? (
                  <text key={`l-${i}`} x={getX(i)} y={chartH + 15} textAnchor="middle" fontSize="8" fill="currentColor" opacity={i > lastPastIdx ? 0.3 : 0.5} fontWeight="bold">{m.label}</text>
                ) : null)}
              </svg>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
            <span className="flex items-center gap-1 text-[9px] text-slate-400"><span className="w-4 h-0.5 bg-blue-500 inline-block" /> Histórico</span>
            <span className="flex items-center gap-1 text-[9px] text-slate-400"><span className="w-4 h-0.5 inline-block" style={{ background: SCENARIO_META.optimistic.color }} /> Optimista</span>
            <span className="flex items-center gap-1 text-[9px] text-slate-400"><span className="w-4 h-0.5 inline-block" style={{ background: SCENARIO_META.realistic.color }} /> Realista</span>
            <span className="flex items-center gap-1 text-[9px] text-slate-400"><span className="w-4 h-0.5 inline-block" style={{ background: SCENARIO_META.pessimistic.color }} /> Pesimista</span>
          </div>
        </div>

        {/* DETALLE MES EXPANDIDO */}
        {expandedData && (
          <div className={`rounded-2xl p-4 border animate-[fadeIn_0.2s_ease-out] ${expandedData.isProjection ? 'bg-purple-50/70 dark:bg-purple-900/20 border-purple-200/50 dark:border-purple-800/50' : 'bg-blue-50/70 dark:bg-blue-900/20 border-blue-200/50 dark:border-blue-800/50'}`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold capitalize">
                {expandedData.label}
                {expandedData.isProjection && <span className="text-[10px] text-purple-500 ml-2">(Proyección)</span>}
              </h4>
              <button onClick={() => setExpandedMonth(null)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-2 text-center">
                <p className="text-[9px] text-slate-400 font-bold uppercase">Nominal</p>
                <p className={`text-xs font-black ${blur}`}>{formatMoney(expandedData.nominal)}</p>
              </div>
              <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-2 text-center">
                <p className="text-[9px] text-slate-400 font-bold uppercase">Real (hoy)</p>
                <p className={`text-xs font-black ${blur}`}>{formatMoney(expandedData.real)}</p>
              </div>
              <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-2 text-center">
                <p className="text-[9px] text-slate-400 font-bold uppercase">USD</p>
                <p className={`text-xs font-black ${blur}`}>{formatMoneyUSD(expandedData.usd)}</p>
              </div>
            </div>
            {!expandedData.isProjection && 'income' in expandedData && (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Ingresos</span><span className="font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(expandedData.income)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Gastos</span><span className="font-bold text-red-600 dark:text-red-400">{formatMoney(expandedData.expense)}</span></div>
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1">
                  <span className="font-bold text-slate-600 dark:text-slate-300">Ahorro</span>
                  <span className={`font-bold ${expandedData.saving >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{formatMoney(expandedData.saving)}</span>
                </div>
                {expandedData.multiplier > 1.01 && (
                  <p className="text-[10px] text-slate-400 mt-2">
                    Inflación desde ese mes: +{((expandedData.multiplier - 1) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            )}
            {expandedData.isProjection && 'optNominal' in expandedData && (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span style={{ color: SCENARIO_META.optimistic.color }}>Optimista</span><span className="font-bold">{formatMoney(expandedData.optNominal as number)}</span></div>
                <div className="flex justify-between"><span style={{ color: SCENARIO_META.realistic.color }}>Realista</span><span className="font-bold">{formatMoney(expandedData.nominal)}</span></div>
                <div className="flex justify-between"><span style={{ color: SCENARIO_META.pessimistic.color }}>Pesimista</span><span className="font-bold">{formatMoney(expandedData.pessNominal as number)}</span></div>
              </div>
            )}
          </div>
        )}

        {/* WHAT-IF */}
        <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-5">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-4 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">tune</span>
            ¿Y si...? — Simulador
          </h3>

          {/* Slider ahorro extra */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold">Ahorrar {whatIfExtra >= 0 ? '+' : ''}{formatMoney(whatIfExtra)}/mes extra</label>
              <button onClick={() => setWhatIfExtra(0)} className="text-[10px] text-slate-400 hover:text-primary font-bold">Reset</button>
            </div>
            <input type="range" min={-200000} max={1000000} step={10000} value={whatIfExtra}
              onChange={e => setWhatIfExtra(parseFloat(e.target.value))}
              className="w-full accent-primary" />
            <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
              <span>-$200k</span>
              <span>0</span>
              <span>+$1M</span>
            </div>
          </div>

          {/* Slider dólar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold">Dólar futuro: ${Math.round(dollarRate * (1 + whatIfDollarPct / 100)).toLocaleString('es-AR')} ({whatIfDollarPct >= 0 ? '+' : ''}{whatIfDollarPct}%)</label>
              <button onClick={() => setWhatIfDollarPct(0)} className="text-[10px] text-slate-400 hover:text-primary font-bold">Reset</button>
            </div>
            <input type="range" min={-30} max={100} step={5} value={whatIfDollarPct}
              onChange={e => setWhatIfDollarPct(parseFloat(e.target.value))}
              className="w-full accent-primary" />
            <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
              <span>-30%</span>
              <span>0</span>
              <span>+100%</span>
            </div>
          </div>

          {/* Resultado combinado */}
          {whatIf.finalR && (
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-4 text-white">
              <p className="text-[10px] font-bold uppercase text-white/80 mb-1">Patrimonio en {horizon} meses</p>
              <div className="grid grid-cols-3 gap-2">
                <div><p className="text-[9px] text-white/60">Nominal</p><p className={`text-sm font-black ${blur}`}>{formatMoney(whatIf.finalR.nominal)}</p></div>
                <div><p className="text-[9px] text-white/60">Real (hoy)</p><p className={`text-sm font-black ${blur}`}>{formatMoney(whatIf.finalR.real)}</p></div>
                <div><p className="text-[9px] text-white/60">USD</p><p className={`text-sm font-black ${blur}`}>{formatMoneyUSD(whatIf.finalR.usd)}</p></div>
              </div>
              {nextLevel && etaToNext !== Infinity && (
                <p className="text-[10px] text-white/90 mt-3 border-t border-white/20 pt-2">
                  Llegás a <span className="font-bold">{nextLevel.label}</span> en <span className="font-bold">{etaToNext} {etaToNext === 1 ? 'mes' : 'meses'}</span>
                </p>
              )}
            </div>
          )}

          {/* Goal calculator */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <label className="text-xs font-bold block mb-1">¿Cuándo llego a un monto?</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input type="text" inputMode="numeric" placeholder="50.000.000"
                  className="w-full bg-slate-100 dark:bg-slate-900 pl-7 pr-3 py-2 rounded-xl text-sm font-bold outline-none"
                  value={goalAmount}
                  onChange={e => setGoalAmount(e.target.value)} />
              </div>
              <button onClick={() => setGoalAmount('')} className="px-3 text-[10px] font-bold text-slate-400 hover:text-primary">Limpiar</button>
            </div>
            {whatIf.goalNum > 0 && (
              <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                {whatIf.goalNum <= patrimonio ? (
                  <p className="text-xs text-emerald-600 font-bold">✓ Ya superaste ese monto por {formatMoney(patrimonio - whatIf.goalNum)}</p>
                ) : whatIf.avgSaving <= 0 ? (
                  <p className="text-xs text-red-500 font-bold">Con el ahorro actual no llegás. Necesitás sumar ahorro.</p>
                ) : (
                  <div>
                    <p className="text-xs font-bold">
                      ETA: <span className="text-primary">{whatIf.goalETA} {whatIf.goalETA === 1 ? 'mes' : 'meses'}</span>
                      <span className="text-slate-400 font-normal"> ({Math.round(whatIf.goalETA / 12 * 10) / 10} años)</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Con ahorro de {formatMoney(whatIf.avgSaving)}/mes (real, en pesos de hoy)
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SALUD FINANCIERA */}
        <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-5">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-4 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">health_and_safety</span>
            Salud financiera
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {/* Savings rate */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
              <p className="text-[9px] text-slate-400 font-bold uppercase">Tasa de ahorro</p>
              <p className={`text-2xl font-black ${rateColor} ${blur}`}>{analysis.health.savingsRate.toFixed(0)}%</p>
              <p className={`text-[10px] font-bold ${rateColor}`}>{rateLabel}</p>
              <p className="text-[9px] text-slate-400 mt-1">Últimos 6m</p>
            </div>

            {/* Volatility */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
              <p className="text-[9px] text-slate-400 font-bold uppercase">Estabilidad</p>
              <p className={`text-2xl font-black ${volColor}`}>{volLabel}</p>
              <p className="text-[10px] text-slate-400">CV: {analysis.health.volatility.toFixed(0)}%</p>
              <p className="text-[9px] text-slate-400 mt-1">Variación mes a mes</p>
            </div>

            {/* Best month */}
            {analysis.health.best && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-200/50 dark:border-emerald-800/50">
                <p className="text-[9px] text-emerald-600 font-bold uppercase">Mejor mes</p>
                <p className={`text-sm font-black ${blur}`}>{formatMoney(analysis.health.best.net)}</p>
                <p className="text-[10px] text-slate-500 capitalize">{analysis.health.best.label}</p>
              </div>
            )}

            {/* Worst month */}
            {analysis.health.worst && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-200/50 dark:border-red-800/50">
                <p className="text-[9px] text-red-600 font-bold uppercase">Peor mes</p>
                <p className={`text-sm font-black ${blur}`}>{formatMoney(analysis.health.worst.net)}</p>
                <p className="text-[10px] text-slate-500 capitalize">{analysis.health.worst.label}</p>
              </div>
            )}

            {/* YoY growth */}
            {analysis.past.length >= 12 && analysis.health.yoy !== 0 && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 col-span-2">
                <p className="text-[9px] text-slate-400 font-bold uppercase">Crecimiento anual (YoY)</p>
                <div className="flex items-end gap-3">
                  <p className={`text-xl font-black ${analysis.health.yoy >= 0 ? 'text-emerald-500' : 'text-red-500'} ${blur}`}>
                    {analysis.health.yoy >= 0 ? '+' : ''}{formatMoney(analysis.health.yoy)}
                  </p>
                  <p className={`text-sm font-bold pb-0.5 ${analysis.health.yoyPct >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    ({analysis.health.yoyPct >= 0 ? '+' : ''}{analysis.health.yoyPct.toFixed(1)}%)
                  </p>
                </div>
                {analysis.avgInflation > 0 && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    vs inflación anualizada ~{(analysis.avgInflation * 12).toFixed(0)}%
                    {analysis.health.yoyPct > analysis.avgInflation * 12 ? ' — ganás poder adquisitivo ✓' : ' — perdés poder adquisitivo'}
                  </p>
                )}
              </div>
            )}

            {/* Max drawdown */}
            {analysis.health.maxDD > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 col-span-2">
                <p className="text-[9px] text-slate-400 font-bold uppercase">Mayor caída (drawdown)</p>
                <div className="flex items-end gap-3">
                  <p className={`text-lg font-black text-orange-500 ${blur}`}>-{formatMoney(analysis.health.maxDD)}</p>
                  <p className="text-sm font-bold text-orange-500 pb-0.5">(-{analysis.health.maxDDPct.toFixed(1)}%)</p>
                </div>
                <p className="text-[10px] text-slate-400 capitalize">Tocó fondo en {analysis.health.ddMonth}</p>
              </div>
            )}
          </div>
        </div>

        {/* DETALLE MES A MES */}
        <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">list</span>
            Detalle mes a mes ({viewMode === 'nominal' ? 'Nominal' : viewMode === 'real' ? 'Real' : 'USD'})
          </h3>
          <div className="space-y-1">
            {[...analysis.past].reverse().slice(0, 8).map(m => (
              <div key={m.key} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <span className="text-xs text-slate-500 capitalize w-16">{m.label}</span>
                <span className={`text-xs font-bold text-slate-900 dark:text-white flex-1 text-center ${blur}`}>
                  {formatVal(vm(m), viewMode)}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.net >= 0 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {m.net >= 0 ? '+' : ''}{formatMoney(m.net)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* SNAPSHOTS */}
        {(() => {
          const history = profile.patrimonioHistory || [];
          if (history.length < 2) return null;
          const sorted = [...history].sort((a, b) => a.month.localeCompare(b.month));
          const maxH = Math.max(...sorted.map(h => Math.abs(h.balance)), 1);
          const first = sorted[0];
          const last = sorted[sorted.length - 1];
          const totalGrowth = last.balance - first.balance;
          const months = sorted.length;
          const avgGrowthPerMonth = months > 1 ? totalGrowth / (months - 1) : 0;

          return (
            <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-4">
              <h3 className="text-xs font-bold uppercase text-slate-400 mb-1 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">history</span>
                Historial registrado
              </h3>
              <p className="text-[10px] text-slate-400 mb-3">{sorted.length} snapshots guardados automáticamente</p>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                  <p className="text-[8px] text-slate-400 font-bold uppercase">Primer registro</p>
                  <p className={`text-sm font-black ${blur}`}>{formatMoney(first.balance)}</p>
                  <p className="text-[9px] text-slate-400">{first.month}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                  <p className="text-[8px] text-slate-400 font-bold uppercase">Actual</p>
                  <p className={`text-sm font-black ${blur}`}>{formatMoney(last.balance)}</p>
                  <p className="text-[9px] text-slate-400">{last.month}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                  <p className="text-[8px] text-slate-400 font-bold uppercase">Crecimiento</p>
                  <p className={`text-sm font-black ${totalGrowth >= 0 ? 'text-emerald-500' : 'text-red-500'} ${blur}`}>
                    {totalGrowth >= 0 ? '+' : ''}{formatMoney(totalGrowth)}
                  </p>
                  <p className="text-[9px] text-slate-400">~{formatMoney(avgGrowthPerMonth)}/mes</p>
                </div>
              </div>

              <div className="space-y-1.5">
                {sorted.map((snap, i) => {
                  const prev = i > 0 ? sorted[i - 1].balance : snap.balance;
                  const diff = snap.balance - prev;
                  const pct = maxH > 0 ? (Math.abs(snap.balance) / maxH) * 100 : 0;
                  return (
                    <div key={snap.month} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 w-14">{snap.month.split('-').reverse().join('/')}</span>
                      <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${snap.balance >= 0 ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-[10px] font-bold w-20 text-right ${blur}`}>{formatMoney(snap.balance)}</span>
                      {i > 0 && <span className={`text-[9px] font-bold w-16 text-right ${diff >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{diff >= 0 ? '+' : ''}{formatMoney(diff)}</span>}
                      {i === 0 && <span className="w-16" />}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
};

export default PatrimonioTracker;
