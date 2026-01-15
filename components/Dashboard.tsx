
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
  onOpenCurrencyConverter?: () => void;
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

  // Formateador seguro ARS
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Formateador seguro USD
  const formatMoneyUSD = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const defaultAvatar = "https://lh3.googleusercontent.com/aida-public/AB6AXuD3W_-QV28bpv6tswBdb3gVXfvQ9Sd1qa2FIGrEXSr2QQhwgjBocZveQ_iZ7J4KEKay2_eW-X1e_D_YgmIkcA8CzxI9m9DrfSKITYEyZh1QbS_cU-ikAMnjc7jppiRpUtx2MU_e_8F4iEoxnnZDfqR5h0oOSuSVTm6ylZNFaJtmmBRyWTnZFGJLM0cmMDBGgzzyJBlAtbXeWNN-cYcN-zQt3qUI1cKXVPswGJB4Tmr449006R1-PDELmsW7e06pa1WY4URePcx_rEcX";

  // --- CÁLCULOS COMPARATIVOS (MES ACTUAL vs ANTERIOR) ---
  const stats = useMemo(() => {
      const now = new Date();
      const currentMonthKey = now.toISOString().slice(0, 7); // YYYY-MM
      
      const currentIncome = transactions
        .filter(t => t.type === 'income' && t.date.startsWith(currentMonthKey))
        .reduce((acc, t) => acc + t.amount, 0);
      
      // Gastos Variables
      const currentVariableExpenses = transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(currentMonthKey))
        .reduce((acc, t) => acc + t.amount, 0);

      const totalMonthlyOutflow = metrics.fixedExpenses + currentVariableExpenses;
      const totalMonthlyIncome = metrics.salaryPaid + currentIncome;

      return {
          currentVariableExpenses,
          totalMonthlyOutflow,
          totalMonthlyIncome,
          currentIncome
      };
  }, [transactions, metrics.fixedExpenses, metrics.salaryPaid]);

  const activeEventsCount = profile.events?.filter(e => e.status === 'active').length || 0;

  // Lógica de Niveles Patrimoniales (Wealth Tiers)
  const getWealthLevel = (balance: number) => {
      if (balance >= 50000000) return { label: 'Magnate', icon: 'diamond', color: 'text-cyan-300' };
      if (balance >= 10000000) return { label: 'Inversionista', icon: 'auto_graph', color: 'text-purple-300' };
      if (balance >= 1000000) return { label: 'Constructor', icon: 'foundation', color: 'text-emerald-300' };
      if (balance >= 100000) return { label: 'Ahorrador', icon: 'savings', color: 'text-blue-300' };
      return { label: 'Iniciando', icon: 'flag', color: 'text-slate-300' };
  };

  const wealthLevel = getWealthLevel(metrics.balance);
  const dollarRate = profile.customDollarRate || 1130; // Cotización por defecto si no hay
  const balanceUSD = metrics.balance / dollarRate;

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
                <span className="text-xs font-semibold uppercase tracking-wider">Menú Rápido</span>
                <span className={`material-symbols-outlined text-sm transition-transform duration-200 ${isBudgetMenuOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </button>

              {/* Dropdown Content */}
              {isBudgetMenuOpen && (
                <div className="absolute top-full mt-2 right-0 w-60 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-[fadeIn_0.2s_ease-out] z-50">
                  <div className="p-2 grid gap-1">
                    <button onClick={() => { setIsBudgetMenuOpen(false); onOpenIncomeManager(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl text-left transition-colors">
                      <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">payments</span></div>
                      <div><p className="text-sm font-bold text-slate-800 dark:text-white">Ingresos</p></div>
                    </button>
                    <button onClick={() => { setIsBudgetMenuOpen(false); onOpenSubscriptions(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl text-left transition-colors">
                      <div className="size-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">home_work</span></div>
                      <div><p className="text-sm font-bold text-slate-800 dark:text-white">Gastos Fijos</p></div>
                    </button>
                    <button onClick={() => { setIsBudgetMenuOpen(false); onOpenBudget(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl text-left transition-colors">
                      <div className="size-8 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">tune</span></div>
                      <div><p className="text-sm font-bold text-slate-800 dark:text-white">Límites</p></div>
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
        <div className="w-full max-w-[1440px] flex flex-col gap-6">
          
          {/* Header de Bienvenida */}
          <div className="flex flex-col">
             <h1 className="text-xl font-medium text-slate-500 dark:text-slate-400 tracking-tight">
                Hola, <span className="text-slate-900 dark:text-white font-bold">{profile.name ? profile.name.split(' ')[0] : 'Viajero'}</span> 👋
             </h1>
          </div>

          {/* 1. SECCIÓN HERO: BALANCE Y MÉTRICAS PRINCIPALES */}
          <section className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-blue-950 dark:via-slate-900 dark:to-slate-950 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl shadow-slate-300 dark:shadow-none relative overflow-hidden group">
               {/* Decorative Background Elements */}
               <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-white/10 transition-colors duration-700"></div>
               <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>

               <div className="relative z-10 flex flex-col gap-8">
                  {/* Fila Superior: Balance */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                      <div>
                          <div className="flex items-center gap-2 mb-3 opacity-80">
                              <span className="material-symbols-outlined text-sm">account_balance</span>
                              <p className="text-xs font-bold uppercase tracking-widest">Patrimonio Neto (Manual)</p>
                          </div>
                          <div className={`transition-all duration-300 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 ${privacyMode ? 'blur-md select-none opacity-50' : ''}`}>
                              <h1 className="text-5xl md:text-7xl font-black tracking-tight">
                                  {formatMoney(metrics.balance)}
                              </h1>
                              <span className="text-xl md:text-3xl font-bold text-slate-400">
                                  ≈ {formatMoneyUSD(balanceUSD)}
                              </span>
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                              <p className="text-sm md:text-base text-slate-300 font-medium">
                                  Líquido: <span className={`text-white font-bold transition-all duration-300 ${privacyMode ? 'blur-sm select-none' : ''}`}>{formatMoney(metrics.balance - metrics.totalReserved)}</span>
                              </p>
                              
                              {/* WEALTH LEVEL BADGE */}
                              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                                  <span className={`material-symbols-outlined text-sm ${wealthLevel.color}`}>{wealthLevel.icon}</span>
                                  <span className={`text-xs font-bold uppercase ${wealthLevel.color}`}>Nivel: {wealthLevel.label}</span>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Fila Inferior: Métricas Mensuales (Incrustadas) */}
                  <div className="grid grid-cols-3 gap-4 bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                      <div 
                        onClick={onOpenIncomeManager} 
                        className="cursor-pointer group/stat hover:bg-white/5 rounded-xl p-2 transition-colors"
                      >
                          <div className="flex items-center gap-2 mb-1 text-emerald-400">
                              <span className="material-symbols-outlined text-lg">arrow_upward</span>
                              <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 group-hover/stat:text-white">Ganado (Mes)</span>
                          </div>
                          <p className={`text-lg md:text-2xl font-bold truncate transition-all duration-300 ${privacyMode ? 'blur-sm select-none' : ''}`}>
                             {formatMoney(stats.totalMonthlyIncome)}
                          </p>
                      </div>

                      <div 
                        onClick={onOpenBudget}
                        className="cursor-pointer group/stat hover:bg-white/5 rounded-xl p-2 transition-colors relative border-l border-white/10 pl-4"
                      >
                          <div className="flex items-center gap-2 mb-1 text-red-400">
                              <span className="material-symbols-outlined text-lg">arrow_downward</span>
                              <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 group-hover/stat:text-white">Gastos (Mes)</span>
                          </div>
                          <p className={`text-lg md:text-2xl font-bold truncate transition-all duration-300 ${privacyMode ? 'blur-sm select-none' : ''}`}>
                             {formatMoney(stats.totalMonthlyOutflow)}
                          </p>
                      </div>

                      <div 
                        onClick={onOpenSubscriptions}
                        className="cursor-pointer group/stat hover:bg-white/5 rounded-xl p-2 transition-colors relative border-l border-white/10 pl-4"
                      >
                          <div className="flex items-center gap-2 mb-1 text-blue-400">
                              <span className="material-symbols-outlined text-lg">home_work</span>
                              <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 group-hover/stat:text-white">Fijos</span>
                          </div>
                          <p className={`text-lg md:text-2xl font-bold truncate transition-all duration-300 ${privacyMode ? 'blur-sm select-none' : ''}`}>
                             {formatMoney(metrics.fixedExpenses)}
                          </p>
                      </div>
                  </div>
               </div>
          </section>

          {/* 2. BARRA DE ACCIONES Y HERRAMIENTAS */}
          <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                  <button 
                      onClick={onAddTransaction}
                      className="flex-1 bg-primary text-white h-14 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-blue-600 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                      <span className="material-symbols-outlined">add_circle</span>
                      Registrar Movimiento
                  </button>
                  <button 
                      onClick={() => setIsToolsOpen(!isToolsOpen)}
                      className={`h-14 px-6 rounded-2xl font-bold border transition-all flex items-center justify-center gap-2 ${
                          isToolsOpen 
                          ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-primary' 
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                  >
                      <span className="material-symbols-outlined">{isToolsOpen ? 'expand_less' : 'construction'}</span>
                      <span className="hidden sm:inline">Herramientas</span>
                  </button>
                  <button 
                      onClick={onOpenBudgetAdjust}
                      className="h-14 w-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      title="Mover Dinero"
                  >
                      <span className="material-symbols-outlined">swap_horiz</span>
                  </button>
              </div>

              {/* Collapsible Tools Grid */}
              {isToolsOpen && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-[fadeIn_0.3s_ease-out]">
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
                        desc="Calcula el valor real de tu tiempo." 
                    />
                    <ToolCard 
                        label="Simulador Futuro" 
                        icon="timeline" 
                        onClick={onOpenFuture} 
                        gradient="from-violet-500 to-fuchsia-600"
                        desc="Predice tu saldo a 30 días." 
                    />
                    <ToolCard 
                        label="Analíticas" 
                        icon="bar_chart" 
                        onClick={onOpenAnalytics} 
                        gradient="from-blue-500 to-indigo-600"
                        desc="Gráficos detallados de tus gastos." 
                    />
                 </div>
              )}
          </div>

          {/* 3. ESTADO Y PATRIMONIO (Cards Medianas) */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatusCard 
                  title="Apartados" 
                  value={formatMoney(metrics.totalReserved)} 
                  icon="savings" 
                  color="purple" 
                  onClick={onOpenSavingsBuckets}
                  privacyMode={privacyMode}
                />
                <StatusCard 
                  title="Mis Eventos" 
                  value={`${activeEventsCount} Activos`} 
                  icon="flight_takeoff" 
                  color="pink" 
                  onClick={onOpenEvents}
                />
                <StatusCard 
                  title="Deudas" 
                  value={formatMoney(metrics.totalDebt)} 
                  icon="gavel" 
                  color="red" 
                  onClick={onOpenDebts}
                  privacyMode={privacyMode}
                />
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

// Subcomponente para Herramientas
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
            className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl p-5 text-left border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group h-full flex flex-col items-start"
        >
            {/* Gradient Background Effect on Hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
            
            <div className={`mb-3 size-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-300`}>
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
            </div>
            
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1 group-hover:text-primary transition-colors">{label}</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{desc}</p>
        </button>
    );
}

// Subcomponente para Estado/Patrimonio
const StatusCard: React.FC<{
  title: string;
  value: string;
  icon: string;
  color: string;
  onClick: () => void;
  privacyMode?: boolean;
}> = ({ title, value, icon, color, onClick, privacyMode }) => {
    const colorStyles: {[key: string]: string} = {
        purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
        pink: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
        red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
    };

    return (
        <button onClick={onClick} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
            <div className="flex items-center gap-4">
                <div className={`size-10 rounded-full flex items-center justify-center ${colorStyles[color]}`}>
                    <span className="material-symbols-outlined text-[20px]">{icon}</span>
                </div>
                <div className="text-left">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
                    <p className={`font-bold text-slate-900 dark:text-white ${privacyMode ? 'blur-sm select-none' : ''}`}>{value}</p>
                </div>
            </div>
            <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
        </button>
    );
}

export default Dashboard;
