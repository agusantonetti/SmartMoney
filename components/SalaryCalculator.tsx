import React, { useState, useEffect, useMemo } from 'react';
import { FinancialProfile, Transaction } from '../types';

interface Props {
  profile: FinancialProfile;
  transactions: Transaction[];
  onBack: () => void;
  onUpdateProfile: (profile: FinancialProfile) => void;
}

const SalaryCalculator: React.FC<Props> = ({ profile, transactions, onBack, onUpdateProfile }) => {
  // Estado inicial del sueldo (suma de fuentes de ingreso o el valor guardado)
  const initialMonthlyIncome = useMemo(() => {
    const fromSources = (profile.incomeSources || []).reduce((acc, src) => acc + src.amount, 0);
    return fromSources > 0 ? fromSources : (profile.monthlySalary || 0);
  }, [profile]);

  const [salaryInput, setSalaryInput] = useState(initialMonthlyIncome.toString());
  
  // 1. GASTOS FIJOS (Suscripciones, Alquiler, Servicios)
  const fixedExpensesTotal = useMemo(() => {
    return (profile.subscriptions || []).reduce((acc, sub) => acc + sub.amount, 0);
  }, [profile]);

  // 2. GASTOS VARIABLES DEL MES ACTUAL (Transacciones)
  const variableExpensesTotal = useMemo(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    return transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(currentMonthKey))
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions]);

  const currentSalary = parseFloat(salaryInput) || 0;
  const totalOutflow = fixedExpensesTotal + variableExpensesTotal;

  // CÁLCULO DE COSTO DE VIDA (Porcentaje del sueldo)
  const costOfLivingPercentage = currentSalary > 0 ? (totalOutflow / currentSalary) * 100 : 0;
  
  // CÁLCULO DE HORAS DE TRABAJO (Si existe hourlyWage)
  const hoursWorkedForExpenses = profile.hourlyWage && profile.hourlyWage > 0 
    ? totalOutflow / profile.hourlyWage 
    : 0;

  // Escenarios
  const theoreticalNet = currentSalary - fixedExpensesTotal;
  const theoreticalSavingsRate = currentSalary > 0 ? (theoreticalNet / currentSalary) * 100 : 0;
  
  const actualSavings = currentSalary - totalOutflow;
  const actualSavingsRate = currentSalary > 0 ? (actualSavings / currentSalary) * 100 : 0;

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleUpdateSalary = () => {
      onUpdateProfile({
          ...profile,
          monthlySalary: currentSalary
      });
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
            <h2 className="text-lg font-bold">Costo de Vida</h2>
            <p className="text-xs text-slate-500">¿Cuánto cuesta tu estilo de vida?</p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto p-6 space-y-8 pb-24 animate-[fadeIn_0.3s_ease-out]">
        
        {/* INPUT: SUELDO MENSUAL */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                1. Sueldo Promedio Mensual
            </label>
            <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">$</span>
                    <input 
                        type="number" 
                        value={salaryInput}
                        onChange={(e) => setSalaryInput(e.target.value)}
                        onBlur={handleUpdateSalary}
                        className="w-full bg-slate-50 dark:bg-slate-800/50 h-14 pl-10 pr-4 rounded-xl text-2xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder-slate-300"
                        placeholder="0"
                    />
                </div>
                <button 
                    onClick={handleUpdateSalary}
                    className="size-14 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-primary transition-colors"
                    title="Actualizar base"
                >
                    <span className="material-symbols-outlined">save</span>
                </button>
            </div>
        </div>

        {/* METRIC: LIFE HOURS COST */}
        {profile.hourlyWage && profile.hourlyWage > 0 && (
            <div className="bg-indigo-600 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                    <h3 className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">timelapse</span>
                        Impacto en Tiempo
                    </h3>
                    <p className="text-sm text-indigo-100 mb-4 opacity-80">
                        Basado en tu valor hora de <strong>{formatMoney(profile.hourlyWage)}</strong>.
                    </p>
                    <div className="flex items-end gap-2">
                        <h2 className="text-5xl font-black">{Math.ceil(hoursWorkedForExpenses)}</h2>
                        <span className="text-lg font-bold mb-2">Horas</span>
                    </div>
                    <p className="text-xs font-medium mt-2 bg-black/20 inline-block px-3 py-1 rounded-lg">
                        De trabajo necesarias para pagar tus gastos de este mes.
                    </p>
                </div>
            </div>
        )}

        {/* SECTION: COST OF LIVING ANALYSIS */}
        <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-500">pie_chart</span>
                Distribución de tus Ingresos
            </h3>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <p className="text-3xl font-black text-slate-900 dark:text-white">{costOfLivingPercentage.toFixed(1)}%</p>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">De tu sueldo ya gastado</p>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-bold text-red-500">- {formatMoney(totalOutflow)}</p>
                        <p className="text-[10px] text-slate-400">Total Gastos (Fijos + Var)</p>
                    </div>
                </div>

                {/* Breakdown Bar */}
                <div className="w-full h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex mb-2">
                    <div className="bg-indigo-500 h-full" style={{ width: `${Math.min(100, (fixedExpensesTotal / currentSalary) * 100)}%` }}></div>
                    <div className="bg-orange-400 h-full" style={{ width: `${Math.min(100, (variableExpensesTotal / currentSalary) * 100)}%` }}></div>
                </div>
                
                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                        <div className="size-2 rounded-full bg-indigo-500"></div>
                        Fijos ({((fixedExpensesTotal/currentSalary)*100).toFixed(0)}%)
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="size-2 rounded-full bg-orange-400"></div>
                        Variables ({((variableExpensesTotal/currentSalary)*100).toFixed(0)}%)
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="size-2 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                        Libre ({actualSavingsRate.toFixed(0)}%)
                    </div>
                </div>
            </div>
        </div>

        {/* SECTION: SCENARIOS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Scenario 1 */}
            <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Teórico (Solo Fijos)</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(theoreticalNet)}</p>
                <p className="text-xs text-slate-500 mt-1">Si no gastaras nada extra.</p>
            </div>

            {/* Scenario 2 */}
            <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Realidad Actual</p>
                <p className={`text-xl font-bold ${actualSavings >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
                    {formatMoney(actualSavings)}
                </p>
                <p className="text-xs text-slate-500 mt-1">Lo que te queda hoy.</p>
            </div>
        </div>

        {/* Tip Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl flex items-start gap-3 border border-blue-100 dark:border-blue-800/50">
            <span className="material-symbols-outlined text-blue-500 mt-0.5">lightbulb</span>
            <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-bold mb-1">Costo de Vida</p>
                <p className="opacity-80 leading-relaxed">
                    Si tu costo de vida supera el <strong>70%</strong>, considera revisar tus gastos fijos o aumentar tus ingresos para tener mayor margen de maniobra ante imprevistos.
                </p>
            </div>
        </div>

      </div>
    </div>
  );
};

export default SalaryCalculator;