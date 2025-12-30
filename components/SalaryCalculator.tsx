
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
    
    // Sumamos todos los 'expense' del mes actual
    // Nota: Idealmente deberíamos excluir los que ya están en "Fixed Expenses" si el usuario los registró manualmente,
    // pero para este cálculo "Real a fin de mes", asumimos que lo que está en transacciones es lo que realmente salió.
    return transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(currentMonthKey))
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions]);

  const currentSalary = parseFloat(salaryInput) || 0;

  // RESULTADO 1: DISPONIBLE TEÓRICO (Sueldo - Fijos)
  const theoreticalNet = currentSalary - fixedExpensesTotal;
  const theoreticalSavingsRate = currentSalary > 0 ? (theoreticalNet / currentSalary) * 100 : 0;

  // RESULTADO 2: AHORRO REAL (Sueldo - Gastos Totales del Mes)
  // Aquí comparamos contra lo que realmente se ha gastado (variable + pagos fijos si se registraron)
  // Para una proyección más precisa, a veces se suma (Fixed - PaidFixed) + Variable, pero usaremos el total de transacciones como "Realidad actual".
  const actualSavings = currentSalary - variableExpensesTotal;
  const actualSavingsRate = currentSalary > 0 ? (actualSavings / currentSalary) * 100 : 0;

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleUpdateSalary = () => {
      // Guardar el sueldo ingresado en el perfil para futuro uso
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
            <h2 className="text-lg font-bold">Calculadora de Ahorro</h2>
            <p className="text-xs text-slate-500">Proyección vs. Realidad</p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto p-6 space-y-8 pb-24 animate-[fadeIn_0.3s_ease-out]">
        
        {/* INPUT: SUELDO MENSUAL */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                1. Tu Sueldo Mensual Total
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
            <p className="text-[10px] text-slate-400 mt-2">
                Suma de todos tus ingresos fijos y variables esperados para el mes.
            </p>
        </div>

        {/* SECTION: GASTOS FIJOS (TEÓRICO) */}
        <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-500">lock</span>
                Escenario 1: Solo Gastos Fijos
            </h3>
            
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-center mb-4 relative z-10">
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Sueldo - (Alquiler + Servicios + Suscripciones)</p>
                        <h2 className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{formatMoney(theoreticalNet)}</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
                            Disponible Teórico
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-red-500">- {formatMoney(fixedExpensesTotal)}</p>
                        <p className="text-[10px] text-slate-400">Gastos Fijos</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="relative z-10">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                        <span>Fijos: {((fixedExpensesTotal/currentSalary)*100).toFixed(0)}%</span>
                        <span>Libre: {theoreticalSavingsRate.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full overflow-hidden flex">
                        <div className="bg-red-400 h-full" style={{ width: `${Math.min(100, (fixedExpensesTotal / currentSalary) * 100)}%` }}></div>
                        <div className="bg-emerald-400 h-full flex-1"></div>
                    </div>
                </div>
            </div>
        </div>

        {/* SECTION: REALIDAD ACTUAL (GASTOS REALES) */}
        <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-500">receipt_long</span>
                Escenario 2: Realidad a Fin de Mes
            </h3>

            <div className={`rounded-2xl p-6 shadow-lg text-white relative overflow-hidden ${actualSavings >= 0 ? 'bg-gradient-to-br from-slate-800 to-slate-900 dark:from-emerald-900 dark:to-slate-900' : 'bg-gradient-to-br from-red-800 to-red-900'}`}>
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Capacidad de Ahorro Real</p>
                            <h2 className="text-4xl font-black tracking-tight">{formatMoney(actualSavings)}</h2>
                        </div>
                        <div className="bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm">
                            <span className="text-xs font-bold">{actualSavingsRate.toFixed(1)}% del Sueldo</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-black/20 p-4 rounded-xl backdrop-blur-sm">
                        <div>
                            <p className="text-[10px] text-white/60 uppercase">Gastado este mes</p>
                            <p className="text-lg font-bold text-red-300">{formatMoney(variableExpensesTotal)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-white/60 uppercase">Estado</p>
                            <p className={`text-lg font-bold ${actualSavings >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                                {actualSavings >= 0 ? 'Superávit' : 'Déficit'}
                            </p>
                        </div>
                    </div>
                    
                    <p className="text-[10px] text-white/40 mt-4 text-center">
                        Calculado restando todas las transacciones registradas este mes a tu sueldo base.
                    </p>
                </div>
            </div>
        </div>

        {/* Tip Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl flex items-start gap-3 border border-blue-100 dark:border-blue-800/50">
            <span className="material-symbols-outlined text-blue-500 mt-0.5">lightbulb</span>
            <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-bold mb-1">¿Cómo mejorar esto?</p>
                <p className="opacity-80 leading-relaxed">
                    La diferencia entre el <strong>Escenario 1</strong> y el <strong>2</strong> son tus "Gastos Hormiga" y variables. Si tu Ahorro Real es mucho menor que tu Disponible Teórico, revisa tus gastos diarios en la sección de Actividad.
                </p>
            </div>
        </div>

      </div>
    </div>
  );
};

export default SalaryCalculator;
