
import React, { useState, useEffect } from 'react';
import { FinancialProfile, Transaction } from '../types';

interface Props {
  profile: FinancialProfile;
  transactions: Transaction[];
  onBack: () => void;
  onUpdateProfile: (profile: FinancialProfile) => void;
}

const SalaryCalculator: React.FC<Props> = ({ profile, transactions, onBack, onUpdateProfile }) => {
  const [activeTab, setActiveTab] = useState<'SALARY' | 'RUNWAY' | 'MEDIA'>('SALARY');

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

  // --- TAB 3: MEDIA CALCULATOR STATE ---
  const [mediaIncome, setMediaIncome] = useState<string>('');
  const [programsPerWeek, setProgramsPerWeek] = useState<string>('');
  const [hoursPerProgram, setHoursPerProgram] = useState<string>('');

  // Load initial data
  useEffect(() => {
    // Load Income for Tab 1 & 3
    const salary = (profile.incomeSources || []).reduce((acc, src) => acc + src.amount, 0) || (profile.monthlySalary || 0);
    setIncome(salary.toString());
    setMediaIncome(salary.toString());

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

  // --- CALCULATIONS: MEDIA ---
  const calcMediaIncome = parseFloat(mediaIncome) || 0;
  const calcProgramsWeek = parseFloat(programsPerWeek) || 0;
  const calcHoursProgram = parseFloat(hoursPerProgram) || 0;

  // Promedio semanas por mes: 4.33
  const totalProgramsMonth = calcProgramsWeek * 4.33; 
  const totalHoursMonth = totalProgramsMonth * calcHoursProgram;

  const incomePerProgram = totalProgramsMonth > 0 ? calcMediaIncome / totalProgramsMonth : 0;
  const incomePerHour = totalHoursMonth > 0 ? calcMediaIncome / totalHoursMonth : 0;

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
            <h2 className="text-lg font-bold">Calculadora Financiera</h2>
            <p className="text-xs text-slate-500">Herramientas de planificación</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="w-full max-w-2xl mx-auto px-6 pt-6">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto scrollbar-hide">
            <button 
                onClick={() => setActiveTab('SALARY')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'SALARY' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400'}`}
            >
                <span className="material-symbols-outlined text-[18px]">payments</span>
                Sueldo Ideal
            </button>
            <button 
                onClick={() => setActiveTab('RUNWAY')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'RUNWAY' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400'}`}
            >
                <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
                Cobertura
            </button>
            <button 
                onClick={() => setActiveTab('MEDIA')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'MEDIA' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400'}`}
            >
                <span className="material-symbols-outlined text-[18px]">mic</span>
                Valor Show
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

        {/* --- TOOL 3: MEDIA INCOME CALCULATOR --- */}
        {activeTab === 'MEDIA' && (
            <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined text-purple-500">podcasts</span>
                        Valor Hora / Programa
                    </h3>
                    <p className="text-sm text-slate-500">Calcula cuánto estás ganando realmente por cada salida al aire o por hora de trabajo en medios.</p>
                    
                    <div className="space-y-4">
                        <div>
                             <label className="text-xs font-bold text-slate-400 block mb-1">Sueldo / Ingreso Mensual Total</label>
                             <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                <input 
                                    type="number" 
                                    value={mediaIncome} 
                                    onChange={e => setMediaIncome(e.target.value)} 
                                    className="w-full bg-slate-100 dark:bg-slate-800 p-3 pl-8 rounded-xl outline-none font-bold text-lg"
                                    placeholder="0"
                                />
                             </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <label className="text-xs font-bold text-slate-400 block mb-1">Programas x Semana</label>
                                 <input 
                                    type="number" 
                                    value={programsPerWeek} 
                                    onChange={e => setProgramsPerWeek(e.target.value)} 
                                    className="w-full bg-slate-100 dark:bg-slate-800 p-3 rounded-xl outline-none font-bold"
                                    placeholder="Ej. 5"
                                 />
                             </div>
                             <div>
                                 <label className="text-xs font-bold text-slate-400 block mb-1">Horas x Programa</label>
                                 <input 
                                    type="number" 
                                    value={hoursPerProgram} 
                                    onChange={e => setHoursPerProgram(e.target.value)} 
                                    className="w-full bg-slate-100 dark:bg-slate-800 p-3 rounded-xl outline-none font-bold"
                                    placeholder="Ej. 2"
                                 />
                             </div>
                        </div>
                    </div>
                </div>

                {(incomePerProgram > 0 || incomePerHour > 0) && (
                    <div className="grid grid-cols-1 gap-4">
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-4 opacity-80">
                                    <span className="material-symbols-outlined text-lg">mic</span>
                                    <p className="text-xs font-bold uppercase tracking-widest">Valor por Show</p>
                                </div>
                                <h2 className="text-5xl font-black mb-2">{formatMoney(incomePerProgram)}</h2>
                                <p className="text-xs text-purple-200">Cada vez que sales al aire.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Valor por Hora</p>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{formatMoney(incomePerHour)}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total al Mes</p>
                                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    <span className="block">{Math.round(totalProgramsMonth)} Programas</span>
                                    <span className="block text-slate-400">{Math.round(totalHoursMonth)} Horas Aire</span>
                                </div>
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
