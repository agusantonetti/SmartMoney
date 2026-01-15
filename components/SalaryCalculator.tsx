
import React, { useState, useEffect } from 'react';
import { FinancialProfile, Transaction } from '../types';

interface Props {
  profile: FinancialProfile;
  transactions: Transaction[];
  onBack: () => void;
  onUpdateProfile: (profile: FinancialProfile) => void;
}

const SalaryCalculator: React.FC<Props> = ({ profile, transactions, onBack, onUpdateProfile }) => {
  // --- STATE: DATOS BASE (Editables Manualmente) ---
  const [income, setIncome] = useState<string>('');
  const [patrimony, setPatrimony] = useState<string>(''); // NUEVO: Patrimonio editable
  const [rent, setRent] = useState<string>('');
  const [otherFixed, setOtherFixed] = useState<string>('');
  const [variable, setVariable] = useState<string>('');
  
  // --- STATE: SIMULADOR ---
  const [simRent, setSimRent] = useState<string>('');
  const [simExpenses, setSimExpenses] = useState<string>(''); // Expensas (Siempre ARS)
  const [simCurrency, setSimCurrency] = useState<'ARS' | 'USD'>('ARS'); // Solo afecta al alquiler
  const [targetRentPercentage, setTargetRentPercentage] = useState<number>(30); // Regla del 30% por defecto

  // Cargar datos iniciales del perfil (pero permitir edición)
  useEffect(() => {
    const salary = (profile.incomeSources || []).reduce((acc, src) => acc + src.amount, 0) || (profile.monthlySalary || 0);
    const totalFixed = (profile.subscriptions || []).reduce((acc, sub) => acc + sub.amount, 0);
    const currentSavings = profile.initialBalance || 0;
    
    // Calcular variables promedio (último mes)
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const variableCalc = transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(currentMonthKey))
      .reduce((acc, t) => acc + t.amount, 0);

    setIncome(salary.toString());
    setPatrimony(currentSavings.toString()); // Carga inicial
    setRent('0'); 
    setOtherFixed(totalFixed.toString());
    setVariable(variableCalc.toString());
  }, [profile, transactions]);

  // --- CALCULOS ---
  
  const currentDollarRate = profile.customDollarRate || 1130;

  // Valores Numéricos de los Inputs
  const valIncome = parseFloat(income) || 0;
  const valPatrimony = parseFloat(patrimony) || 0; // Usamos el estado local, no el perfil
  const valRent = parseFloat(rent) || 0;
  const valOtherFixed = parseFloat(otherFixed) || 0;
  const valVariable = parseFloat(variable) || 0;

  const currentTotalExpenses = valRent + valOtherFixed + valVariable;
  const currentNet = valIncome - currentTotalExpenses;

  // SIMULACION
  const valSimBaseRentRaw = parseFloat(simRent) || 0;
  const valSimExpensesARS = parseFloat(simExpenses) || 0; // Siempre en pesos
  
  // Convertir Alquiler a ARS si está en USD
  const valSimRentARS = simCurrency === 'USD' ? valSimBaseRentRaw * currentDollarRate : valSimBaseRentRaw;
  
  // Costo Total Vivienda en ARS (Alquiler Convertido + Expensas Pesos)
  const valSimHousingARS = valSimRentARS + valSimExpensesARS;
  
  // Nuevo costo de vida total estimado
  const simTotalExpenses = valSimHousingARS + valOtherFixed + valVariable;
  
  // 1. Sueldo necesario basado en porcentaje de vivienda
  const requiredSalaryForRent = targetRentPercentage > 0 ? valSimHousingARS / (targetRentPercentage / 100) : 0;
  
  // 2. Sueldo necesario para vida cómoda (Regla 50/30/20 simplificada: Costos Fijos+Variables = 80%)
  const requiredSalaryForLife = simTotalExpenses / 0.8;

  // 3. Fondo de emergencia sugerido (6 meses de gastos simulados)
  const requiredEmergencyFund = simTotalExpenses * 6;

  // 4. NUEVO: COBERTURA DE ALQUILER CON PATRIMONIO (Runway)
  // ¿Cuántos meses puedo pagar SOLO el costo de vivienda (Alquiler + Expensas) con mis ahorros?
  const patrimonyHousingCoverageMonths = valSimHousingARS > 0 ? valPatrimony / valSimHousingARS : 0;
  const patrimonyHousingCoverageYears = patrimonyHousingCoverageMonths / 12;

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
            <h2 className="text-lg font-bold">Calculadora de Estilo de Vida</h2>
            <p className="text-xs text-slate-500">Simula costos, sueldos y libertad financiera</p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 space-y-8 pb-32">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* COLUMNA 1: CONFIGURACIÓN MANUAL (4 Columnas) */}
            <div className="lg:col-span-5 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                    <span className="size-6 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">1</span>
                    <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-sm">Datos Manuales</h3>
                </div>

                <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
                    
                    {/* INPUT 1: SUELDO */}
                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Ingreso Mensual Neto</label>
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl border border-transparent focus-within:border-primary transition-colors">
                            <span className="text-slate-500 font-bold">$</span>
                            <input type="number" value={income} onChange={e => setIncome(e.target.value)} className="bg-transparent w-full outline-none font-bold text-lg" placeholder="0" />
                        </div>
                    </div>

                    {/* INPUT 2: PATRIMONIO (Nuevo) */}
                    <div>
                        <label className="text-[10px] uppercase font-bold text-emerald-500 block mb-1">Ahorros / Patrimonio Total</label>
                        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800 focus-within:border-emerald-500 transition-colors">
                            <span className="text-emerald-500 font-bold">$</span>
                            <input type="number" value={patrimony} onChange={e => setPatrimony(e.target.value)} className="bg-transparent w-full outline-none font-bold text-lg text-emerald-700 dark:text-emerald-400" placeholder="0" />
                        </div>
                        <p className="text-[9px] text-slate-400 mt-1">Usado para calcular cobertura de alquiler.</p>
                    </div>

                    <div className="h-px bg-slate-100 dark:bg-slate-700"></div>
                    
                    {/* GASTOS ACTUALES */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Gastos Fijos</label>
                            <input type="number" value={otherFixed} onChange={e => setOtherFixed(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 p-2 rounded-lg outline-none font-bold text-sm" placeholder="0" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Gastos Variables</label>
                            <input type="number" value={variable} onChange={e => setVariable(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 p-2 rounded-lg outline-none font-bold text-sm" placeholder="0" />
                        </div>
                    </div>

                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">Capacidad Ahorro Actual</span>
                        <span className={`font-black ${currentNet >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{formatMoney(currentNet)}</span>
                    </div>
                </div>
            </div>

            {/* COLUMNA 2: SIMULADOR Y RESULTADOS (7 Columnas) */}
            <div className="lg:col-span-7 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                    <span className="size-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                    <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-sm">Escenario de Vivienda</h3>
                </div>

                {/* TARJETA DE INPUTS DE SIMULACIÓN */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-primary/20 shadow-lg relative overflow-visible">
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                        {/* Input Alquiler */}
                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="text-xs font-bold text-primary block">Alquiler</label>
                                <div className="flex bg-slate-100 dark:bg-slate-700 p-0.5 rounded-md scale-90 origin-right">
                                    <button onClick={() => setSimCurrency('ARS')} className={`px-2 py-0.5 rounded text-[10px] font-bold ${simCurrency === 'ARS' ? 'bg-white text-black shadow' : 'text-slate-500'}`}>ARS</button>
                                    <button onClick={() => setSimCurrency('USD')} className={`px-2 py-0.5 rounded text-[10px] font-bold ${simCurrency === 'USD' ? 'bg-emerald-500 text-white shadow' : 'text-slate-500'}`}>USD</button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 focus-within:border-primary transition-all">
                                <span className="font-bold text-slate-400">{simCurrency === 'ARS' ? '$' : 'US$'}</span>
                                <input 
                                    type="number" 
                                    value={simRent} 
                                    onChange={e => setSimRent(e.target.value)} 
                                    className="bg-transparent w-full outline-none font-black text-xl text-slate-900 dark:text-white" 
                                    placeholder="0" 
                                />
                            </div>
                            {simCurrency === 'USD' && <p className="text-[9px] text-slate-400 text-right mt-1">Dólar: ${currentDollarRate}</p>}
                        </div>

                        {/* Input Expensas */}
                        <div>
                             <label className="text-xs font-bold text-slate-400 block mb-1">Expensas (Opcional)</label>
                             <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 focus-within:border-primary transition-all h-[54px]">
                                <span className="font-bold text-slate-400">$</span>
                                <input 
                                    type="number" 
                                    value={simExpenses} 
                                    onChange={e => setSimExpenses(e.target.value)} 
                                    className="bg-transparent w-full outline-none font-bold text-lg text-slate-900 dark:text-white" 
                                    placeholder="0" 
                                />
                             </div>
                             <p className="text-[9px] text-slate-400 text-right mt-1">Siempre en Pesos</p>
                        </div>
                    </div>

                    {/* Slider */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                        <label className="text-[10px] font-bold text-slate-400 block mb-2 flex justify-between">
                            <span>Regla de Presupuesto (Vivienda máx %)</span>
                            <span className="text-slate-900 dark:text-white">{targetRentPercentage}%</span>
                        </label>
                        <input 
                            type="range" 
                            min="10" max="60" step="5" 
                            value={targetRentPercentage} 
                            onChange={e => setTargetRentPercentage(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>
                </div>

                {/* --- RESULTADOS --- */}
                {valSimHousingARS > 0 && (
                    <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
                        
                        {/* 1. TARJETA SUELDO REQUERIDO */}
                        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-5 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-1">Sueldo Mínimo Sugerido</p>
                                <h2 className="text-3xl font-black">{formatMoney(requiredSalaryForRent)}</h2>
                                <p className="text-xs opacity-80">Para cubrir alquiler + expensas con el {targetRentPercentage}%.</p>
                            </div>
                            <div className="text-right bg-white/10 p-3 rounded-xl min-w-[140px]">
                                <p className="text-[10px] font-bold uppercase mb-1">Tu Sueldo Actual</p>
                                <p className={`text-lg font-bold ${valIncome >= requiredSalaryForRent ? 'text-emerald-300' : 'text-red-300'}`}>
                                    {formatMoney(valIncome)}
                                </p>
                                <p className="text-[9px] opacity-70">
                                    {valIncome >= requiredSalaryForRent ? '✅ Cubierto' : '⚠️ Insuficiente'}
                                </p>
                            </div>
                        </div>

                        {/* 2. TARJETA COBERTURA PATRIMONIAL (LA QUE PEDISTE) */}
                        <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-5 rounded-2xl shadow-md border border-slate-700 dark:border-slate-200 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/30 transition-colors"></div>
                            
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="size-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                                        <span className="material-symbols-outlined text-lg">savings</span>
                                    </div>
                                    <p className="text-xs font-bold uppercase tracking-widest opacity-70">Cobertura con Ahorros</p>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row sm:items-end gap-1 sm:gap-4 mb-2">
                                    <h2 className="text-4xl font-black leading-none">{patrimonyHousingCoverageMonths.toFixed(1)}</h2>
                                    <span className="text-xl font-bold opacity-80 mb-1">Meses</span>
                                    <span className="text-sm opacity-50 mb-1.5 ml-auto hidden sm:block">({patrimonyHousingCoverageYears.toFixed(1)} Años)</span>
                                </div>
                                
                                <p className="text-sm opacity-80 leading-snug max-w-md">
                                    Podrías pagar este costo de vivienda (<strong>{formatMoney(valSimHousingARS)}</strong>) exclusivamente usando tus ahorros actuales de <strong>{formatMoney(valPatrimony)}</strong>.
                                </p>
                            </div>
                        </div>

                        {/* 3. DATOS ADICIONALES */}
                        <div className="grid grid-cols-2 gap-3">
                             <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Costo Total Mensual</p>
                                <p className="text-lg font-black text-slate-900 dark:text-white">{formatMoney(simTotalExpenses)}</p>
                                <p className="text-[9px] text-slate-400">Vivienda + Gastos Fijos + Var.</p>
                             </div>
                             <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Reserva 6 Meses</p>
                                <p className="text-lg font-black text-slate-900 dark:text-white">{formatMoney(requiredEmergencyFund)}</p>
                                <p className="text-[9px] text-slate-400">Fondo de Paz Mental</p>
                             </div>
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
