
import React, { useMemo } from 'react';
import { FinancialProfile, FinancialMetrics, Transaction } from '../types';
import { formatMoney, formatMoneyUSD, getDollarRate } from '../utils';

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

  // Evolución de patrimonio (últimos 12 meses estimado)
  const evolution = useMemo(() => {
    const months: { key: string, label: string, balance: number }[] = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }).replace('.', '');
      
      // Calcular balance acumulado hasta ese mes
      const txsUntilMonth = transactions.filter(t => t.date <= `${mk}-31`);
      const income = txsUntilMonth.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
      const expense = txsUntilMonth.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
      const estimatedBalance = (profile.initialBalance || 0) + income - expense;
      
      months.push({ key: mk, label, balance: estimatedBalance });
    }
    
    const maxVal = Math.max(...months.map(m => Math.abs(m.balance)), 1);
    const minVal = Math.min(...months.map(m => m.balance), 0);
    
    return { months, maxVal, minVal };
  }, [transactions, profile.initialBalance]);

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

  // Crecimiento mensual promedio
  const growth = useMemo(() => {
    if (evolution.months.length < 2) return { monthly: 0, pct: 0 };
    const recent = evolution.months.slice(-3);
    if (recent.length < 2) return { monthly: 0, pct: 0 };
    const diffs = [];
    for (let i = 1; i < recent.length; i++) {
      diffs.push(recent[i].balance - recent[i-1].balance);
    }
    const avgMonthly = diffs.reduce((a, d) => a + d, 0) / diffs.length;
    const pct = recent[0].balance > 0 ? (avgMonthly / recent[0].balance) * 100 : 0;
    return { monthly: avgMonthly, pct };
  }, [evolution]);

  // Gráfico helper
  const chartHeight = 160;
  const range = evolution.maxVal - evolution.minVal;
  const getY = (val: number) => range > 0 ? chartHeight - ((val - evolution.minVal) / range) * chartHeight : chartHeight / 2;

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
          {growth.monthly !== 0 && (
            <p className={`text-xs font-bold mt-2 relative z-10 ${growth.monthly > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {growth.monthly > 0 ? '+' : ''}{formatMoney(growth.monthly)}/mes promedio ({growth.pct > 0 ? '+' : ''}{growth.pct.toFixed(1)}%)
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
            <div className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-blue-500 to-purple-500`} style={{ width: `${progressToNext}%` }} />
          </div>
          {nextLevel && (
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              Te faltan {formatMoney(amountToNext)} ({formatMoneyUSD(amountToNext / dollarRate)}) para {nextLevel.label}
              {growth.monthly > 0 && ` — a este ritmo llegarías en ${Math.ceil(amountToNext / growth.monthly)} meses`}
            </p>
          )}
        </div>

        {/* GRÁFICO DE EVOLUCIÓN */}
        <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-4 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">show_chart</span>
            Evolución del patrimonio (12 meses)
          </h3>
          <div className="relative" style={{ height: chartHeight + 30 }}>
            <svg width="100%" height={chartHeight + 30} viewBox={`0 0 ${evolution.months.length * 50} ${chartHeight + 30}`} className="overflow-visible">
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
                <line key={i} x1="0" y1={chartHeight * pct} x2={evolution.months.length * 50} y2={chartHeight * pct} stroke="currentColor" strokeOpacity="0.05" strokeWidth="1" />
              ))}
              {/* Area fill */}
              <path
                d={`M 10 ${getY(evolution.months[0]?.balance || 0)} ${evolution.months.map((m, i) => `L ${i * 50 + 10} ${getY(m.balance)}`).join(' ')} L ${(evolution.months.length - 1) * 50 + 10} ${chartHeight} L 10 ${chartHeight} Z`}
                fill="url(#areaGrad)" opacity="0.3"
              />
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Line */}
              <polyline
                points={evolution.months.map((m, i) => `${i * 50 + 10},${getY(m.balance)}`).join(' ')}
                fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              />
              {/* Dots */}
              {evolution.months.map((m, i) => (
                <circle key={i} cx={i * 50 + 10} cy={getY(m.balance)} r={i === evolution.months.length - 1 ? 5 : 3} fill={i === evolution.months.length - 1 ? '#3b82f6' : '#94a3b8'} />
              ))}
              {/* Labels */}
              {evolution.months.map((m, i) => (
                <text key={i} x={i * 50 + 10} y={chartHeight + 18} textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.4" fontWeight="bold">{m.label}</text>
              ))}
            </svg>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PatrimonioTracker;
