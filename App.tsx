
import React, { useState, useEffect, useMemo } from 'react';
import { ViewState, Transaction, FinancialMetrics, FinancialProfile, QuickAction } from './types';
import Dashboard from './components/Dashboard';
import TransactionInput from './components/TransactionInput';
import ActivityHub from './components/ActivityHub'; 
import BudgetControl from './components/BudgetControl'; 
import SuccessScreen from './components/SuccessScreen';
import ProfileSetup from './components/ProfileSetup';
import IncomeManager from './components/IncomeManager';
import SavingsBuckets from './components/SavingsBuckets';
import SubscriptionManager from './components/SubscriptionManager';
import DebtManager from './components/DebtManager';
import AnalyticsCenter from './components/AnalyticsCenter';
import EventManager from './components/EventManager';
import FutureSimulator from './components/FutureSimulator'; 
import LandingPage from './components/LandingPage';
import BudgetAdjust from './components/BudgetAdjust';

// Default Actions definition for init
const DEFAULT_ACTIONS: QuickAction[] = [
    { id: 'def1', label: 'Café', amount: 2500, icon: 'coffee' },
    { id: 'def2', label: 'Uber', icon: 'local_taxi' },
    { id: 'def3', label: 'Super', amount: 20000, icon: 'shopping_cart' },
    { id: 'def4', label: 'Comida', amount: 8000, icon: 'restaurant' },
    { id: 'def5', label: 'Nafta', amount: 15000, icon: 'local_gas_station' },
];

const DEFAULT_PROFILE: FinancialProfile = { 
    initialBalance: 0, 
    incomeSources: [],
    savingsBuckets: [],
    subscriptions: [],
    debts: [],
    budgetLimits: {}, 
    quickActions: DEFAULT_ACTIONS, 
    monthlySalary: 0,
    hourlyWage: 0, 
    events: [], 
    name: 'Viajero',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD3W_-QV28bpv6tswBdb3gVXfvQ9Sd1qa2FIGrEXSr2QQhwgjBocZveQ_iZ7J4KEKay2_eW-X1e_D_YgmIkcA8CzxI9m9DrfSKITYEyZh1QbS_cU-ikAMnjc7jppiRpUtx2MU_e_8F4iEoxnnZDfqR5h0oOSuSVTm6ylZNFaJtmmBRyWTnZFGJLM0cmMDBGgzzyJBlAtbXeWNN-cYcN-zQt3qUI1cKXVPswGJB4Tmr449006R1-PDELmsW7e06pa1WY4URePcx_rEcX'
};

const App: React.FC = () => {
  // SESSION STATE
  const [userSession, setUserSession] = useState<string | null>(() => {
      // Intentar recuperar la última sesión activa
      if (typeof window !== 'undefined') {
          return localStorage.getItem('smartMoney_active_user');
      }
      return null;
  });

  const [currentView, setCurrentView] = useState<ViewState>(() => {
      return userSession ? ViewState.DASHBOARD : ViewState.LANDING;
  });

  // DATA STATE
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [financialProfile, setFinancialProfile] = useState<FinancialProfile>(DEFAULT_PROFILE);
  const [tempEventContext, setTempEventContext] = useState<{id: string, name: string} | null>(null);
  const [showToast, setShowToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  // DARK MODE STATE
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('smartMoney_theme');
      return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('smartMoney_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('smartMoney_theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);

  // 1. CARGA DE DATOS AL CAMBIAR DE SESIÓN
  useEffect(() => {
    if (userSession) {
        loadUserData(userSession);
        setCurrentView(ViewState.DASHBOARD);
    } else {
        setTransactions([]);
        setFinancialProfile(DEFAULT_PROFILE);
        setCurrentView(ViewState.LANDING);
    }
  }, [userSession]);

  const loadUserData = (email: string) => {
      try {
          const dataKey = `sm_${email}_data`;
          const profileKey = `sm_${email}_profile`;

          const savedData = localStorage.getItem(dataKey);
          const savedProfile = localStorage.getItem(profileKey);

          if (savedData) {
              setTransactions(JSON.parse(savedData));
          } else {
              setTransactions([]);
          }

          if (savedProfile) {
              const parsed = JSON.parse(savedProfile);
              // Merge para asegurar integridad
              const mergedProfile = { ...DEFAULT_PROFILE, ...parsed };
              
              // Reparar quickActions perdidos en versiones anteriores
              if (!mergedProfile.quickActions || mergedProfile.quickActions.length === 0) {
                  mergedProfile.quickActions = DEFAULT_ACTIONS;
              }
              
              setFinancialProfile(mergedProfile);
          } else {
              // Usuario nuevo
              setFinancialProfile({ ...DEFAULT_PROFILE, name: email.split('@')[0] });
          }
      } catch (e) {
          console.error("Error loading user data", e);
          triggerToast("Error al cargar datos", "error");
      }
  };

  // 2. GUARDADO AUTOMÁTICO (Solo si hay sesión activa)
  useEffect(() => {
      if (userSession) {
          const dataKey = `sm_${userSession}_data`;
          const profileKey = `sm_${userSession}_profile`;
          
          localStorage.setItem(dataKey, JSON.stringify(transactions));
          localStorage.setItem(profileKey, JSON.stringify(financialProfile));
      }
  }, [transactions, financialProfile, userSession]);

  // --- AUTH HANDLERS ---

  const handleLogin = (email: string) => {
      // Normalizamos el email para usarlo como ID
      const userId = email.trim().toLowerCase();
      localStorage.setItem('smartMoney_active_user', userId);
      setUserSession(userId);
      triggerToast(`Bienvenido, ${userId.split('@')[0]}`, 'success');
  };

  const handleLogout = () => {
      localStorage.removeItem('smartMoney_active_user');
      setUserSession(null);
      setCurrentView(ViewState.LANDING); // Forzar la vista de landing
      triggerToast("Sesión cerrada", 'success');
  };

  // --- APP LOGIC ---

  const metrics: FinancialMetrics = useMemo(() => {
    const safeNum = (n: number) => (isNaN(n) || !isFinite(n)) ? 0 : n;

    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + safeNum(t.amount), 0);
      
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + safeNum(t.amount), 0);

    const balance = (financialProfile.initialBalance || 0) + income - expense;
    const salaryPaid = (financialProfile.incomeSources || []).reduce((sum, src) => sum + src.amount, 0);
    const totalReserved = (financialProfile.savingsBuckets || []).reduce((sum, bucket) => sum + bucket.currentAmount, 0);
    const fixedExpenses = (financialProfile.subscriptions || []).reduce((sum, sub) => sum + sub.amount, 0);
    const totalDebt = (financialProfile.debts || []).reduce((sum, d) => sum + (d.totalAmount - d.currentAmount), 0);

    const uniqueMonths = new Set(transactions.map(t => (t.date ? t.date.substring(0, 7) : ''))).size || 1;
    const avgMonthlyExpense = (expense / Math.max(1, uniqueMonths)) + fixedExpenses;
    const freeBalance = balance - totalReserved;
    
    let runway = 0;
    if (avgMonthlyExpense > 0) {
      runway = freeBalance / avgMonthlyExpense;
    } else {
      runway = freeBalance > 0 ? 99 : 0;
    }

    let score = 0;
    if (freeBalance > 0) score += 20; 
    if (runway >= 6) score += 40; 
    else if (runway >= 3) score += 20; 
    else if (runway >= 1) score += 10;
    
    const totalMonthlyIncome = salaryPaid + (income / Math.max(1, uniqueMonths));
    const savingsRate = totalMonthlyIncome > 0 ? (totalMonthlyIncome - avgMonthlyExpense) / totalMonthlyIncome : 0;
    
    if (savingsRate >= 0.20) score += 40;
    else if (savingsRate >= 0.10) score += 20;

    if (totalDebt > freeBalance) score -= 10;

    return {
      income: safeNum(income),
      expense: safeNum(expense),
      balance: safeNum(balance),
      salaryPaid: safeNum(salaryPaid),
      totalReserved: safeNum(totalReserved),
      fixedExpenses: safeNum(fixedExpenses),
      totalDebt: safeNum(totalDebt),
      runway: safeNum(parseFloat(runway.toFixed(1))),
      healthScore: Math.min(100, Math.max(0, safeNum(score)))
    };
  }, [transactions, financialProfile]);

  const handleAddTransaction = (tx: Transaction) => {
    setTransactions(prev => [tx, ...prev]);
    triggerToast("Transacción guardada", 'success');
    
    if (tempEventContext) {
        setCurrentView(ViewState.EVENTS);
        setTempEventContext(null);
    } else {
        setCurrentView(ViewState.SUCCESS);
    }
  };

  const handleUpdateProfile = (profile: FinancialProfile) => {
    setFinancialProfile(profile);
  };
  
  const handleUpdateTransactions = (newTransactions: Transaction[]) => {
    setTransactions(newTransactions);
  };

  const handleImportData = (data: { profile: FinancialProfile, transactions: Transaction[] }) => {
    if (data.profile && data.transactions) {
       setFinancialProfile(data.profile);
       setTransactions(data.transactions);
       triggerToast("Datos restaurados correctamente", 'success');
       setCurrentView(ViewState.DASHBOARD);
    } else {
       triggerToast("Archivo de respaldo inválido", 'error');
    }
  };

  const handleAddEventTransaction = (eventId: string, eventName: string) => {
      setTempEventContext({ id: eventId, name: eventName });
      setCurrentView(ViewState.TRANSACTION);
  };

  const triggerToast = (message: string, type: 'success' | 'error') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  const renderView = () => {
    switch (currentView) {
      case ViewState.LANDING:
        return <LandingPage onLogin={handleLogin} />;
      case ViewState.DASHBOARD:
        return (
          <Dashboard 
            metrics={metrics} 
            transactions={transactions}
            profile={financialProfile} 
            onOpenProfile={() => setCurrentView(ViewState.PROFILE)}
            onOpenIncomeManager={() => setCurrentView(ViewState.INCOME_MANAGER)}
            onOpenSavingsBuckets={() => setCurrentView(ViewState.SAVINGS_BUCKETS)}
            onOpenSubscriptions={() => setCurrentView(ViewState.SUBSCRIPTIONS)}
            onOpenDebts={() => setCurrentView(ViewState.DEBTS)}
            onOpenAnalytics={() => setCurrentView(ViewState.ANALYTICS)}
            onOpenBudget={() => setCurrentView(ViewState.BUDGET_CONTROL)}
            onOpenEvents={() => setCurrentView(ViewState.EVENTS)} 
            onOpenFuture={() => setCurrentView(ViewState.FUTURE_SIMULATOR)}
            onOpenBudgetAdjust={() => setCurrentView(ViewState.BUDGET_ADJUST)} 
            onAddTransaction={() => {
                setTempEventContext(null);
                setCurrentView(ViewState.TRANSACTION);
            }}
            isDarkMode={darkMode}
            onToggleTheme={toggleTheme}
          />
        );
      case ViewState.BUDGET_ADJUST:
          return (
              <BudgetAdjust
                  profile={financialProfile}
                  freeBalance={metrics.balance - metrics.totalReserved}
                  onUpdateProfile={handleUpdateProfile}
                  onBack={() => setCurrentView(ViewState.DASHBOARD)}
              />
          );
      case ViewState.TRANSACTION:
        return (
          <TransactionInput 
            onConfirm={handleAddTransaction} 
            onBack={() => {
                if (tempEventContext) setCurrentView(ViewState.EVENTS);
                else setCurrentView(ViewState.DASHBOARD);
                setTempEventContext(null);
            }}
            profile={financialProfile}
            onUpdateProfile={handleUpdateProfile}
            defaultEventId={tempEventContext?.id} 
            defaultEventName={tempEventContext?.name}
          />
        );
      case ViewState.EVENTS:
        return (
          <EventManager
            profile={financialProfile}
            transactions={transactions}
            onUpdateProfile={handleUpdateProfile}
            onUpdateTransactions={handleUpdateTransactions} 
            onAddTransactionToEvent={handleAddEventTransaction}
            onBack={() => setCurrentView(ViewState.DASHBOARD)}
          />
        );
      case ViewState.FUTURE_SIMULATOR:
        return (
          <FutureSimulator
            transactions={transactions}
            profile={financialProfile}
            currentBalance={metrics.balance - metrics.totalReserved}
            onBack={() => setCurrentView(ViewState.DASHBOARD)}
          />
        );
      case ViewState.ACTIVITY:
        return (
          <ActivityHub 
            transactions={transactions}
            onUpdateTransactions={handleUpdateTransactions}
            onBack={() => setCurrentView(ViewState.DASHBOARD)} 
          />
        );
      case ViewState.BUDGET_CONTROL:
        return (
          <BudgetControl 
            profile={financialProfile}
            transactions={transactions}
            onUpdateProfile={handleUpdateProfile}
            onBack={() => setCurrentView(ViewState.DASHBOARD)} 
          />
        );
      case ViewState.SUCCESS:
        return <SuccessScreen onBack={() => setCurrentView(ViewState.DASHBOARD)} />;
      case ViewState.PROFILE:
        return (
          <ProfileSetup 
            currentProfile={financialProfile}
            allTransactions={transactions} 
            onSave={(p) => {
               handleUpdateProfile(p);
               setCurrentView(ViewState.DASHBOARD);
               triggerToast("Perfil guardado", 'success');
            }}
            onImportData={handleImportData}
            onBack={() => setCurrentView(ViewState.DASHBOARD)}
            onLogout={handleLogout} 
          />
        );
      case ViewState.INCOME_MANAGER:
        return (
          <IncomeManager 
            profile={financialProfile}
            transactions={transactions}
            onUpdateProfile={handleUpdateProfile}
            onBack={() => setCurrentView(ViewState.DASHBOARD)}
          />
        );
      case ViewState.SAVINGS_BUCKETS:
        return (
          <SavingsBuckets 
            profile={financialProfile}
            totalBalance={metrics.balance}
            onUpdateProfile={handleUpdateProfile}
            onBack={() => setCurrentView(ViewState.DASHBOARD)}
          />
        );
      case ViewState.SUBSCRIPTIONS:
        return (
          <SubscriptionManager 
            profile={financialProfile}
            onUpdateProfile={handleUpdateProfile}
            onBack={() => setCurrentView(ViewState.DASHBOARD)}
          />
        );
      case ViewState.DEBTS:
        return (
          <DebtManager
            profile={financialProfile}
            totalBalance={metrics.balance}
            onUpdateProfile={handleUpdateProfile}
            onBack={() => setCurrentView(ViewState.DASHBOARD)}
          />
        );
      case ViewState.ANALYTICS:
        return (
          <AnalyticsCenter
            transactions={transactions}
            profile={financialProfile} 
            onBack={() => setCurrentView(ViewState.DASHBOARD)}
          />
        );
      default:
        return (
          <Dashboard 
            metrics={metrics} 
            transactions={transactions} 
            profile={financialProfile}
            onOpenProfile={() => setCurrentView(ViewState.PROFILE)}
            onOpenIncomeManager={() => setCurrentView(ViewState.INCOME_MANAGER)}
            onOpenSavingsBuckets={() => setCurrentView(ViewState.SAVINGS_BUCKETS)}
            onOpenSubscriptions={() => setCurrentView(ViewState.SUBSCRIPTIONS)}
            onOpenDebts={() => setCurrentView(ViewState.DEBTS)}
            onOpenAnalytics={() => setCurrentView(ViewState.ANALYTICS)}
            onOpenBudget={() => setCurrentView(ViewState.BUDGET_CONTROL)}
            onOpenEvents={() => setCurrentView(ViewState.EVENTS)}
            onOpenFuture={() => setCurrentView(ViewState.FUTURE_SIMULATOR)}
            onOpenBudgetAdjust={() => setCurrentView(ViewState.BUDGET_ADJUST)}
            onAddTransaction={() => setCurrentView(ViewState.TRANSACTION)}
            isDarkMode={darkMode}
            onToggleTheme={toggleTheme}
          />
        );
    }
  };

  const showNavigation = currentView !== ViewState.SUCCESS && 
                         currentView !== ViewState.PROFILE && 
                         currentView !== ViewState.INCOME_MANAGER &&
                         currentView !== ViewState.SAVINGS_BUCKETS &&
                         currentView !== ViewState.SUBSCRIPTIONS &&
                         currentView !== ViewState.DEBTS &&
                         currentView !== ViewState.ANALYTICS &&
                         currentView !== ViewState.BUDGET_CONTROL &&
                         currentView !== ViewState.TRANSACTION &&
                         currentView !== ViewState.EVENTS &&
                         currentView !== ViewState.FUTURE_SIMULATOR &&
                         currentView !== ViewState.LANDING &&
                         currentView !== ViewState.BUDGET_ADJUST;

  return (
    <div className="relative min-h-screen bg-background-light dark:bg-background-dark transition-colors duration-300">
      <div className="pb-24"> 
        {renderView()}
      </div>

      {/* TOAST NOTIFICATION SYSTEM */}
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-xl transition-all duration-500 z-[120] flex items-center gap-3 ${
        showToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'
      } ${showToast?.type === 'error' ? 'bg-red-500 text-white' : 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white'}`}>
        <span className="material-symbols-outlined text-[20px]">
          {showToast?.type === 'error' ? 'error' : 'check_circle'}
        </span>
        <span className="font-medium text-sm">{showToast?.message}</span>
      </div>

      {/* Navegación Flotante */}
      {showNavigation && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2 flex justify-between items-center">
            <NavButton 
              active={currentView === ViewState.DASHBOARD} 
              onClick={() => setCurrentView(ViewState.DASHBOARD)} 
              icon="dashboard" 
              label="Panel" 
            />
            <NavButton 
              active={false} 
              onClick={() => setCurrentView(ViewState.TRANSACTION)} 
              icon="add_circle" 
              label="Añadir" 
              highlight
            />
            <NavButton 
              active={currentView === ViewState.ACTIVITY} 
              onClick={() => setCurrentView(ViewState.ACTIVITY)} 
              icon="list_alt" 
              label="Actividad" 
            />
          </div>
        </div>
      )}
    </div>
  );
};

interface NavButtonProps { 
  active: boolean; 
  onClick: () => void; 
  icon: string; 
  label: string;
  highlight?: boolean;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label, highlight }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full py-1 gap-1 transition-all duration-200 ${
      active 
        ? 'text-primary scale-105' 
        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
    }`}
  >
    <div className={`flex items-center justify-center rounded-full transition-all ${
      highlight 
        ? 'bg-primary text-white size-12 shadow-lg shadow-primary/30 mb-1' 
        : active ? 'bg-primary/10 size-10' : 'size-8'
    }`}>
      <span className={`material-symbols-outlined ${highlight ? 'text-[24px]' : 'text-[22px]'}`}>{icon}</span>
    </div>
    {!highlight && <span className="text-[10px] font-bold tracking-wide">{label}</span>}
  </button>
);

export default App;
