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
import SalaryCalculator from './components/SalaryCalculator';
import FinancialAssistant from './components/FinancialAssistant'; 
import CurrencyConverter from './components/CurrencyConverter'; 
import WealthLevel from './components/WealthLevel'; 
import Achievements from './components/Achievements'; 

// FIREBASE IMPORTS
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import * as firestore from 'firebase/firestore';

const { doc, setDoc, onSnapshot } = firestore;

// Helper para traducir errores de Firebase a mensajes amigables
const getFriendlyErrorMessage = (error: any): string => {
  const code = error?.code || '';
  const message = error?.message || '';

  if (code.includes('unavailable') || message.includes('offline')) {
      return "Sin conexión. Los cambios se guardarán al recuperar internet.";
  }
  if (code.includes('permission-denied')) {
      return "No tienes permisos para realizar esta acción.";
  }
  if (code.includes('resource-exhausted')) {
      return "Límite de cuota excedido. Intenta más tarde.";
  }
  if (code.includes('cancelled')) {
      return "La operación fue cancelada.";
  }
  if (code.includes('unauthenticated')) {
      return "Tu sesión ha expirado. Por favor ingresa nuevamente.";
  }
  if (code.includes('network-request-failed')) {
      return "Error de red. Verifica tu conexión.";
  }
  
  return "Ocurrió un error inesperado. Intenta nuevamente.";
};

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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [currentView, setCurrentView] = useState<ViewState>(ViewState.LANDING);

  // DATA STATE
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [financialProfile, setFinancialProfile] = useState<FinancialProfile>(DEFAULT_PROFILE);
  const [tempEventContext, setTempEventContext] = useState<{id: string, name: string} | null>(null);
  const [showToast, setShowToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  // PRIVACY MODE STATE
  const [privacyMode, setPrivacyMode] = useState(false);

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

  // 1. AUTH LISTENER
  useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, 
        (user) => {
          setCurrentUser(user);
          if (user) {
              if (currentView === ViewState.LANDING) {
                  setCurrentView(ViewState.DASHBOARD);
              }
              triggerToast(`Conectado como ${user.email}`, 'success');
          } else {
              setCurrentView(ViewState.LANDING);
              setTransactions([]);
              setFinancialProfile(DEFAULT_PROFILE);
          }
          setAuthLoading(false);
        }, 
        (error) => {
          console.error("Auth Error:", error);
          setAuthLoading(false);
          const msg = getFriendlyErrorMessage(error);
          triggerToast(`Error de sesión: ${msg}`, 'error');
        }
      );
      return () => unsubscribe();
  }, []);

  // 2. FIRESTORE REALTIME LISTENER
  useEffect(() => {
      if (!currentUser) return;

      const userDocRef = doc(db, 'users', currentUser.uid);

      const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
              const data = docSnap.data() as { transactions?: Transaction[], profile?: FinancialProfile };
              if (data.transactions) setTransactions(data.transactions);
              if (data.profile) {
                  setFinancialProfile({ ...DEFAULT_PROFILE, ...data.profile });
              }
          } else {
              // Crear perfil inicial si no existe
              const initialProfile = { 
                  ...DEFAULT_PROFILE, 
                  name: currentUser.email?.split('@')[0] || 'Viajero' 
              };
              setDoc(userDocRef, {
                  profile: initialProfile,
                  transactions: []
              }).catch(err => {
                  console.error("Error creando perfil inicial:", err);
                  triggerToast(`Fallo al iniciar base de datos: ${getFriendlyErrorMessage(err)}`, 'error');
              });
              
              setFinancialProfile(initialProfile);
          }
      }, (error) => {
          console.error("Snapshot Error:", error);
          const msg = getFriendlyErrorMessage(error);
          triggerToast(`Sincronización pausada: ${msg}`, 'error');
      });

      return () => unsubscribeSnapshot();
  }, [currentUser]);

  // --- DATA HELPERS ---
  
  const saveToFirestore = async (newProfile: FinancialProfile, newTransactions: Transaction[]) => {
      if (!currentUser) {
          triggerToast("Debes iniciar sesión para guardar cambios", 'error');
          return;
      }
      
      // Actualización optimista local
      setFinancialProfile(newProfile);
      setTransactions(newTransactions);

      try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          
          // SANITIZACIÓN: Eliminar valores 'undefined' que causan error en Firestore
          const sanitize = (data: any) => JSON.parse(JSON.stringify(data));

          await setDoc(userDocRef, {
              profile: sanitize(newProfile),
              transactions: sanitize(newTransactions)
          }, { merge: true });
      } catch (e: any) {
          console.error("Error guardando en nube:", e);
          const friendlyMsg = getFriendlyErrorMessage(e);
          triggerToast(`No se pudo guardar: ${friendlyMsg}`, 'error');
          // Nota: En un sistema más complejo, aquí revertiríamos el estado local (rollback).
      }
  };

  const handleAddTransaction = (txOrTxs: Transaction | Transaction[]) => {
    const incoming = Array.isArray(txOrTxs) ? txOrTxs : [txOrTxs];
    const newTransactions = [...incoming, ...transactions];
    saveToFirestore(financialProfile, newTransactions);
    
    const message = incoming.length > 1 
        ? `${incoming.length} movimientos guardados` 
        : "Transacción guardada";
    
    triggerToast(message, 'success');
    
    // Regresar al Dashboard o Eventos directamente, saltando SuccessScreen
    if (tempEventContext) {
        setCurrentView(ViewState.EVENTS);
        setTempEventContext(null);
    } else {
        setCurrentView(ViewState.DASHBOARD);
    }
  };

  const handleUpdateProfile = (newProfile: FinancialProfile) => {
    saveToFirestore(newProfile, transactions);
  };
  
  const handleUpdateTransactions = (newTransactions: Transaction[]) => {
    saveToFirestore(financialProfile, newTransactions);
  };

  // Función combinada para actualizar ambos al mismo tiempo (usada en SubscriptionManager)
  const handleGlobalUpdate = (newProfile: FinancialProfile, newTransactions: Transaction[]) => {
      saveToFirestore(newProfile, newTransactions);
  };

  const handleImportData = (data: { profile: FinancialProfile, transactions: Transaction[] }) => {
    if (data.profile && data.transactions) {
       saveToFirestore(data.profile, data.transactions);
       triggerToast("Datos restaurados y sincronizados", 'success');
       setCurrentView(ViewState.DASHBOARD);
    } else {
       triggerToast("Archivo de respaldo inválido o corrupto", 'error');
    }
  };

  const handleAddEventTransaction = (eventId: string, eventName: string) => {
      setTempEventContext({ id: eventId, name: eventName });
      setCurrentView(ViewState.TRANSACTION);
  };

  const handleLoginSuccess = () => {
      // Auth listener handles redirection
  };

  const handleLogout = () => {
      // Logic handled in ProfileSetup
  };

  const triggerToast = (message: string, type: 'success' | 'error') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 4000); // Un poco más de tiempo para leer errores
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

    // FIX: El Balance ahora es SOLO el valor manual (Patrimonio Neto), desconectado del flujo de caja diario.
    const manualBalance = safeNum(financialProfile.initialBalance || 0);

    const salaryPaid = (financialProfile.incomeSources || []).reduce((sum, src) => sum + src.amount, 0);
    const totalReserved = (financialProfile.savingsBuckets || []).reduce((sum, bucket) => sum + bucket.currentAmount, 0);
    const fixedExpenses = (financialProfile.subscriptions || []).reduce((sum, sub) => sum + sub.amount, 0);
    const totalDebt = (financialProfile.debts || []).reduce((sum, d) => sum + (d.totalAmount - d.currentAmount), 0);

    const uniqueMonths = new Set(transactions.map(t => (t.date ? t.date.substring(0, 7) : ''))).size || 1;
    const avgMonthlyExpense = (expense / Math.max(1, uniqueMonths)) + fixedExpenses;
    
    // Liquid assets: Patrimonio Manual - Apartados
    const liquidAssets = manualBalance - totalReserved;
    
    let runway = 0;
    if (avgMonthlyExpense > 0) {
      runway = liquidAssets / avgMonthlyExpense;
    } else {
      runway = liquidAssets > 0 ? 99 : 0;
    }

    let score = 0;
    if (liquidAssets > 0) score += 20; 
    if (runway >= 6) score += 40; 
    else if (runway >= 3) score += 20; 
    else if (runway >= 1) score += 10;
    
    const totalMonthlyIncome = salaryPaid + (income / Math.max(1, uniqueMonths));
    const savingsRate = totalMonthlyIncome > 0 ? (totalMonthlyIncome - avgMonthlyExpense) / totalMonthlyIncome : 0;
    
    if (savingsRate >= 0.20) score += 40;
    else if (savingsRate >= 0.10) score += 20;

    if (totalDebt > liquidAssets) score -= 10;

    return {
      income: safeNum(income),
      expense: safeNum(expense),
      balance: manualBalance, // Return manual balance directly
      salaryPaid: safeNum(salaryPaid),
      totalReserved: safeNum(totalReserved),
      fixedExpenses: safeNum(fixedExpenses),
      totalDebt: safeNum(totalDebt),
      runway: safeNum(parseFloat(runway.toFixed(1))),
      healthScore: Math.min(100, Math.max(0, safeNum(score)))
    };
  }, [transactions, financialProfile]);


  const renderView = () => {
    if (authLoading) {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center bg-background-light dark:bg-background-dark text-slate-500">
                <span className="material-symbols-outlined animate-spin text-4xl">refresh</span>
            </div>
        );
    }

    switch (currentView) {
      case ViewState.LANDING:
        return <LandingPage onLogin={handleLoginSuccess} />;
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
            onOpenSalaryCalculator={() => setCurrentView(ViewState.SALARY_CALCULATOR)}
            onOpenCurrencyConverter={() => setCurrentView(ViewState.CURRENCY_CONVERTER)}
            onOpenWealthLevels={() => setCurrentView(ViewState.WEALTH_LEVELS)} 
            onOpenAchievements={() => setCurrentView(ViewState.ACHIEVEMENTS)} 
            onAddTransaction={() => {
                setTempEventContext(null);
                setCurrentView(ViewState.TRANSACTION);
            }}
            isDarkMode={darkMode}
            onToggleTheme={toggleTheme}
            privacyMode={privacyMode}
            onTogglePrivacy={() => setPrivacyMode(!privacyMode)}
            onUpdateProfile={handleUpdateProfile} // FIX: Pasar la función para actualizar
          />
        );
      case ViewState.ACHIEVEMENTS:
          return (
              <Achievements 
                  transactions={transactions}
                  profile={financialProfile}
                  metrics={metrics}
                  onBack={() => setCurrentView(ViewState.DASHBOARD)}
              />
          );
      case ViewState.WEALTH_LEVELS:
          return (
              <WealthLevel 
                  profile={financialProfile}
                  metrics={metrics}
                  onBack={() => setCurrentView(ViewState.DASHBOARD)}
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
      case ViewState.SALARY_CALCULATOR:
          return (
              <SalaryCalculator
                  profile={financialProfile}
                  transactions={transactions}
                  onBack={() => setCurrentView(ViewState.DASHBOARD)}
                  onUpdateProfile={handleUpdateProfile}
              />
          );
      case ViewState.CURRENCY_CONVERTER:
          return (
              <CurrencyConverter 
                  profile={financialProfile}
                  onUpdateProfile={handleUpdateProfile}
                  onBack={() => setCurrentView(ViewState.DASHBOARD)}
              />
          );
      case ViewState.ASSISTANT:
          return (
              <FinancialAssistant
                  profile={financialProfile}
                  transactions={transactions}
                  metrics={metrics}
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
            privacyMode={privacyMode}
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
        return (
            <SuccessScreen 
                onBack={() => setCurrentView(ViewState.DASHBOARD)} 
                metrics={metrics} 
            />
        );
      case ViewState.PROFILE:
        return (
          <ProfileSetup 
            currentProfile={financialProfile}
            allTransactions={transactions} 
            onSave={(p) => {
               handleUpdateProfile(p);
               setCurrentView(ViewState.DASHBOARD);
               triggerToast("Perfil actualizado", 'success');
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
            privacyMode={privacyMode}
          />
        );
      case ViewState.SAVINGS_BUCKETS:
        return (
          <SavingsBuckets 
            profile={financialProfile}
            totalBalance={metrics.balance}
            onUpdateProfile={handleUpdateProfile}
            onBack={() => setCurrentView(ViewState.DASHBOARD)}
            privacyMode={privacyMode}
          />
        );
      case ViewState.SUBSCRIPTIONS:
        return (
          <SubscriptionManager 
            profile={financialProfile}
            onUpdateProfile={handleUpdateProfile}
            onBack={() => setCurrentView(ViewState.DASHBOARD)}
            privacyMode={privacyMode}
          />
        );
      case ViewState.DEBTS:
        return (
          <DebtManager
            profile={financialProfile}
            totalBalance={metrics.balance}
            onUpdateProfile={handleUpdateProfile}
            onBack={() => setCurrentView(ViewState.DASHBOARD)}
            privacyMode={privacyMode}
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
        return null;
    }
  };

  const showNavigation = currentView !== ViewState.SUCCESS && 
                         currentView !== ViewState.LANDING && 
                         !authLoading;

  return (
    // Use 100dvh for better mobile browser support
    <div className="relative min-h-[100dvh] bg-background-light dark:bg-background-dark transition-colors duration-300">
      
      {/* Increased padding bottom to avoid overlap with floating nav */}
      <div className="pb-32"> 
        {renderView()}
      </div>

      {/* TOAST NOTIFICATION SYSTEM */}
      <div className={`fixed top-4 left-1/2 -translate-x-1/2 px-5 py-3 rounded-full shadow-2xl transition-all duration-500 z-[120] flex items-center gap-3 w-[90%] max-w-sm justify-center ${
        showToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'
      } ${showToast?.type === 'error' ? 'bg-red-500 text-white' : 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white'}`}>
        <span className="material-symbols-outlined text-[20px]">
          {showToast?.type === 'error' ? 'error' : 'check_circle'}
        </span>
        <span className="font-bold text-sm truncate">{showToast?.message}</span>
      </div>

      {/* Navegación Flotante */}
      {showNavigation && (
        <>
            {/* AI Assistant FAB */}
            <button 
                onClick={() => setCurrentView(ViewState.ASSISTANT)}
                className="fixed bottom-24 right-4 z-[100] size-14 bg-gradient-to-tr from-blue-600 to-purple-600 text-white rounded-full shadow-xl shadow-blue-500/30 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 animate-bounce-slow"
                style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
            >
                <span className="material-symbols-outlined text-[28px]">auto_awesome</span>
            </button>

            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/20 dark:border-slate-700/50 rounded-full shadow-2xl p-1.5 flex justify-between items-center ring-1 ring-black/5 dark:ring-white/5">
                    <NavButton 
                    active={currentView === ViewState.DASHBOARD} 
                    onClick={() => setCurrentView(ViewState.DASHBOARD)} 
                    icon="dashboard" 
                    label="Panel" 
                    />
                    <NavButton 
                    active={false} 
                    onClick={() => setCurrentView(ViewState.TRANSACTION)} 
                    icon="add" 
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
        </>
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
    className={`flex flex-col items-center justify-center w-full py-2 gap-0.5 transition-all duration-200 rounded-full ${
      active 
        ? 'text-primary' 
        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
    }`}
  >
    <div className={`flex items-center justify-center rounded-full transition-all ${
      highlight 
        ? 'bg-primary text-white size-12 shadow-lg shadow-primary/40 -mt-6 border-4 border-background-light dark:border-background-dark' 
        : active ? 'bg-primary/10 size-9' : 'size-7'
    }`}>
      <span className={`material-symbols-outlined ${highlight ? 'text-[28px]' : 'text-[22px]'} ${active && !highlight ? 'filled' : ''}`}>{icon}</span>
    </div>
    {!highlight && <span className="text-[10px] font-bold tracking-wide opacity-90">{label}</span>}
  </button>
);

export default App;
