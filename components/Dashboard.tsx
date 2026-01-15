
import React, { useMemo } from 'react';
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
  onOpenWealthLevels?: () => void;
  onOpenAchievements?: () => void;
  onAddTransaction: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  privacyMode?: boolean;
  onTogglePrivacy?: () => void;
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
  onOpenWealthLevels,
  onOpenAchievements, // Deprecated but kept for type compatibility
  onAddTransaction, 
  isDarkMode, 
  onToggleTheme,
  privacyMode,
  onTogglePrivacy
}) => {
  
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatMoneyUSD = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const defaultAvatar = "https://lh3.googleusercontent.com/aida-public/AB6AXuD3W_-QV28bpv6tswBdb3gVXfvQ9Sd1qa2FIGrEXSr2QQhwgjBocZveQ_iZ7J4KEKay2_eW-X1e_D_YgmIkcA8CzxI9m9DrfSKITYEyZh1QbS_cU-ikAMnjc7jppiRpUtx2MU_e_8F4iEoxnnZDfqR5h0oOSuSVTm6ylZNFaJtmmBRyWTnZFGJLM0cmMDBGgzzyJBlAtbXeWNN-cYcN-zQt3qUI1cKXVPswGJB4Tmr449006R1-PDELmsW7e06pa1WY4URePcx_rEcX";

  // --- CÁLCULOS COMPARATIVOS (MES ACTUAL) ---
  const stats = useMemo(() => {
      const now = new Date();
      const currentMonthKey = now.toISOString().slice(0, 7); // YYYY-MM
      
      const currentIncome = transactions
        .filter(t => t.type === 'income' && t.date.startsWith(currentMonthKey))
        .reduce((acc, t) => acc + t.amount, 0);
      
      const currentVariableExpenses = transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(currentMonthKey))
        .reduce((acc, t) => acc + t.amount, 0);

      const totalMonthlyOutflow = metrics.fixedExpenses + currentVariableExpenses;
      const totalMonthlyIncome = metrics.salaryPaid + currentIncome;
      const netMonthly = totalMonthlyIncome - totalMonthlyOutflow;

      return {
          currentVariableExpenses,
          totalMonthlyOutflow,
          totalMonthlyIncome,
          currentIncome,
          netMonthly
      };
  }, [transactions, metrics.fixedExpenses, metrics.salaryPaid]);

  const activeEventsCount = profile.events?.filter(e => e.status === 'active').length || 0;

  // Lógica de Niveles Patrimoniales (Sincronizada con WealthLevel.tsx)
  const getWealthLevel = (balance: number, rate: number) => {
      const balanceUSD = balance / rate;
      if (balanceUSD >= 1000000) return { label: 'Leyenda', icon: 'diamond', color: 'text-yellow-400' };
      if (balanceUSD >= 500000) return { label: 'Magnate', icon: 'domain', color: 'text-purple-400' };
      if (balanceUSD >= 100000) return { label: 'Inversionista', icon: 'trending_up', color: 'text-emerald-400' };
      if (balanceUSD >= 25000) return { label: 'Mercader', icon: 'storefront', color: 'text-cyan-400' };
      if (balanceUSD >= 5000) return { label: 'Escudero', icon: 'shield', color: 'text-amber-400' };
      if (balanceUSD >= 1000) return { label: 'Ahorrador', icon: 'savings', color: 'text-orange-400' };
      return { label: 'Novato', icon: 'start', color: 'text-slate-400' };
  };

  const dollarRate = profile.customDollarRate || 1130; 
  const wealthLevel = getWealthLevel(metrics.balance, dollarRate);
  const balanceUSD = metrics.balance / dollarRate;

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col overflow-x-hidden transition-colors duration-300">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full bg-surface-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
        <div className="px-4 md:px-8 py-3 flex items-center justify-between max-w-[1440px] mx-auto w-full">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </div>
            <h2 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight hidden xs:block">Smart Money</h2>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            
            {/* Privacy Toggle */}
            <button 
              onClick={onTogglePrivacy}
              className="size-9 md:size-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">
                {privacyMode ? 'visibility_off' : 'visibility'}
              </span>
            </button>

            {/* Dark Mode Toggle */}
            <button 
              onClick={onToggleTheme}
              className="size-9 md:size-10 rounded-full flex items-center justify-center text-slate-500 dark:text-yellow-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
            >
              <span className={`material-symbols-outlined text-[20px] transition-transform duration-500 ${isDarkMode ? 'rotate-[360deg] filled' : 'rotate-0'}`}>
                {isDarkMode ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            {/* Botón Perfil */}
            <button 
              onClick={onOpenProfile}
              className="bg-slate-200 dark:bg-slate-700 rounded-full size-9 md:size-10 flex items-center justify-center border-2 border-white dark:border-slate-600 overflow-hidden hover:opacity-80 transition-opacity"
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
      <div className="flex-1 flex justify-center py-4 md:py-6 px-4 md:px-8">
        <div className="w-full max-w-[1440px] flex flex-col gap-5 md:gap-6">
          
          {/* Header de Bienvenida */}
          <div className="flex flex-col">
             <h1 className="text-lg md:text-xl font-medium text-slate-500 dark:text-slate-400 tracking-tight">
                Hola, <span className="text-slate-900 dark:text-white font-bold">{profile.name ? profile.name.split(' ')[0] : 'Viajero'}</span> 👋
             </h1>
          </div>

          {/* 1. SECCIÓN HERO: BALANCE */}
          <section className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-blue-950 dark:via-slate-900 dark:to-slate-950 rounded-[2rem] p-6 md:p-10 text-white shadow-xl shadow-slate-300 dark:shadow-none relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-white/10 transition-colors duration-700"></div>
               
               <div className="relative z-10 flex flex-col gap-6">
                  {/* Balance Principal */}
                  <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 mb-1 opacity-80">
                          <span className="material-symbols-outlined text-sm">account_balance</span>
                          <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Patrimonio Neto (Manual)</p>
                      </div>
                      <div className={`transition-all duration-300 flex flex-col md:flex-row md:items-baseline gap-1 md:gap-4 ${privacyMode ? 'blur-md select-none opacity-50' : ''}`}>
                          <h1 className="text-4xl xs:text-5xl md:text-7xl font-black tracking-tight leading-none">
                              {formatMoney(metrics.balance)}
                          </h1>
                          <span className="text-lg md:text-2xl font-bold text-slate-400">
                              ≈ {formatMoneyUSD(balanceUSD)}
                          </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                          <p className="text-xs md:text-sm text-slate-300 font-medium bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                              Líquido: <span className={`text-white font-bold ${privacyMode ? 'blur-sm select-none' : ''}`}>{formatMoney(metrics.balance - metrics.totalReserved)}</span>
                          </p>
                          
                          <button 
                            onClick={onOpenWealthLevels}
                            className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 hover:bg-white/20 transition-all active:scale-95 group/level"
                          >
                              <span className={`material-symbols-outlined text-sm ${wealthLevel.color} group-hover/level:scale-110 transition-transform`}>{wealthLevel.icon}</span>
                              <span className={`text-xs font-bold uppercase ${wealthLevel.color}`}>{wealthLevel.label}</span>
                              <span className="material-symbols-outlined text-[12px] text-white/50">chevron_right</span>
                          </button>
                      </div>
                  </div>

                  {/* Fila Inferior: Métricas Mensuales (Compactas en móvil) */}
                  <div className="grid grid-cols-3 gap-2 md:gap-4 bg-white/5 backdrop-blur-md rounded-2xl p-3 md:p-4 border border-white/10">
                      <div onClick={onOpenIncomeManager} className="cursor-pointer hover:bg-white/5 rounded-xl p-1 md:p-2 transition-colors text-center md:text-left">
                          <p className="text-[10px] uppercase font-bold text-emerald-400 mb-0.5">Ganado</p>
                          <p className={`text-sm md:text-xl font-bold truncate ${privacyMode ? 'blur-sm' : ''}`}>{formatMoney(stats.totalMonthlyIncome)}</p>
                      </div>
                      <div onClick={onOpenBudget} className="cursor-pointer hover:bg-white/5 rounded-xl p-1 md:p-2 transition-colors border-l border-white/10 text-center md:text-left">
                          <p className="text-[10px] uppercase font-bold text-red-400 mb-0.5">Gastado</p>
                          <p className={`text-sm md:text-xl font-bold truncate ${privacyMode ? 'blur-sm' : ''}`}>{formatMoney(stats.totalMonthlyOutflow)}</p>
                      </div>
                      <div onClick={onOpenAnalytics} className="cursor-pointer hover:bg-white/5 rounded-xl p-1 md:p-2 transition-colors border-l border-white/10 text-center md:text-left">
                          <p className="text-[10px] uppercase font-bold text-blue-400 mb-0.5">Neto</p>
                          <p className={`text-sm md:text-xl font-bold truncate ${privacyMode ? 'blur-sm' : ''} ${stats.netMonthly < 0 ? 'text-red-300' : ''}`}>{formatMoney(stats.netMonthly)}</p>
                      </div>
                  </div>
               </div>
          </section>

          {/* 2. ACCIÓN PRINCIPAL */}
          <div className="flex gap-3 md:gap-4">
              <button 
                  onClick={onAddTransaction}
                  className="flex-1 bg-primary text-white h-14 md:h-16 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-blue-600 transition-all flex items-center justify-center gap-2 md:gap-3 active:scale-95"
              >
                  <span className="material-symbols-outlined text-xl md:text-2xl">add_circle</span>
                  <span className="text-sm md:text-lg">Registrar Movimiento</span>
              </button>
              <button 
                  onClick={onOpenBudgetAdjust}
                  className="h-14 w-14 md:h-16 md:w-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                  title="Mover Dinero"
              >
                  <span className="material-symbols-outlined text-xl md:text-2xl">swap_horiz</span>
              </button>
          </div>

          {/* 3. APP LAUNCHER GRID */}
          <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">Apps & Herramientas</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  <AppCard title="Ingresos" subtitle="Fuentes fijas" icon="payments" color="blue" onClick={onOpenIncomeManager} />
                  <AppCard title="Gastos Fijos" subtitle={`Total: ${formatMoney(metrics.fixedExpenses)}`} icon="home_work" color="indigo" onClick={onOpenSubscriptions} privacyMode={privacyMode} />
                  <AppCard title="Límites" subtitle="Presupuesto" icon="tune" color="teal" onClick={onOpenBudget} />
                  <AppCard title="Apartados" subtitle={`${formatMoney(metrics.totalReserved)}`} icon="savings" color="purple" onClick={onOpenSavingsBuckets} privacyMode={privacyMode} />
                  <AppCard title="Eventos" subtitle={`${activeEventsCount} Activos`} icon="flight_takeoff" color="pink" onClick={onOpenEvents} />
                  <AppCard title="Deudas" subtitle={`${formatMoney(metrics.totalDebt)}`} icon="gavel" color="red" onClick={onOpenDebts} privacyMode={privacyMode} />
                  <AppCard title="Analíticas" subtitle="Gráficos" icon="bar_chart" color="orange" onClick={onOpenAnalytics} />
                  <AppCard title="Conversor" subtitle="Dólar & Divisas" icon="currency_exchange" color="yellow" onClick={onOpenCurrencyConverter} />
                  {/* Trofeos removido por solicitud del usuario */}
                  <AppCard title="Simulador" subtitle="Futuro a 30 días" icon="timeline" color="violet" onClick={onOpenFuture} />
                  <AppCard title="Costo Vida" subtitle="Calculadora" icon="price_check" color="emerald" onClick={onOpenSalaryCalculator} />
              </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// Componente Unificado para Apps - Optimizado para móviles
const AppCard: React.FC<{ 
  title: string; 
  subtitle: string; 
  icon: string; 
  color: string;
  onClick: () => void;
  privacyMode?: boolean;
}> = ({ title, subtitle, icon, color, onClick, privacyMode }) => {
    
    const colorClasses: Record<string, string> = {
        blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
        teal: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
        purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
        pink: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
        red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
        orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
        yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
        emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
        violet: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
        amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    };

    return (
        <button 
            onClick={onClick}
            className="flex flex-col items-start p-3 md:p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-[0.98] transition-all duration-200 h-24 md:h-28 justify-between relative overflow-hidden"
        >
            <div className={`size-8 md:size-10 rounded-xl flex items-center justify-center mb-1 ${colorClasses[color] || colorClasses['blue']}`}>
                <span className="material-symbols-outlined text-[18px] md:text-[20px]">{icon}</span>
            </div>
            <div className="text-left w-full relative z-10">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs md:text-sm leading-tight">{title}</h4>
                <p className={`text-[10px] text-slate-500 font-medium truncate mt-0.5 ${privacyMode ? 'blur-sm select-none' : ''}`}>
                    {subtitle}
                </p>
            </div>
        </button>
    );
}

export default Dashboard;
