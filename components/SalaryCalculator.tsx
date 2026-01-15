
import React, { useState, useEffect, useMemo } from 'react';
import { FinancialProfile, Transaction } from '../types';

interface Props {
  profile: FinancialProfile;
  transactions: Transaction[];
  onBack: () => void;
  onUpdateProfile: (profile: FinancialProfile) => void;
}

const SalaryCalculator: React.FC<Props> = ({ profile, transactions, onBack, onUpdateProfile }) => {
  // --- STATE: DATOS BASE (Editables) ---
  const [income, setIncome] = useState<string>('');
  const [rent, setRent] = useState<string>(''); // Gasto vivienda aislado
  const [otherFixed, setOtherFixed] = useState<string>('');
  const [variable, setVariable] = useState<string>('');
  
  // --- STATE: SIMULADOR ---
  const [simRent, setSimRent] = useState<string>('');
  const [simCurrency, setSimCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [targetRentPercentage, setTargetRentPercentage] = useState<number>(30); // Regla del 30% por defecto

  // Cargar datos iniciales
  useEffect(() => {
    const salary = (profile.incomeSources || []).reduce((acc, src) => acc + src.amount, 0) || (profile.monthlySalary || 0);
    const totalFixed = (profile.subscriptions || []).reduce((acc, sub) => acc + sub.amount, 0);
    
    // Estimación básica: Asumimos que el gasto fijo más alto podría ser alquiler, si no, usuario ajusta.
    // O simplemente ponemos 0 y dejamos que el usuario rellene.
    // Para UX, cargamos totalFixed en "OtherFixed" y dejamos Rent en 0 para que el usuario divida.
    
    // Calcular variables promedio (último mes)
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const variableCalc = transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(currentMonthKey))
      .reduce((acc, t) => acc + t.amount, 0);

    setIncome(salary.toString());
    setRent('0'); 
    setOtherFixed(totalFixed.toString());
    setVariable(variableCalc.toString());
  }, [profile, transactions]);

  // --- CALCULOS ---
  
  const currentDollarRate = profile.customDollarRate || 1130;

  const valIncome = parseFloat(income) || 0;
  const valRent = parseFloat(rent) || 0;
  const valOtherFixed = parseFloat(otherFixed) || 0;
  const valVariable = parseFloat(variable) || 0;

  const currentTotalExpenses = valRent + valOtherFixed + valVariable;
  const currentNet = valIncome - currentTotalExpenses;
  const currentRentPct = valIncome > 0 ? (valRent / valIncome) * 100 : 0;

  // SIMULACION
  const valSimRentRaw = parseFloat(simRent) || 0;
  const valSimRentARS = simCurrency === 'USD' ? valSimRentRaw * currentDollarRate : valSimRentRaw;
  
  // Nuevo costo de vida asumiendo que "Other Fixed" y "Variable" se mantienen iguales
  const simTotalExpenses = valSimRentARS + valOtherFixed + valVariable;
  
  // ¿Cuánto debería ganar para que este alquiler sea el X% de mi sueldo?
  // Formula: Rent = Salary * (Pct/100)  =>  Salary = Rent / (Pct/100)
  const requiredSalaryForRent = targetRentPercentage > 0 ? valSimRentARS / (targetRentPercentage / 100) : 0;
  
  // Alternativa: ¿Cuánto necesito ganar para cubrir TODOS los gastos y que me sobre un 20% (regla 50/30/20 simplificada)?
  // CostoVida = 80% del sueldo => Sueldo = CostoVida / 0.8
  const requiredSalaryForLife = simTotalExpenses / 0.8;

  // Fondo de emergencia (6 meses de gastos simulados)
  const requiredEmergencyFund = simTotalExpenses * 6;

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
            <h2 className="text-lg font-bold">Diseñador de Estilo de Vida</h2>
            <p className="text-xs text-slate-500">Configura tu realidad y simula tu futuro</p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 space-y-8 pb-24">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* COLUMNA 1: CONFIGURACIÓN BASE */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                    <span className="size-6 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">1</span>
                    <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-sm">Tu Realidad Actual</h3>
                </div>

                <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1">Tu Sueldo Mensual Neto</label>
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl border border-transparent focus-within:border-primary transition-colors">
                            <span className="text-slate-500">$</span>
                            <input type="number" value={income} onChange={e => setIncome(e.target.value)} className="bg-transparent w-full outline-none font-bold text-lg" placeholder="0" />
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-2"></div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-blue-500 block mb-1">Alquiler / Vivienda</label>
                            <input type="number" value={rent} onChange={e => setRent(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 p-2 rounded-lg outline-none font-bold text-sm" placeholder="0" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 block mb-1">Otros Fijos (Servicios)</label>
                            <input type="number" value={otherFixed} onChange={e => setOtherFixed(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 p-2 rounded-lg outline-none font-bold text-sm" placeholder="0" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-orange-400 block mb-1">Gastos Variables (Comida, Salidas)</label>
                        <input type="number" value={variable} onChange={e => setVariable(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 p-2 rounded-lg outline-none font-bold text-sm" placeholder="0" />
                    </div>

                    <div className="pt-2">
                        <div className="flex justify-between text-sm font-bold bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">
                            <span>Capacidad de Ahorro Actual:</span>
                            <span className={currentNet >= 0 ? 'text-emerald-500' : 'text-red-500'}>{formatMoney(currentNet)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* COLUMNA 2: SIMULADOR */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                    <span className="size-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                    <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-sm">Simular Nuevo Escenario</h3>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-primary/20 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    
                    <div className="space-y-5 relative z-10">
                        <div>
                            <label className="text-xs font-bold text-primary block mb-2">¿Si mi nuevo alquiler fuera...?</label>
                            <div className="flex gap-2">
                                <div className="flex-1 flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                    <span className="font-bold text-slate-400">{simCurrency === 'ARS' ? '$' : 'US$'}</span>
                                    <input 
                                        type="number" 
                                        value={simRent} 
                                        onChange={e => setSimRent(e.target.value)} 
                                        className="bg-transparent w-full outline-none font-black text-xl text-slate-900 dark:text-white" 
                                        placeholder="0" 
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <button onClick={() => setSimCurrency('ARS')} className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-colors ${simCurrency === 'ARS' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>ARS</button>
                                    <button onClick={() => setSimCurrency('USD')} className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-colors ${simCurrency === 'USD' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>USD</button>
                                </div>
                            </div>
                            {simCurrency === 'USD' && (
                                <p className="text-[10px] text-slate-400 mt-1 ml-1">Cotización usada: ${currentDollarRate}</p>
                            )}
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-400 block mb-2">
                                Regla Financiera: El alquiler no debe superar el <span className="text-slate-900 dark:text-white">{targetRentPercentage}%</span> de tu ingreso.
                            </label>
                            <input 
                                type="range" 
                                min="10" max="60" step="5" 
                                value={targetRentPercentage} 
                                onChange={e => setTargetRentPercentage(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                <span>Conservador (10%)</span>
                                <span>Arriesgado (60%)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RESULTADOS DE LA SIMULACION */}
                {valSimRentRaw > 0 && (
                    <div className="space-y-3 animate-[fadeIn_0.3s_ease-out]">
                        
                        {/* SUELDO NECESARIO */}
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-5 rounded-2xl shadow-lg">
                            <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">Sueldo Mínimo Sugerido</p>
                            <h2 className="text-3xl font-black mb-1">{formatMoney(requiredSalaryForRent)}</h2>
                            <p className="text-xs opacity-80 mb-3">Para que este alquiler represente solo el {targetRentPercentage}% de tus ingresos.</p>
                            
                            <div className="bg-black/20 rounded-lg p-2 text-xs flex justify-between items-center">
                                <span>Tu sueldo actual:</span>
                                <span className={valIncome >= requiredSalaryForRent ? 'text-emerald-300 font-bold' : 'text-red-300 font-bold'}>
                                    {formatMoney(valIncome)} ({valIncome >= requiredSalaryForRent ? 'Suficiente' : 'Insuficiente'})
                                </span>
                            </div>
                        </div>

                        {/* COSTO DE VIDA */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-outlined text-orange-500">payments</span>
                                    <p className="text-xs font-bold text-slate-500 uppercase">Nuevo Costo de Vida</p>
                                </div>
                                <p className="text-xl font-black text-slate-900 dark:text-white">{formatMoney(simTotalExpenses)}</p>
                                <p className="text-[10px] text-slate-400 mt-1">Suma de Alquiler Simulado + Otros Fijos + Variables.</p>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-outlined text-emerald-500">shield</span>
                                    <p className="text-xs font-bold text-slate-500 uppercase">Reserva (6 Meses)</p>
                                </div>
                                <p className="text-xl font-black text-slate-900 dark:text-white">{formatMoney(requiredEmergencyFund)}</p>
                                <p className="text-[10px] text-slate-400 mt-1">Fondo de paz mental necesario para este estilo de vida.</p>
                            </div>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                            <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed flex gap-2">
                                <span className="material-symbols-outlined shrink-0">lightbulb</span>
                                <span>
                                    Para llevar este estilo de vida cómodamente, te recomendamos un ingreso de <strong>{formatMoney(requiredSalaryForLife)}</strong> (Regla del 50/30/20) y tener ahorrados al menos <strong>{formatMoney(requiredEmergencyFund)}</strong> antes de mudarte.
                                </span>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};

export default SalaryCalculator;
