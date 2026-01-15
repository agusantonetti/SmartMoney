import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FinancialMetrics, Transaction, FinancialProfile } from '../types';

interface Props {
  metrics: FinancialMetrics;
  transactions: Transaction[];
  profile: FinancialProfile; 
  onOpenProfile: () => void;
  onOpenIncomeManager: () => void;
  onOpenSavingsBuckets: () => void;
  onOpenSubscriptions: () => void;
  onOpenDebts: () => void;
  onOpenAnalytics: () => void;
  onOpenBudget: () => void;
  onOpenEvents: () => void; 
  onOpenFuture: () => void;
  onOpenBudgetAdjust?: () => void; 
  onOpenSalaryCalculator?: () => void;
  onOpenCurrencyConverter?: () => void; // NUEVO
  onAddTransaction: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  privacyMode?: boolean;
  onTogglePrivacy?: () => void;
  onUpdateProfile?: (profile: FinancialProfile) => void;
}

const Dashboard: React.FC<Props> = ({ 
  metrics, 
  transactions, 
  profile,
  onOpenProfile, 
  onOpenIncomeManager, 
  onOpenSavingsBuckets, 
  onOpenSubscriptions, 
  onOpenDebts,
  onOpenAnalytics,
  onOpenBudget,
  onOpenEvents,
  onOpenFuture,
  onOpenBudgetAdjust,
  onOpenSalaryCalculator,
  onOpenCurrencyConverter,
  onAddTransaction, 
  isDarkMode, 
  onToggleTheme,
  privacyMode,
  onTogglePrivacy
}) => {
  const [isBudgetMenuOpen, setIsBudgetMenuOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false); 
  const menuRef = useRef<HTMLDivElement>(null);
  const isEmpty = transactions.length === 0;

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsBudgetMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Formateador seguro
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const defaultAvatar = "https://lh3.googleusercontent.com/aida-public/AB6AXuD3W_-QV28bpv6tswBdb3gVXfvQ9Sd1qa2FIGrEXSr2QQhwgjBocZveQ_iZ7J4KEKay2_eW-X1e_D_YgmIkcA8CzxI9m9DrfSKITYEyZh1QbS_cU-ikAMnjc7jppiRpUtx2MU_e_8F4iEoxnnZDfqR5h0oOSuSVTm6ylZNFaJtmmBRyWTnZFGJLM0cmMDBGgzzyJBlAtbXeWNN-cYcN-zQt3qUI1cKXVPswGJB4Tmr449006R1-PDELmsW7e06pa1WY4URePcx_rEcX";

  // --- CÁLCULOS COMPARATIVOS (MES ACTUAL vs ANTERIOR) ---
  const stats = useMemo(() => {
      const now = new Date();
      const currentMonthKey = now.toISOString().slice(0, 7); // YYYY-MM
      
      // Calcular clave mes anterior
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthKey = prevDate.toISOString().slice(0, 7);

      // 1. Ingresos Variables (Transacciones tipo income)
      // Nota: metrics.salaryPaid es lo fijo. Aquí comparamos lo variable/registrado.
      const currentIncome = transactions
        .filter(t => t.type === 'income' && t.date.startsWith(currentMonthKey))
        .reduce((acc, t) => acc + t.amount, 0);
      
      const prevIncome = transactions
        .filter(t => t.type === 'income' && t.date.startsWith(prevMonthKey))
        .reduce((acc, t) => acc + t.amount, 0);

      // 2. Gastos Variables
      const currentVariableExpenses = transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(currentMonthKey))
        .reduce((acc, t) => acc + t.amount, 0);

      const prevVariableExpenses = transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(prevMonthKey))
        .reduce((acc, t) => acc + t.amount, 0);

      const totalMonthlyOutflow = metrics.fixedExpenses + currentVariableExpenses;
      
      // Asumimos gastos fijos constantes para la comparación simple, o solo comparamos variable
      const prevTotalOutflow = metrics.fixedExpenses + prevVariableExpenses;

      const incomeTrend = prevIncome > 0 ? ((currentIncome - prevIncome) / prevIncome) * 100 : 0;
      const expenseTrend = prevTotalOutflow > 0 ? ((totalMonthlyOutflow - prevTotalOutflow) / prevTotalOutflow) * 100 : 0;

      return {
          currentVariableExpenses,
          totalMonthlyOutflow,
          prevTotalOutflow,
          currentIncome,
          prevIncome,
          incomeTrend,
          expenseTrend
      };
  }, [transactions, metrics.fixedExpenses]);

  // Contar eventos activos para mostrar en el badge
  const activeEventsCount = profile.events?.filter(e => e.status === 'active').length || 0;

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col overflow-x-hidden transition-colors duration-300">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full bg-surface-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
        <div className="px-4 md:px-8 py-3 flex items-center justify-between max-w-[1440px] mx-auto w-full">
          <div className="flex items-center gap-4">
            <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </div>
            <h2 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight hidden md:block">Smart Money</h2>
          </div>
          <div className="flex items-center gap-3">
            
            {/* Privacy Toggle */}
            <button 
              onClick={onTogglePrivacy}
              className="size-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
              title={privacyMode ? "Mostrar datos" : "Ocultar datos"}
            >
              <span className="material-symbols-outlined text-[22px]">
                {privacyMode ? 'visibility_off' : 'visibility'}
              </span>
            </button>

            {/* Dark Mode Toggle */}
            <button 
              onClick={onToggleTheme}
              className="size-10 rounded-full flex items-center justify-center text-slate-500 dark:text-yellow-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
              aria-label="Toggle Dark Mode"
            >
              <span className={`material-symbols-outlined text-[22px] transition-transform duration-500 ${isDarkMode ? 'rotate-[360deg] filled' : 'rotate-0'}`}>
                {isDarkMode ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            {/* Menú Desplegable: Mi Presupuesto (SOLO DESKTOP) */}
            <div className="relative hidden sm:block" ref={menuRef}>
              <button 
                onClick={() => setIsBudgetMenuOpen(!isBudgetMenuOpen)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 transition-all ${
                  isBudgetMenuOpen 
                  ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span className="text-xs font-semibold uppercase tracking-wider">Mi Presupuesto</span>
                <span className={`material-symbols-outlined text-sm transition-transform duration-200 ${isBudgetMenuOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </button>

              {/* Dropdown Content */}
              {isBudgetMenuOpen && (
                <div className="absolute top-full mt-2 right-0 w-60 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                  <div className="p-2 grid gap-1">
                    <button onClick={() => { setIsBudgetMenuOpen(false); onOpenIncomeManager(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl text-left transition-colors">
                      <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">payments</span></div>
                      <div><p className="text-sm font-bold text-slate-800 dark:text-white">Ingresos</p><p className="text-[10px] text-slate-400">Gestionar sueldos</p></div>
                    </button>
                    <button onClick={() => { setIsBudgetMenuOpen(false); onOpenSubscriptions(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl text-left transition-colors">
                      <div className="size-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">home_work</span></div>
                      <div><p className="text-sm font-bold text-slate-800 dark:text-white">Gastos Fijos</p><p className="text-[10px] text-slate-400">Alquiler y Servicios</p></div>
                    </button>
                    <button onClick={() => { setIsBudgetMenuOpen(false); onOpenSavingsBuckets(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl text-left transition-colors">
                      <div className="size-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">savings</span></div>
                      <div><p className="text-sm font-bold text-slate-800 dark:text-white">Apartados</p><p className="text-[10px] text-slate-400">Metas de ahorro</p></div>
                    </button>
                    <button onClick={() => { setIsBudgetMenuOpen(false); onOpenBudget(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl text-left transition-colors">
                      <div className="size-8 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">tune</span></div>
                      <div><p className="text-sm font-bold text-slate-800 dark:text-white">Límites</p><p className="text-[10px] text-slate-400">Control mensual</p></div>
                    </button>
                    <button onClick={() => { setIsBudgetMenuOpen(false); onOpenDebts(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl text-left transition-colors">
                      <div className="size-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">gavel</span></div>
                      <div><p className="text-sm font-bold text-slate-800 dark:text-white">Deudas</p><p className="text-[10px] text-slate-400">Impuestos y créditos</p></div>
                    </button>
                    
                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                    
                    <button onClick={() => { setIsBudgetMenuOpen(false); if(onOpenSalaryCalculator) onOpenSalaryCalculator(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl text-left transition-colors">
                      <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">calculate</span></div>
                      <div><p className="text-sm font-bold text-slate-800 dark:text-white">Costo de Vida</p><p className="text-[10px] text-slate-400">Análisis Real</p></div>
                    </button>
                    <button onClick={() => { setIsBudgetMenuOpen(false); onOpenFuture(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl text-left transition-colors">
                      <div className="size-8 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">crystal_ball</span></div>
                      <div><p className="text-sm font-bold text-slate-800 dark:text-white">Simulador</p><p className="text-[10px] text-slate-400">Futuro</p></div>
                    </button>
                    
                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                    <button onClick={() => { setIsBudgetMenuOpen(false); onOpenAnalytics(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl text-left transition-colors group">
                      <div className="size-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors"><span className="material-symbols-outlined text-[18px]">bar_chart</span></div>
                      <span className="text-sm font-bold text-slate-800 dark:text-white">Ver Analíticas</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Botón Perfil */}
            <button 
              onClick={onOpenProfile}
              className="bg-slate-200 dark:bg-slate-700 rounded-full size-10 flex items-center justify-center border-2 border-white dark:border-slate-600 overflow-hidden hover:opacity-80 transition-opacity"
              title={profile.name || "Mi Perfil"}
            >
               <img 
                 src={profile.avatar || defaultAvatar} 
                 alt="Profile" 
                 className="w-full h-full object-cover"
               />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 flex justify-center py-6 px-4 md:px-8 pb-24">
        <div className="w-full max-w-[1440px] flex flex-col gap-8">
          
          {/* Header de Bienvenida */}
          <div className="flex flex-col">
             <h1 className="text-xl font-medium text-slate-500 dark:text-slate-400 tracking-tight">
                Hola, <span className="text-slate-900 dark:text-white font-bold">{profile.name ? profile.name.split(' ')[0] : 'Viajero'}</span> 👋
             </h1>
          </div>

          {/* 1. SECCIÓN PRINCIPAL: BALANCE Y OPERATIVA (Agrupada) */}
          <section className="flex flex-col gap-4">
              {/* BALANCE HERO */}
              <div 
                className="w-full bg-gradient-to-r from-slate-900 to-slate-800 dark:from-blue-900 dark:to-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl shadow-slate-200 dark:shadow-none relative overflow-hidden group"
                title={`Valor exacto: $${metrics.balance}`}
              >
                 {/* Decorative Background Elements */}
                 <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-white/10 transition-colors duration-500"></div>
                 <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>

                 <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                       <div className="flex items-center gap-2 mb-2 opacity-80">
                          <span className="material-symbols-outlined text-sm">account_balance</span>
                          <p className="text-sm font-bold uppercase tracking-widest">Balance Total</p>
                       </div>
                       <h1 className={`text-5xl md:text-7xl font-black tracking-tight mb-2 transition-all duration-300 ${privacyMode ? 'blur-md select-none opacity-50' : ''}`}>
                          {formatMoney(metrics.balance)}
                       </h1>
                       <p className="text-sm md:text-base text-slate-300 font-medium flex items-center gap-1">
                          Disponible Real: <span className={`text-white font-bold transition-all duration-300 ${privacyMode ? 'blur-sm select-none' : ''}`}>{formatMoney(metrics.balance - metrics.totalReserved)}</span>
                       </p>
                    </div>
                    
                    <button 
                      onClick={onOpenBudgetAdjust}
                      className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-full font-bold text-sm transition-all flex items-center gap-2"
                    >
                       <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                       Mover Dinero
                    </button>
                 </div>
              </div>

              {/* GRID OPERATIVO (4 Columnas) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Ingresos (Comparar Ingresos Totales de mes actual vs anterior) */}
                <MetricCard 
                  label="Ingresos" 
                  amount={formatMoney(metrics.salaryPaid + stats.currentIncome)} // Base Salarial + Variables del mes
                  color="blue" 
                  icon="payments" 
                  onClick={onOpenIncomeManager}
                  helperText="Gestionar Sueldos"
                  isBlurred={privacyMode}
                  trend={stats.incomeTrend}
                  trendPositiveIsGood={true}
                  prevAmount={`Ant: ${formatMoney(metrics.salaryPaid + stats.prevIncome)}`} // Estimado
                />

                {/* Gastos Mes */}
                <MetricCard 
                  label="Gastos Mes" 
                  amount={formatMoney(stats.totalMonthlyOutflow)} 
                  color="indigo" 
                  icon="calendar_today" 
                  onClick={onOpenBudget}
                  helperText="Ver Límites"
                  isBlurred={privacyMode}
                  trend={stats.expenseTrend}
                  trendPositiveIsGood={false}
                  prevAmount={`Ant: ${formatMoney(stats.prevTotalOutflow)}`}
                />

                {/* Gastos Fijos (Solo mostramos monto, sin tendencia compleja calculada aquí, o 0) */}
                <MetricCard 
                  label="Fijos" 
                  amount={formatMoney(metrics.fixedExpenses)} 
                  color="indigo" 
                  icon="home_work" 
                  onClick={onOpenSubscriptions}
                  helperText="Alquiler y Servicios"
                  isBlurred={privacyMode}
                />

                {/* Botón Acción Principal: NUEVO */}
                <button 
                    onClick={onAddTransaction}
                    className="col-span-1 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-4 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-1 active:scale-95 transition-all flex flex-col justify-between group h-full min-h-[140px]"
                >
                    <div className="flex justify-between items-start w-full">
                        <div className="bg-white/20 rounded-full p-2">
                            <span className="material-symbols-outlined text-2xl">add</span>
                        </div>
                        <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
                    </div>
                    <div className="text-left">
                        <p className="font-bold text-lg leading-tight">Nuevo<br/>Movimiento</p>
                        <p className="text-[10px] opacity-80 mt-1">Registrar Gasto o Ingreso</p>
                    </div>
                </button>
              </div>
          </section>

          {/* 2. HERRAMIENTAS (Colapsable/Acordeón) */}
          <div className="w-full">
             <button 
                onClick={() => setIsToolsOpen(!isToolsOpen)}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group"
             >
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 group-hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">construction</span>
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Herramientas Avanzadas</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Simuladores, Calculadoras y Analíticas</p>
                    </div>
                </div>
                <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isToolsOpen ? 'rotate-180' : ''}`}>expand_more</span>
             </button>
             
             {isToolsOpen && (
                 <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-[fadeIn_0.3s_ease-out]">
                    <ToolCard 
                        label="Conversor Divisas" 
                        icon="currency_exchange" 
                        onClick={onOpenCurrencyConverter} 
                        gradient="from-yellow-400 to-orange-500"
                        desc="Calcula cambios a Dólar, Euro y más." 
                    />
                    <ToolCard 
                        label="Costo de Vida" 
                        icon="price_check" 
                        onClick={onOpenSalaryCalculator} 
                        gradient="from-emerald-400 to-teal-600"
                        desc="¿Cuánto vale tu tiempo? Calcula el impacto real." 
                    />
                    <ToolCard 
                        label="Simulador Futuro" 
                        icon="timeline" 
                        onClick={onOpenFuture} 
                        gradient="from-violet-500 to-fuchsia-600"
                        desc="Predice tu saldo a fin de mes según tus hábitos." 
                    />
                    <ToolCard 
                        label="Gestor de Deudas" 
                        icon="credit_score" 
                        onClick={onOpenDebts} 
                        gradient="from-rose-500 to-orange-500"
                        desc="Organiza tus pendientes y elimina intereses." 
                    />
                 </div>
             )}
          </div>

          {/* 3. PATRIMONIO Y SALUD (Metas + Métricas Globales) */}
          <section className="flex flex-col gap-4">
             <div className="flex items-center gap-2 px-1">
                <span className="material-symbols-outlined text-slate-400 text-sm">monitor_heart</span>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider opacity-80">
                    Estado General
                </h3>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* Left Column: Assets */}
                 <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Apartados */}
                    <MetricCard 
                      label="Apartados" 
                      amount={formatMoney(metrics.totalReserved)} 
                      color="purple" 
                      icon="savings" 
                      onClick={onOpenSavingsBuckets}
                      helperText="Dinero Reservado"
                      isBlurred={privacyMode}
                    />

                    {/* Mis Viajes */}
                    <MetricCard 
                      label="Mis Viajes" 
                      amount={activeEventsCount > 0 ? `${activeEventsCount} Activos` : 'Planificar'} 
                      color="pink" 
                      icon="flight_takeoff" 
                      onClick={onOpenEvents}
                      helperText="Presupuestos Especiales"
                    />

                    {/* Health Score Card (Span full width of this sub-grid on mobile, or just another tile) */}
                    <div className="sm:col-span-2 bg-surface-light dark:bg-surface-dark rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden flex items-center justify-between">
                       <div>
                          <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Health Score</h3>
                          <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-end gap-2">
                            {metrics.healthScore}
                            <span className="text-sm font-medium text-slate-400 mb-1 pb-1">/100</span>
                          </h2>
                       </div>
                       <div className={`p-3 rounded-full ${metrics.healthScore > 70 ? 'bg-emerald-100 text-emerald-600' : metrics.healthScore > 40 ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
                          <span className="material-symbols-outlined text-2xl">
                            {metrics.healthScore > 70 ? 'ecg_heart' : metrics.healthScore > 40 ? 'monitor_heart' : 'heart_broken'}
                          </span>
                       </div>
                       {/* Progress Bar Background */}
                       <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100 dark:bg-slate-700">
                           <div 
                              className={`h-full transition-all duration-1000 ease-out ${metrics.healthScore > 70 ? 'bg-emerald-500' : metrics.healthScore > 40 ? 'bg-yellow-400' : 'bg-red-500'}`} 
                              style={{ width: `${metrics.healthScore}%` }}
                           ></div>
                       </div>
                    </div>
                 </div>

                 {/* Right Column: Runway (Vertical Card) */}
                 <div className="bg-primary text-white rounded-3xl p-6 shadow-lg shadow-primary/20 relative overflow-hidden flex flex-col justify-center items-center text-center">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% -20%, white 0%, transparent 20%)' }}></div>
                    <h3 className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-2 z-10">Vida Útil (Runway)</h3>
                    <span className="text-5xl font-black z-10">{metrics.runway}</span>
                    <span className="text-sm font-medium text-blue-100 z-10">Meses de libertad</span>
                    <p className="text-[10px] text-blue-200 mt-2 z-10 opacity-80">Saldo disponible / Gastos promedio.</p>
                 </div>
             </div>
          </section>

          {/* 4. LISTA TRANSACCIONES */}
          <div className="flex flex-col lg:flex-row gap-6">
            <main className="flex-1 flex flex-col gap-6 min-w-0">
               <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm transition-colors duration-300">
                  <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                     <h3 className="font-bold text-slate-900 dark:text-white">Movimientos Recientes</h3>
                     <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-md font-medium">Historial</span>
                  </div>
                  
                  {isEmpty ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                       <div className="size-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                          <span className="material-symbols-outlined text-slate-400 text-3xl">savings</span>
                       </div>
                       <h4 className="text-slate-900 dark:text-white font-bold mb-1">Sin movimientos aún</h4>
                       <p className="text-slate-500 text-sm max-w-xs mx-auto">Comienza añadiendo tus ingresos y gastos.</p>
                       <button onClick={onAddTransaction} className="mt-4 text-primary font-bold text-sm hover:underline">
                          + Agregar primer movimiento
                       </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {transactions.map((tx, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors items-center">
                           <div className="col-span-2 sm:col-span-1 flex justify-center">
                              <div className={`size-10 rounded-full flex items-center justify-center ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                                 <span className="material-symbols-outlined text-[20px]">{tx.type === 'income' ? 'arrow_upward' : 'arrow_downward'}</span>
                              </div>
                           </div>
                           <div className="col-span-6 sm:col-span-7 flex flex-col">
                              <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{tx.description}</span>
                              <div className="flex gap-2 items-center flex-wrap">
                                <span className="text-xs text-slate-500">{tx.date}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium uppercase tracking-wide">{tx.category}</span>
                                {tx.eventName && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 font-bold flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[10px]">flight</span>
                                        {tx.eventName}
                                    </span>
                                )}
                              </div>
                           </div>
                           <div className="col-span-4 sm:col-span-4 text-right">
                              <span className={`font-bold text-sm ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'} ${privacyMode ? 'blur-sm select-none' : ''}`}>
                                 {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount)}
                              </span>
                              {/* Show original currency if different */}
                              {tx.originalCurrency && tx.originalCurrency !== 'ARS' && (
                                <span className="block text-[10px] text-slate-400">
                                  {tx.originalAmount} {tx.originalCurrency}
                                </span>
                              )}
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
               </div>
            </main>

            <aside className="hidden lg:flex w-80 flex-col gap-6 shrink-0">
               <div className="sticky top-24 bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors duration-300">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Dinero Disponible</h3>
                  <div className="space-y-4">
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Saldo Libre</span>
                        <span className={`font-bold text-emerald-500 ${privacyMode ? 'blur-sm select-none' : ''}`}>
                           {formatMoney(metrics.balance - metrics.totalReserved)}
                        </span>
                     </div>
                     <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full" style={{ width: `${Math.max(0, ((metrics.balance - metrics.totalReserved) / (metrics.balance || 1)) * 100)}%` }}></div>
                     </div>
                     <p className="text-xs text-slate-400 leading-relaxed">
                        Este es tu dinero después de restar todos tus apartados activos.
                     </p>
                  </div>
               </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

const ToolCard: React.FC<{ 
  label: string; 
  icon: string; 
  desc: string;
  gradient: string;
  onClick?: () => void;
}> = ({ label, icon, desc, gradient, onClick }) => {
    return (
        <button 
            onClick={onClick}
            className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-[1.5rem] p-5 text-left border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group h-full flex flex-col items-start"
        >
            {/* Gradient Background Effect on Hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
            
            {/* Icon Container */}
            <div className={`relative mb-4`}>
                <div className={`size-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-300`}>
                    <span className="material-symbols-outlined text-[24px]">{icon}</span>
                </div>
                {/* Decorative Blur behind icon */}
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} blur-xl opacity-40 -z-10 scale-150`}></div>
            </div>
            
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-2 leading-tight group-hover:text-primary transition-colors">{label}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium mb-4 flex-1">{desc}</p>
            
            <div className="w-full flex items-center justify-between mt-auto pt-2 border-t border-slate-100 dark:border-slate-700/50">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">Abrir Herramienta</span>
               <div className="size-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
               </div>
            </div>
        </button>
    );
}

const MetricCard: React.FC<{ 
  label: string; 
  amount: string; 
  color: string; 
  icon: string; 
  onClick?: () => void;
  helperText?: string;
  isBlurred?: boolean;
  trend?: number; // % change
  trendPositiveIsGood?: boolean;
  prevAmount?: string;
}> = ({ label, amount, color, icon, onClick, helperText, isBlurred, trend, trendPositiveIsGood, prevAmount }) => {
  const colorStyles: {[key: string]: string} = {
     emerald: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400',
     red: 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400',
     blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400',
     purple: 'text-purple-600 bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400',
     indigo: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400',
     orange: 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400',
     pink: 'text-pink-600 bg-pink-100 dark:bg-pink-900/20 dark:text-pink-400',
  };

  // Determine trend color
  let trendColor = 'text-slate-400';
  let trendIcon = 'remove';
  if (trend !== undefined && Math.abs(trend) > 0) {
      if (trend > 0) {
          trendIcon = 'trending_up';
          trendColor = trendPositiveIsGood ? 'text-emerald-500' : 'text-red-500';
      } else {
          trendIcon = 'trending_down';
          trendColor = trendPositiveIsGood ? 'text-red-500' : 'text-emerald-500';
      }
  }

  return (
     <button 
        onClick={onClick}
        className="text-left bg-surface-light dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-md active:scale-95 cursor-pointer group w-full min-h-[140px] relative overflow-hidden"
     >
        {/* Hover Details Overlay */}
        <div className="absolute inset-0 bg-white/90 dark:bg-slate-800/95 backdrop-blur-sm z-10 flex flex-col justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-center p-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-lg font-black text-slate-900 dark:text-white mb-2 ${isBlurred ? 'blur-sm select-none' : ''}`}>{amount}</p>
            {trend !== undefined && (
                <div className={`flex items-center gap-1 text-xs font-bold ${trendColor} bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-full`}>
                    <span className="material-symbols-outlined text-[14px]">{trendIcon}</span>
                    <span>{Math.abs(trend).toFixed(1)}%</span>
                </div>
            )}
            {prevAmount && <p className="text-[10px] text-slate-400 mt-2">{prevAmount}</p>}
        </div>

        <div className="flex items-center justify-between w-full mb-4">
           <div className={`size-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${colorStyles[color] || colorStyles.blue}`}>
              <span className="material-symbols-outlined text-[20px]">{icon}</span>
           </div>
           {/* Mini Trend Indicator (Always Visible) */}
           {trend !== undefined && Math.abs(trend) > 1 && (
               <div className={`flex items-center text-[10px] font-bold ${trendColor}`}>
                   <span className="material-symbols-outlined text-[14px]">{trendIcon}</span>
                   {Math.abs(trend).toFixed(0)}%
               </div>
           )}
        </div>
        
        <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">{label}</span>
            <p className={`text-xl font-bold truncate text-slate-900 dark:text-white leading-tight ${isBlurred ? 'blur-sm select-none' : ''}`}>{amount}</p>
            {helperText && <p className="text-[10px] text-slate-400 mt-1">{helperText}</p>}
        </div>
     </button>
  );
}

export default Dashboard;