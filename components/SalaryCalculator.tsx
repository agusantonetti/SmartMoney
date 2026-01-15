
import React, { useState, useEffect } from 'react';
import { FinancialProfile, Transaction } from '../types';

interface Props {
  profile: FinancialProfile;
  transactions: Transaction[];
  onBack: () => void;
  onUpdateProfile: (profile: FinancialProfile) => void;
}

const SalaryCalculator: React.FC<Props> = ({ profile, transactions, onBack, onUpdateProfile }) => {
  const [activeTab, setActiveTab] = useState<'SALARY' | 'RUNWAY'>('SALARY');

  // --- SHARED DATA ---
  const currentDollarRate = profile.customDollarRate || 1130;
  
  // --- TAB 1: SALARY CALCULATOR STATE ---
  const [income, setIncome] = useState<string>('');
  const [rent, setRent] = useState<string>(''); 
  const [expenses, setExpenses] = useState<string>('');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [targetRentPercentage, setTargetRentPercentage] = useState<number>(30);

  // --- TAB 2: RUNWAY CALCULATOR STATE ---
  const [runwayPatrimony, setRunwayPatrimony] = useState<string>('');
  const [runwayRent, setRunwayRent] = useState<string>('');
  const [runwayExpenses, setRunwayExpenses] = useState<string>('');
  const [runwayCurrency, setRunwayCurrency] = useState<'ARS' | 'USD'>('USD'); // Default USD for rent in runway usually

  // Load initial data
  useEffect(() => {
    // Load Income for Tab 1
    const salary = (profile.incomeSources || []).reduce((acc, src) => acc + src.amount, 0) || (profile.monthlySalary || 0);
    setIncome(salary.toString());

    // Load Patrimony for Tab 2
    const currentSavings = profile.initialBalance || 0;
    setRunwayPatrimony(currentSavings.toString());
  }, [profile]);

  // --- CALCULATIONS: SALARY ---
  const calcSalaryRent = parseFloat(rent) || 0;
  const calcSalaryExpenses = parseFloat(expenses) || 0;
  const calcSalaryTotalHousing = (currency === 'USD' ? calcSalaryRent * currentDollarRate : calcSalaryRent) + calcSalaryExpenses;
  
  const requiredSalary = targetRentPercentage > 0 ? calcSalaryTotalHousing / (targetRentPercentage / 100) : 0;
  const currentSalary = parseFloat(income) || 0;
  const salaryDiff = currentSalary - requiredSalary;

  // --- CALCULATIONS: RUNWAY ---
  const calcRunwayPatrimony = parseFloat(runwayPatrimony) || 0;
  const calcRunwayRent = parseFloat(runwayRent) || 0;
  const calcRunwayExpenses = parseFloat(runwayExpenses) || 0;
  
  const calcRunwayTotalHousing = (runwayCurrency === 'USD' ? calcRunwayRent * currentDollarRate : calcRunwayRent) + calcRunwayExpenses;
  
  const monthsCovered = calcRunwayTotalHousing > 0 ? calcRunwayPatrimony / calcRunwayTotalHousing : 0;
  const yearsCovered = monthsCovered / 12;

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
            <h2 className="text-lg font-bold">Calculadora de Vivienda</h2>
            <p className="text-xs text-slate-500">Herramientas de planificación</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="w-full max-w-2xl mx-auto px-6 pt-6">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button 
                onClick={() => setActiveTab('SALARY')}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'SALARY' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400'}`}
            >
                <span className="material-symbols-outlined">payments</span>
                Sueldo Ideal
            </button>
            <button 
                onClick={() => setActiveTab('RUNWAY')}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'RUNWAY' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400'}`}
            >
                <span className="material-symbols-outlined">hourglass_top</span>
                Cobertura Alquiler
            </button>
        </div>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto p-6 pb-32">
        
        {/* --- TOOL 1: SALARY CALCULATOR --- */}
        {activeTab === 'SALARY' && (
            <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-500">calculate</span>
                        ¿Qué sueldo necesito?
                    </h3>
                    <p className="text-sm text-slate-500">Calcula cuánto deberías ganar para pagar un alquiler específico según la regla del {targetRentPercentage}%.</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                             <label className="text-xs font-bold text-slate-400 block mb-1">Costo Alquiler</label>
                             <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input 
                                        type="number" 
                                        value={rent} 
                                        onChange={e => setRent(e.target.value)} 
                                        className="w-full bg-slate-100 dark:bg-slate-800 p-3 rounded-xl outline-none font-bold"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center">
                                    <button onClick={() => setCurrency('ARS')} className={`px-3 py-2 rounded-lg text-xs font-bold ${currency === 'ARS' ? 'bg-white dark:bg-slate-600 shadow' : 'text-slate-400'}`}>ARS</button>
                                    <button onClick={() => setCurrency('USD')} className={`px-3 py-2 rounded-lg text-xs font-bold ${currency === 'USD' ? 'bg-white dark:bg-slate-600 shadow' : 'text-slate-400'}`}>USD</button>
                                </div>
                             </div>
                             {currency === 'USD' && <p className="text-[10px] text-slate-400 mt-1 text-right">Cotización: ${currentDollarRate}</p>}
                        </div>

                        <div className="col-span-2">
                             <label className="text-xs font-bold text-slate-400 block mb-1">Expensas (ARS)</label>
                             <input 
                                type="number" 
                                value={expenses} 
                                onChange={e => setExpenses(e.target.value)} 
                                className="w-full bg-slate-100 dark:bg-slate-800 p-3 rounded-xl outline-none font-bold"
                                placeholder="0"
                             />
                        </div>

                        <div className="col-span-2">
                            <label className="text-xs font-bold text-slate-400 block mb-2 flex justify-between">
                                <span>Regla (Vivienda máx %)</span>
                                <span className="text-slate-900 dark:text-white">{targetRentPercentage}%</span>
                            </label>
                            <input 
                                type="range" 
                                min="10" max="60" step="5" 
                                value={targetRentPercentage} 
                                onChange={e => setTargetRentPercentage(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                    </div>
                </div>

                {calcSalaryTotalHousing > 0 && (
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">Sueldo Neto Sugerido</p>
                            <h2 className="text-4xl font-black mb-4">{formatMoney(requiredSalary)}</h2>
                            
                            <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-indigo-100 uppercase">Tu sueldo actual</span>
                                    <span className="font-bold">{formatMoney(currentSalary)}</span>
                                </div>
                                <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full ${salaryDiff >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`} 
                                        style={{ width: `${Math.min(100, (currentSalary / requiredSalary) * 100)}%` }}
                                    ></div>
                                </div>
                                <p className="text-[10px] mt-2 text-right">
                                    {salaryDiff >= 0 
                                        ? `¡Genial! Te sobran ${formatMoney(salaryDiff)}` 
                                        : `Te faltan ${formatMoney(Math.abs(salaryDiff))}`
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- TOOL 2: RUNWAY CALCULATOR --- */}
        {activeTab === 'RUNWAY' && (
            <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                 <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-500">savings</span>
                        Cobertura Patrimonial
                    </h3>
                    <p className="text-sm text-slate-500">Calcula cuántos meses podrías vivir pagando este alquiler solo con tus ahorros.</p>
                    
                    <div className="space-y-4">
                        <div>
                             <label className="text-xs font-bold text-emerald-500 block mb-1">Tus Ahorros / Patrimonio (ARS)</label>
                             <input 
                                type="number" 
                                value={runwayPatrimony} 
                                onChange={e => setRunwayPatrimony(e.target.value)} 
                                className="w-full bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 p-4 rounded-xl outline-none font-black text-xl text-emerald-700 dark:text-emerald-400"
                                placeholder="0"
                             />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div className="col-span-2 sm:col-span-1">
                                 <label className="text-xs font-bold text-slate-400 block mb-1">Costo Alquiler</label>
                                 <div className="flex gap-2">
                                     <div className="relative flex-1">
                                        <input 
                                            type="number" 
                                            value={runwayRent} 
                                            onChange={e => setRunwayRent(e.target.value)} 
                                            className="w-full bg-slate-100 dark:bg-slate-800 p-3 rounded-xl outline-none font-bold"
                                            placeholder="0"
                                        />
                                     </div>
                                     <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center">
                                         <button onClick={() => setRunwayCurrency('ARS')} className={`px-2 py-2 rounded-lg text-[10px] font-bold ${runwayCurrency === 'ARS' ? 'bg-white dark:bg-slate-600 shadow' : 'text-slate-400'}`}>ARS</button>
                                         <button onClick={() => setRunwayCurrency('USD')} className={`px-2 py-2 rounded-lg text-[10px] font-bold ${runwayCurrency === 'USD' ? 'bg-white dark:bg-slate-600 shadow' : 'text-slate-400'}`}>USD</button>
                                     </div>
                                 </div>
                             </div>
                             <div className="col-span-2 sm:col-span-1">
                                 <label className="text-xs font-bold text-slate-400 block mb-1">Expensas (ARS)</label>
                                 <input 
                                    type="number" 
                                    value={runwayExpenses} 
                                    onChange={e => setRunwayExpenses(e.target.value)} 
                                    className="w-full bg-slate-100 dark:bg-slate-800 p-3 rounded-xl outline-none font-bold"
                                    placeholder="0"
                                 />
                             </div>
                        </div>
                    </div>
                </div>

                {calcRunwayTotalHousing > 0 && (
                    <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 size-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        
                        <div className="relative z-10 text-center py-4">
                            <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-2">Libertad de Alquiler</p>
                            <div className="flex items-baseline justify-center gap-2 mb-2">
                                <h1 className="text-6xl font-black">{monthsCovered.toFixed(1)}</h1>
                                <span className="text-xl font-medium opacity-80">Meses</span>
                            </div>
                            <p className="text-sm opacity-90">
                                Equivalente a <strong>{yearsCovered.toFixed(1)} años</strong> de vivienda cubierta.
                            </p>
                            
                            <div className="mt-6 pt-4 border-t border-white/20 flex justify-between text-xs font-medium opacity-80">
                                <span>Costo Mensual Total:</span>
                                <span>{formatMoney(calcRunwayTotalHousing)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

      </div>
    </div>
  );
};

export default SalaryCalculator;
