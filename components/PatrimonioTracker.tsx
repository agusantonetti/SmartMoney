
import React, { useMemo, useState } from 'react';
import { FinancialProfile, FinancialMetrics, Transaction } from '../types';
import { formatMoney, formatMoneyUSD, getDollarRate, getSalaryForMonth, getCurrentMonthKey } from '../utils';

interface Props {
  profile: FinancialProfile;
  metrics: FinancialMetrics;
  transactions: Transaction[];
  onBack: () => void;
}

const PatrimonioTracker: React.FC<Props> = ({ profile, metrics, transactions, onBack }) => {
  const dollarRate = getDollarRate(profile);
  const patrimonio = metrics.balance;
  const patrimonioUSD = patrimonio / dollarRate;
  const currentMonthKey = getCurrentMonthKey();
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [showProjection, setShowProjection] = useState(false);

  // Evolución pasada (12 meses) + proyección futura (6 meses)
  const evolution = useMemo(() => {
    const past: { key: string, label: string, balance: number, income: number, expense: number, saving: number, isProjection: boolean }[] = [];
    const now = new Date();

    // Calcular net de cada mes pasado
    const monthlyNets: { key: string, label: string, income: number, expense: number, net: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }).replace('.', '');
      const salary = getSalaryForMonth(profile, mk, dollarRate);
      const expense = transactions.filter(t => t.type === 'expense' && t.date.startsWith(mk)).reduce((a, t) => a + t.amount, 0);
      monthlyNets.push({ key: mk, label, income: salary, expense, net: salary - expense });
    }

    // Reconstruir evolución hacia atrás desde patrimonio actual
    const balances: number[] = new Array(12).fill(0);
    balances[11] = patrimonio;
    for (let i = 10; i >= 0; i--) {
      balances[i] = balances[i + 1] - monthlyNets[i + 1].net;
    }
    monthlyNets.forEach((m, i) => {
      past.push({ key: m.key, label: m.label, balance: balances[i], income: m.income, expense: m.expense, saving: m.net, isProjection: false });
    });

    // Proyección futura (6 meses)
    const avgSaving = monthlyNets.filter(m => m.expense > 0).reduce((a, m) => a + m.net, 0) / Math.max(1, monthlyNets.filter(m => m.expense > 0).length);
    const future: typeof past = [];
    let runningBalance = patrimonio;
    const currentSalary = getSalaryForMonth(profile, currentMonthKey, dollarRate);
    const recentExpenses = monthlyNets.filter(m => m.expense > 0).slice(-3);
    const avgExpense = recentExpenses.length > 0 ? recentExpenses.reduce((a, m) => a + m.expense, 0) / recentExpenses.length : 0;

    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }).replace('.', '');
      runningBalance += avgSaving;
      future.push({ key: mk, label, balance: runningBalance, income: currentSalary, expense: avgExpense, saving: avgSaving, isProjection: true });
    }

    const all = [...past, ...future];
    const maxVal = Math.max(...all.map(m => m.balance), 1);
    const minVal = Math.min(...all.map(m => m.balance), 0);

    return { past, future, all, maxVal, minVal, avgSaving };
  }, [transactions, profile, patrimonio, dollarRate, currentMonthKey]);

  // Niveles de riqueza
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
  const progressToNext = nextLevel 
    ? Math.min(100, ((patrimonioUSD - currentLevel.limit) / (nextLevel.limit - currentLevel.limit)) * 100) 
    : 100;
  const amountToNext = nextLevel ? (nextLevel.limit - patrimonioUSD) * dollarRate : 0;

  const growth = evolution.avgSaving;

  // Chart
  const displayData = showProjection ? evolution.all : evolution.past;
  const chartH = 140;
  const range = evolution.maxVal - evolution.minVal;
  const getY = (val: number) => range > 0 ? chartH - ((val - evolution.minVal) / range) * chartH : chartH / 2;

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      <div className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-white/30 dark:border-slate-700/40 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold">Mi Patrimonio</h2>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto p-6 space-y-5 pb-24">

        {/* PATRIMONIO ACTUAL */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-blue-950/90 dark:via-slate-900 dark:to-slate-950 rounded-2xl p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 relative z-10">Patrimonio total</p>
          <p className="text-4xl font-black relative z-10">{formatMoney(patrimonio)}</p>
          <p className="text-lg font-bold text-slate-400 relative z-10">= {formatMoneyUSD(patrimonioUSD)}</p>
          {growth !== 0 && (
            <p className={`text-xs font-bold mt-2 relative z-10 ${growth > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {growth > 0 ? '+' : ''}{formatMoney(growth)}/mes promedio
            </p>
          )}
        </div>

        {/* NIVEL DE RIQUEZA */}
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
                <p className="text-[10px] text-slate-400">Siguiente nivel</p>
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
              Te faltan {formatMoney(amountToNext)} ({formatMoneyUSD(amountToNext / dollarRate)}) para {nextLevel.label}
              {growth > 0 && ` — a este ritmo en ${Math.ceil(amountToNext / growth)} meses`}
            </p>
          )}
        </div>

        {/* GRÁFICO DE EVOLUCIÓN + PROYECCIÓN */}
        <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">show_chart</span>
              Evolución
            </h3>
            <button 
              onClick={() => setShowProjection(!showProjection)}
              className={`text-[10px] font-bold px-3 py-1 rounded-full transition-colors ${showProjection ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary'}`}
            >
              {showProjection ? 'Ocultar proyección' : 'Ver proyección'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <div style={{ minWidth: displayData.length * 45 }}>
              <svg width="100%" height={chartH + 30} viewBox={`0 0 ${displayData.length * 45} ${chartH + 30}`} className="overflow-visible">
                {[0, 0.5, 1].map((pct, i) => (
                  <line key={i} x1="0" y1={chartH * pct} x2={displayData.length * 45} y2={chartH * pct} stroke="currentColor" strokeOpacity="0.05" strokeWidth="1" />
                ))}
                {/* Past line */}
                <polyline
                  points={displayData.filter(m => !m.isProjection).map((m, i) => `${i * 45 + 15},${getY(m.balance)}`).join(' ')}
                  fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                />
                {/* Projection line (dashed) */}
                {showProjection && (() => {
                  const projStart = evolution.past.length - 1;
                  const projPoints = displayData.filter((m, i) => i >= projStart).map((m, i) => `${(projStart + i) * 45 + 15},${getY(m.balance)}`).join(' ');
                  return <polyline points={projPoints} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="6 4" strokeLinecap="round" />;
                })()}
                {/* Dots */}
                {displayData.map((m, i) => (
                  <circle 
                    key={i} cx={i * 45 + 15} cy={getY(m.balance)} r={expandedMonth === m.key ? 6 : 3.5}
                    fill={m.isProjection ? '#8b5cf6' : '#3b82f6'} 
                    stroke={expandedMonth === m.key ? 'white' : 'none'} strokeWidth="2"
                    className="cursor-pointer" onClick={() => setExpandedMonth(expandedMonth === m.key ? null : m.key)}
                  />
                ))}
                {displayData.map((m, i) => (
                  <text key={i} x={i * 45 + 15} y={chartH + 18} textAnchor="middle" fontSize="8" fill="currentColor" opacity={m.isProjection ? 0.3 : 0.4} fontWeight="bold">{m.label}</text>
                ))}
              </svg>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mt-2">
            <span className="flex items-center gap-1 text-[9px] text-slate-400"><span className="size-1.5 rounded-full bg-blue-500 inline-block" /> Pasado</span>
            {showProjection && <span className="flex items-center gap-1 text-[9px] text-slate-400"><span className="size-1.5 rounded-full bg-purple-500 inline-block" /> Proyección</span>}
            <span className="text-[9px] text-slate-300">Tocá un punto para ver detalle</span>
          </div>
        </div>

        {/* DETALLE DEL MES EXPANDIDO */}
        {expandedMonth && (() => {
          const monthData = [...evolution.past, ...evolution.future].find(m => m.key === expandedMonth);
          if (!monthData) return null;
          return (
            <div className={`rounded-2xl p-4 border animate-[fadeIn_0.2s_ease-out] ${monthData.isProjection ? 'bg-purple-50/70 dark:bg-purple-900/20 border-purple-200/50 dark:border-purple-800/50' : 'bg-blue-50/70 dark:bg-blue-900/20 border-blue-200/50 dark:border-blue-800/50'}`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold capitalize">{monthData.label} {monthData.isProjection && <span className="text-[10px] text-purple-500">(estimado)</span>}</h4>
                <button onClick={() => setExpandedMonth(null)} className="text-slate-400 hover:text-slate-600">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between"><span className="text-xs text-slate-500">Patrimonio</span><span className="text-xs font-bold">{formatMoney(monthData.balance)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-slate-500">Ingresos</span><span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(monthData.income)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-slate-500">Gastos</span><span className="text-xs font-bold text-red-600 dark:text-red-400">{formatMoney(monthData.expense)}</span></div>
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1.5">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Ahorro del mes</span>
                  <span className={`text-xs font-bold ${monthData.saving >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{formatMoney(monthData.saving)}</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* DETALLE MES A MES */}
        <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">list</span>
            Detalle mes a mes
          </h3>
          <div className="space-y-1">
            {[...evolution.past].reverse().slice(0, 6).map(m => (
              <div key={m.key} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <span className="text-xs text-slate-500 capitalize w-16">{m.label}</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white flex-1 text-center">{formatMoney(m.balance)}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.saving >= 0 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {m.saving >= 0 ? '+' : ''}{formatMoney(m.saving)}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PatrimonioTracker;
