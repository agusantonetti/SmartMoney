
import React, { useMemo, useState } from 'react';
import { FinancialProfile, Transaction } from '../types';
import { formatMoney, formatMoneyUSD, getDollarRate, getCurrentMonthKey, getSalaryForMonth } from '../utils';

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
    const monthsToDecember = 11 - currentMonth;

    const monthlyIncome = getSalaryForMonth(profile, currentMonthKey, dollarRate);

    // Gasto promedio de los últimos meses con datos
    const monthDetails: { label: string, expense: number }[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-ES', { month: 'long' });
      const monthExpense = transactions.filter(t => t.type === 'expense' && t.date.startsWith(mk)).reduce((a, t) => a + t.amount, 0);
      if (monthExpense > 0) monthDetails.push({ label, expense: monthExpense });
    }
    const avgExpense = monthDetails.length > 0 ? monthDetails.reduce((a, b) => a + b.expense, 0) / monthDetails.length : 0;

    // Top categoría
    const recentExpenses = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonthKey));
    const byCat: Record<string, number> = {};
    recentExpenses.forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
    const topCategory = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
    const topCatName = topCategory ? topCategory[0] : 'Gastos';
    const topCatAmount = topCategory ? topCategory[1] : 0;

    const monthlySaving = monthlyIncome - avgExpense;
    const cutAmount = topCatAmount * (cutPercent / 100);
    const extraAmount = parseFloat(extraSaving) || 0;

    const scenario1 = currentBalance + (monthlySaving * monthsToDecember);
    const scenario2 = currentBalance + ((monthlySaving + cutAmount) * monthsToDecember);
    const scenario3 = currentBalance + ((monthlySaving + extraAmount) * monthsToDecember);

    return {
      monthlyIncome, avgExpense, monthlySaving, monthsToDecember,
      monthDetails, topCatName, topCatAmount, cutAmount, extraAmount,
      scenario1, scenario2, scenario3,
    };
  }, [transactions, profile, currentBalance, dollarRate, currentMonthKey, cutPercent, extraSaving]);

  const ExplainRow = ({ label, amount, color = 'slate' }: { label: string, amount: number, color?: string }) => (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-xs font-bold text-${color}-600 dark:text-${color}-400`}>{formatMoney(amount)}</span>
    </div>
  );

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      <div className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-white/30 dark:border-slate-700/40 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="text-lg font-bold">Piloto Automático</h2>
          <p className="text-xs text-slate-500">Proyección a diciembre ({projection.monthsToDecember} meses)</p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto p-6 space-y-5 pb-24">

        {/* CÓMO SE CALCULA — Transparencia total */}
        <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">calculate</span>
            De dónde salen los números
          </h3>

          <ExplainRow label="Tu sueldo mensual (configurado en Ingresos)" amount={projection.monthlyIncome} color="emerald" />
          
          <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
          
          <div className="py-1">
            <p className="text-[10px] text-slate-400 mb-1">Gasto promedio mensual (basado en los últimos meses):</p>
            {projection.monthDetails.map((m, i) => (
              <div key={i} className="flex justify-between pl-3">
                <span className="text-[10px] text-slate-400 capitalize">{m.label}</span>
                <span className="text-[10px] font-bold text-slate-500">{formatMoney(m.expense)}</span>
              </div>
            ))}
            {projection.monthDetails.length > 1 && (
              <div className="flex justify-between pl-3 mt-1 pt-1 border-t border-dashed border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400">Promedio</span>
                <span className="text-[10px] font-bold text-red-500">{formatMoney(projection.avgExpense)}</span>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

          <div className="flex items-center justify-between py-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg px-3 mt-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {formatMoney(projection.monthlyIncome)} − {formatMoney(projection.avgExpense)} =
            </span>
            <span className={`text-sm font-black ${projection.monthlySaving >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatMoney(projection.monthlySaving)}/mes
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 text-center">
            {projection.monthlySaving >= 0 ? 'Ahorrás' : 'Perdés'} esto cada mes en promedio
          </p>
        </div>

        {/* PATRIMONIO ACTUAL */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 text-center">
          <p className="text-[10px] font-bold uppercase text-slate-400">Tu patrimonio hoy</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{formatMoney(currentBalance)}</p>
          <p className="text-[10px] text-slate-400">= {formatMoneyUSD(currentBalance / dollarRate)}</p>
        </div>

        {/* ESCENARIOS */}
        <h3 className="text-xs font-bold uppercase text-slate-400 ml-1 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px]">alt_route</span>
          3 escenarios para diciembre
        </h3>

        {/* Escenario 1 */}
        <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-3 rounded-full bg-slate-400" />
            <span className="text-sm font-bold">Si seguís igual</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{formatMoney(projection.scenario1)}</p>
          <p className="text-[10px] text-slate-400 mt-1">
            {formatMoney(currentBalance)} + ({formatMoney(projection.monthlySaving)} × {projection.monthsToDecember} meses) = {formatMoney(projection.scenario1)}
          </p>
        </div>

        {/* Escenario 2 */}
        <div className="bg-emerald-50/70 dark:bg-emerald-900/20 backdrop-blur-xl border border-emerald-200/50 dark:border-emerald-800/50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-3 rounded-full bg-emerald-500" />
            <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Si recortás {projection.topCatName} un {cutPercent}%</span>
          </div>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{formatMoney(projection.scenario2)}</p>
          <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mt-1">
            Gastás {formatMoney(projection.topCatAmount)} en {projection.topCatName} → recorte del {cutPercent}% = {formatMoney(projection.cutAmount)}/mes extra
          </p>
          <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
            Nuevo ahorro: {formatMoney(projection.monthlySaving + projection.cutAmount)}/mes → {formatMoney(projection.scenario2 - projection.scenario1)} más que hoy
          </p>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-[10px] font-bold text-slate-400">Recorte:</span>
            <input type="range" min="5" max="50" step="5" value={cutPercent} onChange={e => setCutPercent(parseInt(e.target.value))} className="flex-1 accent-emerald-500" />
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 min-w-[32px]">{cutPercent}%</span>
          </div>
        </div>

        {/* Escenario 3 */}
        <div className="bg-blue-50/70 dark:bg-blue-900/20 backdrop-blur-xl border border-blue-200/50 dark:border-blue-800/50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-3 rounded-full bg-blue-500" />
            <span className="text-sm font-bold text-blue-800 dark:text-blue-300">Si ahorrás extra por mes</span>
          </div>
          <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{formatMoney(projection.scenario3)}</p>
          <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70 mt-1">
            {projection.extraAmount > 0 
              ? `Nuevo ahorro: ${formatMoney(projection.monthlySaving + projection.extraAmount)}/mes → ${formatMoney(projection.scenario3 - projection.scenario1)} más que hoy`
              : 'Ingresá un monto abajo para ver el impacto'}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-slate-400 font-bold text-sm">$</span>
            <input 
              type="number" placeholder="Monto extra/mes" value={extraSaving}
              onChange={e => setExtraSaving(e.target.value)}
              className="flex-1 bg-white/50 dark:bg-slate-900/50 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-1 focus:ring-blue-500"
              style={{ fontSize: '16px' }}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default AutoPilot;
