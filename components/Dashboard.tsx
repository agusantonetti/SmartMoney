
import React, { useState, useEffect, useRef } from 'react';
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
  onAddTransaction, 
  isDarkMode, 
  onToggleTheme,
  privacyMode,
  onTogglePrivacy
}) => {
  const [isBudgetMenuOpen, setIsBudgetMenuOpen] = useState(false);
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

  // CÁLCULO GASTOS DEL MES
  const currentMonthKey = new Date().toISOString().slice(0, 7); 
  const currentMonthVariableExpenses = transactions
    .filter(t => t.type === 'expense' && t.date.startsWith(currentMonthKey))
    .reduce((acc, t) => acc + t.amount, 0);
  
  const totalMonthlyOutflow = metrics.fixedExpenses + currentMonthVariableExpenses;

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

            {/* Menú Desplegable: Mi Presupuesto */}
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
                    <button onClick={() => { setIsBudgetMenuOpen(false); onOpenFuture(); }} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl text-left transition-colors">
                      <div className="size-8 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">crystal_ball</span></div>
                      <div><p className="text-sm font-bold text-slate-800 dark:text-white">Simulador</p><p className="text-[10px] text-slate-400">Proyección Futura</p></div>
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

          {/* 1. BALANCE (HERO - ESTELAR) */}
          <div className="w-full bg-gradient-to-r from-slate-900 to-slate-800 dark:from-blue-900 dark:to-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl shadow-slate-200 dark:shadow-none relative overflow-hidden group">
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

          {/* 2. GRID DE OPCIONES (PRIORIDAD REORDENADA) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            
            {/* 1. Sueldos */}
            <MetricCard 
              label="Ingresos" 
              amount={formatMoney(metrics.salaryPaid)} 
              color="blue" 
              icon="payments" 
              onClick={onOpenIncomeManager}
              helperText="Gestionar Sueldos"
              isBlurred={privacyMode}
            />

            {/* 2. Gastos Totales del Mes (Variables + Fijos) */}
            <MetricCard 
              label="Gastos Mes" 
              amount={formatMoney(totalMonthlyOutflow)} 
              color="indigo" 
              icon="calendar_today" 
              onClick={onOpenBudget}
              helperText="Ver Límites"
              isBlurred={privacyMode}
            />

            {/* 3. Viajes / Eventos (NUEVO) */}
             <MetricCard 
              label="Mis Viajes" 
              amount={activeEventsCount > 0 ? `${activeEventsCount} Activos` : 'Ver'} 
              color="pink" 
              icon="flight_takeoff" 
              onClick={onOpenEvents}
              helperText="Gestionar Eventos"
            />

            {/* 4. Gastos Fijos (antes Suscripciones) */}
            <MetricCard 
              label="Fijos" 
              amount={formatMoney(metrics.fixedExpenses)} 
              color="indigo" 
              icon="home_work" 
              onClick={onOpenSubscriptions}
              helperText="Alquiler y Servicios"
              isBlurred={privacyMode}
            />

            {/* 5. Apartados */}
            <MetricCard 
              label="Apartados" 
              amount={formatMoney(metrics.totalReserved)} 
              color="purple" 
              icon="savings" 
              onClick={onOpenSavingsBuckets}
              helperText="Ver Proyectos"
              isBlurred={privacyMode}
            />

            {/* 6. Registrar (Apartada) */}
            <MetricCard 
              label="Nuevo" 
              amount="+" 
              color="emerald" 
              icon="add_circle" 
              highlight 
              onClick={onAddTransaction}
              helperText="Registrar Movimiento"
            />
          </div>

          {/* 3. MÉTRICAS SECUNDARIAS (HEALTH SCORE + RUNWAY) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {/* Health Score Card */}
             <div className="md:col-span-2 bg-surface-light dark:bg-surface-dark rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden transition-colors duration-300">
                <div className="flex justify-between items-start z-10 relative">
                   <div>
                      <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Health Score</h3>
                      <p className="text-slate-400 text-xs mb-4">Tu salud financiera global.</p>
                      <h2 className="text-4xl font-black text-slate-900 dark:text-white flex items-end gap-2">
                        {metrics.healthScore}/100
                        <span className="text-sm font-medium text-slate-400 mb-1 pb-1">Puntos</span>
                      </h2>
                   </div>
                   <div className={`p-3 rounded-xl ${metrics.healthScore > 70 ? 'bg-emerald-100 text-emerald-600' : metrics.healthScore > 40 ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
                      <span className="material-symbols-outlined text-2xl">
                        {metrics.healthScore > 70 ? 'ecg_heart' : metrics.healthScore > 40 ? 'monitor_heart' : 'heart_broken'}
                      </span>
                   </div>
                </div>
                <div className="mt-6 w-full bg-slate-100 dark:bg-slate-700 h-4 rounded-full overflow-hidden">
                   <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${metrics.healthScore > 70 ? 'bg-emerald-500' : metrics.healthScore > 40 ? 'bg-yellow-400' : 'bg-red-500'}`} 
                      style={{ width: `${metrics.healthScore}%` }}
                   ></div>
                </div>
             </div>

             {/* Runway Card */}
             <div className="bg-primary text-white rounded-3xl p-6 shadow-lg shadow-primary/20 relative overflow-hidden flex flex-col justify-center items-center text-center">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% -20%, white 0%, transparent 20%)' }}></div>
                <h3 className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-2 z-10">Vida Útil (Runway)</h3>
                <span className="text-5xl font-black z-10">{metrics.runway}</span>
                <span className="text-sm font-medium text-blue-100 z-10">Meses de libertad</span>
                <p className="text-[10px] text-blue-200 mt-2 z-10 opacity-80">Saldo disponible / Gastos promedio.</p>
             </div>
          </div>

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

const MetricCard: React.FC<{ 
  label: string; 
  amount: string; 
  color: string; 
  icon: string; 
  highlight?: boolean;
  onClick?: () => void;
  helperText?: string;
  isBlurred?: boolean;
}> = ({ label, amount, color, icon, highlight, onClick, helperText, isBlurred }) => {
  const colorStyles: {[key: string]: string} = {
     emerald: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400',
     red: 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400',
     blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400',
     purple: 'text-purple-600 bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400',
     indigo: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400',
     orange: 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400',
     pink: 'text-pink-600 bg-pink-100 dark:bg-pink-900/20 dark:text-pink-400',
  };

  return (
     <button 
        onClick={onClick}
        className={`text-left bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-2 transition-all hover:-translate-y-1 hover:shadow-md active:scale-95 cursor-pointer group w-full ${highlight ? 'ring-2 ring-emerald-500/30' : ''}`}
     >
        <div className="flex items-center justify-between w-full">
           <div className="flex items-center gap-2">
              <div className={`size-6 rounded-full flex items-center justify-center ${colorStyles[color] || colorStyles.blue}`}>
                 <span className="material-symbols-outlined text-[14px]">{icon}</span>
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
           </div>
           <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-[16px] opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>
        </div>
        <p className={`text-lg font-bold truncate ${highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'} ${isBlurred ? 'blur-sm select-none' : ''}`}>{amount}</p>
        {helperText && <p className="text-[10px] text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">{helperText}</p>}
     </button>
  );
}

export default Dashboard;
