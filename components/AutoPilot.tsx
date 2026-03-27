
import React, { useMemo, useState } from 'react';
import { FinancialProfile, Transaction } from '../types';
import { formatMoney, formatMoneyUSD, getDollarRate, getCurrentMonthKey } from '../utils';

interface Props {
  profile: FinancialProfile;
  transactions: Transaction[];
  currentBalance: number;
  onBack: () => void;
}

const AutoPilot: React.FC<Props> = ({ profile, transactions, currentBalance, onBack }) => {
  const dollarRate = getDollarRate(profile);
  const currentMonthKey = getCurrentMonthKey();
  const [extraSaving, setExtraSaving] = useState('');
  const [cutPercent, setCutPercent] = useState(20);

  const projection = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const monthsToDecember = 12 - currentMonth;

    // Ingreso mensual promedio (de sueldos)
    const monthlyIncome = (profile.incomeSources || []).reduce((sum, src) => {
      if (src.isActive === false) return sum;
      let val = 0;
      if (src.isCreatorSource) {
        const payments = src.payments?.filter(p => p.month.startsWith(currentMonthKey)) || [];
        val = payments.reduce((a, p) => a + p.realAmount, 0);
      } else {
        val = src.amount;
        if (src.frequency === 'BIWEEKLY') val *= 2;
        if (src.frequency === 'ONE_TIME') val = 0;
      }
      if (src.currency === 'USD') val *= dollarRate;
      return sum + val;
    }, 0);

    // Gasto mensual promedio (últimos 3 meses)
    const last3Months: number[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthExpense = transactions.filter(t => t.type === 'expense' && t.date.startsWith(mk)).reduce((a, t) => a + t.amount, 0);
      if (monthExpense > 0) last3Months.push(monthExpense);
    }
    const avgExpense = last3Months.length > 0 ? last3Months.reduce((a, b) => a + b, 0) / last3Months.length : 0;

    // Top categoría de gasto
    const recentExpenses = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonthKey));
    const byCat: Record<string, number> = {};
    recentExpenses.forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
    const topCategory = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
    const topCatName = topCategory ? topCategory[0] : 'Gastos';
    const topCatAmount = topCategory ? topCategory[1] : 0;

    const monthlySaving = monthlyIncome - avgExpense;

    // Escenario 1: Seguir igual
    const scenario1 = currentBalance + (monthlySaving * monthsToDecember);

    // Escenario 2: Recortar top categoría un X%
    const cutAmount = topCatAmount * (cutPercent / 100);
    const scenario2saving = monthlySaving + cutAmount;
    const scenario2 = currentBalance + (scenario2saving * monthsToDecember);

    // Escenario 3: Ahorrar extra
    const extraAmount = parseFloat(extraSaving) || 0;
    const scenario3saving = monthlySaving + extraAmount;
    const scenario3 = currentBalance + (scenario3saving * monthsToDecember);

    // Meses hasta meta
    const monthsData = [];
    for (let i = 0; i <= monthsToDecember; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
      monthsData.push({
        label,
        base: currentBalance + (monthlySaving * i),
        optimized: currentBalance + (scenario2saving * i),
        extra: currentBalance + (scenario3saving * i),
      });
    }

    return {
      monthlyIncome, avgExpense, monthlySaving,
      monthsToDecember,
      scenario1, scenario2, scenario3,
      topCatName, topCatAmount, cutAmount,
      monthsData,
    };
  }, [transactions, profile, currentBalance, dollarRate, currentMonthKey, cutPercent, extraSaving]);

  const maxChart = Math.max(...projection.monthsData.map(m => Math.max(m.base, m.optimized, m.extra)), 1);
  const chartH = 160;

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      <div className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-white/30 dark:border-slate-700/40 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold">Piloto Automático</h2>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto p-6 space-y-5 pb-24">

        {/* DATOS BASE */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-3 text-center">
            <p className="text-[10px] font-bold uppercase text-emerald-500">Ingreso/mes</p>
            <p className="text-sm font-black text-slate-900 dark:text-white mt-1">{formatMoney(projection.monthlyIncome)}</p>
          </div>
          <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-3 text-center">
            <p className="text-[10px] font-bold uppercase text-red-500">Gasto prom.</p>
            <p className="text-sm font-black text-slate-900 dark:text-white mt-1">{formatMoney(projection.avgExpense)}</p>
          </div>
          <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-3 text-center">
            <p className="text-[10px] font-bold uppercase text-blue-500">Ahorro/mes</p>
            <p className={`text-sm font-black mt-1 ${projection.monthlySaving >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{formatMoney(projection.monthlySaving)}</p>
          </div>
        </div>

        {/* ESCENARIOS */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase text-slate-400 ml-1">Proyección a diciembre ({projection.monthsToDecember} meses)</h3>
          
          {/* Escenario 1: Seguir igual */}
          <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="size-3 rounded-full bg-slate-400" />
              <span className="text-sm font-bold">Si seguís así</span>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{formatMoney(projection.scenario1)}</p>
            <p className="text-[10px] text-slate-400">= {formatMoneyUSD(projection.scenario1 / dollarRate)}</p>
          </div>

          {/* Escenario 2: Recortar */}
          <div className="bg-emerald-50/70 dark:bg-emerald-900/20 backdrop-blur-xl border border-emerald-200/50 dark:border-emerald-800/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="size-3 rounded-full bg-emerald-500" />
              <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Si recortás {projection.topCatName} un {cutPercent}%</span>
            </div>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{formatMoney(projection.scenario2)}</p>
            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
              Ahorrarías {formatMoney(projection.cutAmount)}/mes extra — {formatMoney(projection.scenario2 - projection.scenario1)} más que hoy
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] font-bold text-slate-400">Recorte:</span>
              <input type="range" min="5" max="50" step="5" value={cutPercent} onChange={e => setCutPercent(parseInt(e.target.value))} className="flex-1" />
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 min-w-[32px]">{cutPercent}%</span>
            </div>
          </div>

          {/* Escenario 3: Extra */}
          <div className="bg-blue-50/70 dark:bg-blue-900/20 backdrop-blur-xl border border-blue-200/50 dark:border-blue-800/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="size-3 rounded-full bg-blue-500" />
              <span className="text-sm font-bold text-blue-800 dark:text-blue-300">Si ahorrás extra por mes</span>
            </div>
            <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{formatMoney(projection.scenario3)}</p>
            <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70">
              {parseFloat(extraSaving) > 0 ? `${formatMoney(projection.scenario3 - projection.scenario1)} más que hoy` : 'Ingresá un monto abajo'}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-slate-400 font-bold text-sm">$</span>
              <input 
                type="number" 
                placeholder="Monto extra/mes"
                value={extraSaving}
                onChange={e => setExtraSaving(e.target.value)}
                className="flex-1 bg-white/50 dark:bg-slate-900/50 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-1 focus:ring-blue-500"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>
        </div>

        {/* MINI GRÁFICO DE PROYECCIÓN */}
        <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">timeline</span>
            Proyección visual
          </h3>
          <div className="flex items-end justify-between gap-1 h-40">
            {projection.monthsData.map((m, i) => {
              const baseH = (m.base / maxChart) * chartH;
              const optH = (m.optimized / maxChart) * chartH;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div className="w-full flex justify-center gap-0.5 items-end flex-1">
                    <div className="w-1.5 bg-slate-300 dark:bg-slate-600 rounded-t-sm transition-all duration-500" style={{ height: `${Math.max(2, (baseH / chartH) * 100)}%` }} />
                    <div className="w-1.5 bg-emerald-500 rounded-t-sm transition-all duration-500" style={{ height: `${Math.max(2, (optH / chartH) * 100)}%` }} />
                  </div>
                  <span className="text-[8px] font-bold text-slate-400">{m.label}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-4 mt-2">
            <span className="flex items-center gap-1 text-[9px] text-slate-400"><span className="size-1.5 rounded-full bg-slate-400 inline-block" /> Actual</span>
            <span className="flex items-center gap-1 text-[9px] text-slate-400"><span className="size-1.5 rounded-full bg-emerald-500 inline-block" /> Optimizado</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AutoPilot;
