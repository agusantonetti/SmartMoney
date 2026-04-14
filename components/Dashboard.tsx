
import React, { useMemo, useState, useEffect } from 'react';
import { FinancialMetrics, Transaction, FinancialProfile, Subscription } from '../types';
import { formatMoney, formatMoneyUSD, getDollarRate, getSalaryForMonth } from '../utils';

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
  onOpenMonthComparator?: () => void;
  onOpenFinancialXRay?: () => void;
  onOpenPatrimonio?: () => void;
  onOpenAutoPilot?: () => void;
  onOpenGoals?: () => void;
  onOpenReport?: () => void;
  onOpenMonthlyClose?: () => void;
  onOpenYearReview?: () => void;
  onOpenIncomeDashboard?: () => void;
  onOpenSubscriptionDashboard?: () => void;
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
  onOpenWealthLevels,
  onOpenAchievements,
  onOpenMonthComparator,
  onOpenFinancialXRay,
  onOpenPatrimonio,
  onOpenAutoPilot,
  onOpenGoals,
  onOpenReport,
  onOpenMonthlyClose,
  onOpenYearReview,
  onOpenIncomeDashboard,
  onOpenSubscriptionDashboard,
  onAddTransaction, 
  isDarkMode, 
  onToggleTheme,
  privacyMode,
  onTogglePrivacy,
  onUpdateProfile
}) => {
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [isEditingApps, setIsEditingApps] = useState(false);
  const [tempRate, setTempRate] = useState(profile.customDollarRate?.toString() || "1130");

  useEffect(() => {
      setTempRate(profile.customDollarRate?.toString() || "1130");
  }, [profile.customDollarRate]);

  const handleRateBlur = () => {
      setIsEditingRate(false);
      const newRate = parseFloat(tempRate);
      if (newRate > 0 && onUpdateProfile) {
          onUpdateProfile({ ...profile, customDollarRate: newRate });
      } else {
          setTempRate(profile.customDollarRate?.toString() || "1130");
      }
  };

  const currentDollarRate = parseFloat(tempRate) || 1130;

  const defaultAvatar = "https://lh3.googleusercontent.com/aida-public/AB6AXuD3W_-QV28bpv6tswBdb3gVXfvQ9Sd1qa2FIGrEXSr2QQhwgjBocZveQ_iZ7J4KEKay2_eW-X1e_D_YgmIkcA8CzxI9m9DrfSKITYEyZh1QbS_cU-ikAMnjc7jppiRpUtx2MU_e_8F4iEoxnnZDfqR5h0oOSuSVTm6ylZNFaJtmmBRyWTnZFGJLM0cmMDBGgzzyJBlAtbXeWNN-cYcN-zQt3qUI1cKXVPswGJB4Tmr449006R1-PDELmsW7e06pa1WY4URePcx_rEcX";

  // --- CÁLCULOS COMPARATIVOS (MES ACTUAL VS ANTERIOR) ---
  const stats = useMemo(() => {
      const now = new Date();
      const currentMonthKey = now.toISOString().slice(0, 7); // YYYY-MM
      
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthKey = prevDate.toISOString().slice(0, 7);

      // Helper para calcular ingreso de contratos por mes (Variable + Fijo)
      const getContractIncomeForMonth = (monthKey: string) => {
          return (profile.incomeSources || []).reduce((sum, src) => {
              // Validar vigencia
              if (src.isActive === false) return sum;
              if (src.startDate && src.startDate > monthKey + '-31') return sum;
              if (src.endDate && src.endDate < monthKey + '-01') return sum;

              let val = 0;
              if (src.isCreatorSource) {
                  // Variables: Sumar pagos registrados en ese mes específico
                  const monthPayments = src.payments?.filter(p => p.month.startsWith(monthKey)) || [];
                  val = monthPayments.reduce((acc, p) => acc + p.realAmount, 0);
              } else {
                  // Fijos: Monto base
                  val = src.amount;
                  if (src.frequency === 'BIWEEKLY') val = val * 2;
                  if (src.frequency === 'ONE_TIME') val = 0; 
              }

              if (src.currency === 'USD') {
                  val = val * currentDollarRate;
              }
              return sum + val;
          }, 0);
      };

      const currentContractIncome = getContractIncomeForMonth(currentMonthKey);
      const prevContractIncome = getContractIncomeForMonth(prevMonthKey);

      // 1. Clasificar transacciones por periodo
      let currentIncomeVar = 0;
      let currentExpenseVar = 0;
      let prevIncomeVar = 0;
      let prevExpenseVar = 0;
      
      let pastIncomeTotal = 0;
      let pastExpenseTotal = 0;

      transactions.forEach(t => {
          const tDate = t.date;
          if (tDate.startsWith(currentMonthKey)) {
              if (t.type === 'income') currentIncomeVar += t.amount;
              else currentExpenseVar += t.amount;
          } else if (tDate.startsWith(prevMonthKey)) {
              if (t.type === 'income') prevIncomeVar += t.amount;
              else prevExpenseVar += t.amount;
              // Acumular para el balance histórico (cierre del mes pasado)
              pastIncomeTotal += (t.type === 'income' ? t.amount : 0);
              pastExpenseTotal += (t.type === 'expense' ? t.amount : 0);
          } else if (tDate < currentMonthKey) {
              // Más antiguos
              pastIncomeTotal += (t.type === 'income' ? t.amount : 0);
              pastExpenseTotal += (t.type === 'expense' ? t.amount : 0);
          }
      });

      // 2. Totales Mensuales
      const totalCurrentIncome = currentContractIncome + currentIncomeVar;
      const totalCurrentExpense = currentExpenseVar; // Solo transacciones reales
      const totalNetMonthly = totalCurrentIncome - totalCurrentExpense;

      const totalPrevIncome = prevContractIncome + prevIncomeVar;
      const totalPrevExpense = prevExpenseVar; // Solo transacciones reales anteriores

      // 3. Balance Historico (Al cierre del mes anterior)
      const prevBalance = (profile.initialBalance || 0) + pastIncomeTotal - pastExpenseTotal;

      // 4. Cálculo de Porcentajes
      const calcPct = (curr: number, prev: number) => {
          if (prev === 0) return curr === 0 ? 0 : 100;
          return ((curr - prev) / prev) * 100;
      };

      return {
          currentVariableExpenses: currentExpenseVar,
          totalMonthlyOutflow: totalCurrentExpense,
          totalMonthlyIncome: totalCurrentIncome,
          currentIncome: currentIncomeVar,
          netMonthly: totalNetMonthly,
          // Comparativas
          prevBalance,
          balancePct: calcPct(metrics.balance, prevBalance),
          prevIncome: totalPrevIncome,
          incomePct: calcPct(totalCurrentIncome, totalPrevIncome),
          prevExpense: totalPrevExpense,
          expensePct: calcPct(totalCurrentExpense, totalPrevExpense)
      };
  }, [transactions, metrics, profile.initialBalance, profile.incomeSources, currentDollarRate]);

  // --- ALERTAS DE SUSCRIPCIÓN ---
  const subscriptionAlerts = useMemo(() => {
      const alerts: { sub: Subscription, daysLeft: number }[] = [];
      const now = new Date();
      now.setHours(0,0,0,0);

      (profile.subscriptions || []).forEach(sub => {
          let targetDate = new Date();
          
          if (sub.nextPaymentDate) {
              targetDate = new Date(sub.nextPaymentDate + 'T00:00:00');
          } else {
              targetDate.setDate(sub.billingDay);
              if (targetDate < now) {
                  targetDate.setMonth(targetDate.getMonth() + 1);
              }
          }
          targetDate.setHours(0,0,0,0);

          const diffTime = targetDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays >= 0 && diffDays <= 3) {
              alerts.push({ sub, daysLeft: diffDays });
          }
      });
      return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [profile.subscriptions]);

  const activeEventsCount = profile.events?.filter(e => e.status === 'active').length || 0;

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

  const wealthLevel = getWealthLevel(metrics.balance, currentDollarRate);
  const balanceUSD = metrics.balance / currentDollarRate;

  // --- INSIGHTS INTELIGENTES ---
  const insights = useMemo(() => {
      const cards: { id: string, icon: string, text: string, color: string, action?: () => void }[] = [];
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

      const currentExpenses = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonthKey));
      const prevExpenses = transactions.filter(t => t.type === 'expense' && t.date.startsWith(prevMonthKey));

      // 1. Balance mensual
      if (stats.netMonthly > 0) {
          cards.push({ id: 'net-positive', icon: 'trending_up', text: `Balance positivo este mes: te sobran ${formatMoney(stats.netMonthly)}`, color: 'emerald' });
      } else if (stats.netMonthly < 0 && stats.totalMonthlyIncome > 0) {
          cards.push({ id: 'net-negative', icon: 'warning', text: `Gastaste ${formatMoney(Math.abs(stats.netMonthly))} más de lo que ingresaste este mes`, color: 'red' });
      }

      // 2. Categorías que subieron mucho vs mes anterior
      const currentByCategory: Record<string, number> = {};
      const prevByCategory: Record<string, number> = {};
      currentExpenses.forEach(t => { currentByCategory[t.category] = (currentByCategory[t.category] || 0) + t.amount; });
      prevExpenses.forEach(t => { prevByCategory[t.category] = (prevByCategory[t.category] || 0) + t.amount; });

      Object.keys(currentByCategory).forEach(cat => {
          if (cat === 'Otros' || cat === 'Ingreso') return;
          const curr = currentByCategory[cat];
          const prev = prevByCategory[cat] || 0;
          if (prev > 0 && curr > prev * 1.3 && curr > 5000) {
              const pct = Math.round(((curr - prev) / prev) * 100);
              cards.push({ id: `cat-up-${cat}`, icon: 'trending_up', text: `${cat}: gastaste ${pct}% más que el mes pasado (${formatMoney(curr)} vs ${formatMoney(prev)})`, color: 'amber' });
          }
      });

      // 3. Categoría top del mes
      const topCategory = Object.entries(currentByCategory).sort((a, b) => b[1] - a[1])[0];
      if (topCategory && topCategory[1] > 0) {
          const totalExp = currentExpenses.reduce((a, t) => a + t.amount, 0);
          const pct = Math.round((topCategory[1] / totalExp) * 100);
          if (pct > 40) {
              cards.push({ id: 'top-cat', icon: 'pie_chart', text: `${topCategory[0]} representa el ${pct}% de tus gastos este mes`, color: 'blue' });
          }
      }

      // 4. Suscripciones próximas a vencer (mostrar las que vencen en 3 días)
      subscriptionAlerts.forEach(alert => {
          const dayText = alert.daysLeft === 0 ? 'hoy' : alert.daysLeft === 1 ? 'mañana' : `en ${alert.daysLeft} días`;
          cards.push({ id: `sub-${alert.sub.id}`, icon: 'event_upcoming', text: `${alert.sub.name} vence ${dayText} — ${formatMoney(alert.sub.amount)}`, color: 'purple', action: onOpenSubscriptions });
      });

      // 5. Gastos sin categoría
      const otrosCount = currentExpenses.filter(t => t.category === 'Otros').length;
      if (otrosCount > 0) {
          cards.push({ id: 'otros', icon: 'help_center', text: `Tenés ${otrosCount} gasto${otrosCount > 1 ? 's' : ''} sin categoría este mes — reclasificalos en Analíticas`, color: 'amber', action: onOpenAnalytics });
      }

      // 6. Racha de meses positivos
      let streak = 0;
      for (let i = 0; i < 12; i++) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const monthIncome = getSalaryForMonth(profile, mk, currentDollarRate);
          const monthExpense = transactions.filter(t => t.type === 'expense' && t.date.startsWith(mk)).reduce((a, t) => a + t.amount, 0);
          if (monthIncome > monthExpense && monthIncome > 0) streak++;
          else break;
      }
      if (streak >= 2) {
          cards.push({ id: 'streak', icon: 'local_fire_department', text: `Racha de ${streak} meses con balance positivo`, color: 'emerald' });
      }

      // 7. Sin movimientos este mes
      if (currentExpenses.length === 0 && stats.totalMonthlyIncome === 0) {
          cards.push({ id: 'empty', icon: 'edit_note', text: `No registraste movimientos este mes — cargá tus gastos para ver tu resumen`, color: 'gray' });
      }

      // 8. Expense velocity - compare pace vs last month
      if (prevExpenses.length > 0 && currentExpenses.length > 0) {
          const dayOfMonth = now.getDate();
          const prevByDay = prevExpenses.filter(t => parseInt(t.date.split('-')[2]) <= dayOfMonth);
          const prevPace = prevByDay.reduce((a, t) => a + t.amount, 0);
          const currPace = currentExpenses.reduce((a, t) => a + t.amount, 0);
          if (prevPace > 0) {
              const velocityPct = Math.round(((currPace - prevPace) / prevPace) * 100);
              if (velocityPct > 20) {
                  cards.push({ id: 'velocity-high', icon: 'speed', text: `Estás gastando un ${velocityPct}% más rápido que el mes pasado al día ${dayOfMonth}`, color: 'red' });
              } else if (velocityPct < -15) {
                  cards.push({ id: 'velocity-low', icon: 'speed', text: `Estás gastando un ${Math.abs(velocityPct)}% menos que el mes pasado — buen ritmo`, color: 'emerald' });
              }
          }
      }

      // 9. Income concentration risk
      const activeSources = (profile.incomeSources || []).filter(s => s.isActive !== false);
      if (activeSources.length >= 2 && stats.totalMonthlyIncome > 0) {
          const sourceIncomes = activeSources.map(src => {
              const mode = src.incomeMode || (src.isCreatorSource ? 'VARIABLE' : 'FIXED');
              let val = 0;
              if (mode === 'VARIABLE') {
                  val = src.payments?.filter(p => p.month.startsWith(currentMonthKey)).reduce((a, p) => a + p.realAmount, 0) || 0;
              } else if (mode === 'PER_DELIVERY') {
                  val = (src.posts || []).filter(p => p.isPaid).reduce((a, p) => a + p.amount, 0);
              } else {
                  val = src.amount; if (src.frequency === 'BIWEEKLY') val *= 2;
              }
              if (src.currency === 'USD') val *= currentDollarRate;
              return { name: src.name, amount: val };
          }).sort((a, b) => b.amount - a.amount);
          const topPct = sourceIncomes[0] && stats.totalMonthlyIncome > 0 ? (sourceIncomes[0].amount / stats.totalMonthlyIncome) * 100 : 0;
          if (topPct > 55) {
              cards.push({ id: 'concentration', icon: 'warning', text: `El ${Math.round(topPct)}% de tu ingreso depende de ${sourceIncomes[0].name} — diversificar reduciría tu riesgo`, color: 'amber', action: onOpenIncomeDashboard });
          }
      }

      // 10. Personal inflation indicator
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const threeMonthsKey = `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}`;
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      const sixMonthsKey = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}`;

      // Compare top categories vs 3 months ago
      Object.keys(currentByCategory).forEach(cat => {
          if (cat === 'Otros' || cat === 'Ingreso') return;
          const curr = currentByCategory[cat];
          // Get 3 months ago spending
          const m3Txs = transactions.filter(t => t.type === 'expense' && t.date.startsWith(threeMonthsKey) && t.category === cat);
          const m3Total = m3Txs.reduce((a, t) => a + t.amount, 0);
          if (m3Total > 0 && curr > 0) {
              const inflPct = Math.round(((curr - m3Total) / m3Total) * 100);
              if (inflPct > 30 && curr > 10000) {
                  cards.push({ id: `inflation-${cat}`, icon: 'local_fire_department', text: `Tu ${cat} subió ${inflPct}% en 3 meses (${formatMoney(m3Total)} → ${formatMoney(curr)})`, color: 'red', action: onOpenAnalytics });
              }
          }
      });

      return cards;
  }, [transactions, stats, subscriptionAlerts, metrics]);

  // --- MINI TREND CHART DATA (últimos 6 meses) ---
  const trendData = useMemo(() => {
    const months: { key: string, label: string, expense: number, income: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
      const monthTxs = transactions.filter(t => t.date.startsWith(key));
      months.push({
        key,
        label,
        expense: monthTxs.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0),
        income: getSalaryForMonth(profile, key, currentDollarRate),
      });
    }
    const maxVal = Math.max(...months.map(m => Math.max(m.expense, m.income)), 1);
    return { months, maxVal };
  }, [transactions, profile, currentDollarRate]);

  // --- TOOLTIP COMPONENT ---
  const TooltipContent = ({ label, amount, percent, inverse = false }: { label: string, amount: number, percent: number, inverse?: boolean }) => {
      const isPositiveGood = !inverse;
      const colorClass = percent === 0 ? 'text-slate-400' : (percent > 0 ? (isPositiveGood ? 'text-emerald-400' : 'text-red-400') : (isPositiveGood ? 'text-red-400' : 'text-emerald-400'));
      
      return (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 bg-slate-900/95 backdrop-blur-xl text-white p-3 rounded-xl shadow-xl border border-white/10 z-50 w-max opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none scale-95 group-hover:scale-100 origin-top">
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900/95 border-l border-t border-white/10 rotate-45"></div>
            <p className="text-slate-400 mb-1 font-bold uppercase text-[9px] tracking-wider">{label}</p>
            <div className="flex items-center gap-3">
                <span className="font-bold text-sm">{formatMoney(amount)}</span>
                <span className={`text-xs font-bold bg-white/5 px-1.5 py-0.5 rounded ${colorClass}`}>
                    {percent > 0 ? '+' : ''}{percent.toFixed(1)}%
                </span>
            </div>
        </div>
      );
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col overflow-x-hidden transition-colors duration-300">
      {/* Top Navigation - ADJUSTED FOR IOS SAFE AREA */}
      <header className="sticky top-0 z-50 w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-white/30 dark:border-slate-700/40 transition-colors duration-300 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3">
        <div className="px-4 md:px-8 flex items-center justify-between max-w-[1440px] mx-auto w-full">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </div>
            <h2 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight hidden xs:block">Smart Money</h2>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            
            {/* NOTIFICATION BELL */}
            <div className="relative">
                <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="size-9 md:size-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
                >
                    <span className="material-symbols-outlined text-[22px]">notifications</span>
                    {subscriptionAlerts.length > 0 && (
                        <span className="absolute top-2 right-2 size-2.5 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                    )}
                </button>

                {/* Dropdown */}
                {showNotifications && (
                    <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-[fadeIn_0.1s_ease-out]">
                        <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <span className="text-xs font-bold uppercase text-slate-500">Alertas de Pago</span>
                            <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {subscriptionAlerts.length === 0 ? (
                                <div className="p-6 text-center text-slate-400 text-sm">
                                    <span className="material-symbols-outlined text-2xl mb-1 block">check_circle</span>
                                    No hay pagos próximos (3 días).
                                </div>
                            ) : (
                                subscriptionAlerts.map((alert, idx) => (
                                    <div 
                                        key={idx} 
                                        className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                                        onClick={() => {
                                            setShowNotifications(false);
                                            onOpenSubscriptions();
                                        }}
                                    >
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{alert.sub.name}</h4>
                                            <span className="text-xs font-bold text-red-500">{alert.daysLeft === 0 ? 'HOY' : `${alert.daysLeft}d`}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Vence pronto • {formatMoney(alert.sub.amount)}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

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
          <section className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-blue-950/90 dark:via-slate-900/95 dark:to-slate-950 rounded-[2rem] p-6 md:p-10 text-white shadow-xl shadow-slate-300/50 dark:shadow-none relative overflow-hidden group backdrop-blur-sm">
               <div className="absolute top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-white/10 transition-colors duration-700"></div>
               
               <div className="relative z-10 flex flex-col gap-6">
                  {/* CONFIGURACIÓN DÓLAR REF */}
                  <div className="absolute top-0 right-0 flex items-center gap-2">
                      {isEditingRate ? (
                          <div className="flex items-center bg-black/40 rounded-full px-2 py-1 backdrop-blur-sm border border-white/20">
                              <span className="text-xs font-bold text-white mr-1">$</span>
                              <input 
                                  type="number" 
                                  value={tempRate}
                                  onChange={(e) => setTempRate(e.target.value)}
                                  onBlur={handleRateBlur}
                                  onKeyDown={(e) => e.key === 'Enter' && handleRateBlur()}
                                  className="w-16 bg-transparent outline-none text-xs font-bold text-white placeholder-white/50"
                                  autoFocus
                              />
                          </div>
                      ) : (
                          <button 
                              onClick={() => setIsEditingRate(true)}
                              className="text-[10px] font-bold text-white/50 bg-white/10 hover:bg-white/20 px-2 py-1 rounded-full transition-colors backdrop-blur-sm flex items-center gap-1"
                          >
                              1 USD = ${currentDollarRate}
                              <span className="material-symbols-outlined text-[10px]">edit</span>
                          </button>
                      )}
                  </div>

                  {/* Balance Principal */}
                  <div className="flex flex-col gap-1 group relative w-fit">
                      <div className="flex items-center gap-2 mb-1 opacity-80 cursor-help">
                          <span className="material-symbols-outlined text-sm">account_balance</span>
                          <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Patrimonio Neto</p>
                      </div>
                      <div className={`transition-all duration-300 flex flex-col md:flex-row md:items-baseline gap-1 md:gap-4 ${privacyMode ? 'blur-md select-none opacity-50' : ''}`}>
                          <h1 className="text-4xl xs:text-5xl md:text-7xl font-black tracking-tight leading-none cursor-default">
                              {formatMoney(metrics.balance)}
                          </h1>
                          <span className="text-lg md:text-2xl font-bold text-slate-400">
                              ≈ {formatMoneyUSD(balanceUSD)}
                          </span>
                      </div>
                      
                      {/* TOOLTIP BALANCE */}
                      {!privacyMode && <TooltipContent label="Mes Anterior" amount={stats.prevBalance} percent={stats.balancePct} />}

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

                  {/* Fila Inferior: Métricas Mensuales */}
                  <div className="grid grid-cols-3 gap-2 md:gap-4 bg-white/5 backdrop-blur-md rounded-2xl p-3 md:p-4 border border-white/10">
                      <div onClick={onOpenIncomeDashboard} className="cursor-pointer hover:bg-white/5 rounded-xl p-1 md:p-2 transition-colors text-center md:text-left group relative">
                          <p className="text-[10px] uppercase font-bold text-emerald-400 mb-0.5">Ganado</p>
                          <div className={`${privacyMode ? 'blur-sm' : ''}`}>
                              <p className="text-sm md:text-xl font-bold truncate">{formatMoney(stats.totalMonthlyIncome)}</p>
                              <p className="text-[10px] text-slate-400 font-medium font-mono">(US$ {Math.round(stats.totalMonthlyIncome / currentDollarRate)})</p>
                          </div>
                          {!privacyMode && <TooltipContent label="Mes Anterior" amount={stats.prevIncome} percent={stats.incomePct} />}
                      </div>
                      <div onClick={onOpenBudget} className="cursor-pointer hover:bg-white/5 rounded-xl p-1 md:p-2 transition-colors border-l border-white/10 text-center md:text-left group relative">
                          <p className="text-[10px] uppercase font-bold text-red-400 mb-0.5">Gastado</p>
                          <div className={`${privacyMode ? 'blur-sm' : ''}`}>
                              <p className="text-sm md:text-xl font-bold truncate">{formatMoney(stats.totalMonthlyOutflow)}</p>
                              <p className="text-[10px] text-slate-400 font-medium font-mono">(US$ {Math.round(stats.totalMonthlyOutflow / currentDollarRate)})</p>
                          </div>
                          {!privacyMode && <TooltipContent label="Mes Anterior" amount={stats.prevExpense} percent={stats.expensePct} inverse={true} />}
                      </div>
                      <div onClick={onOpenAnalytics} className="cursor-pointer hover:bg-white/5 rounded-xl p-1 md:p-2 transition-colors border-l border-white/10 text-center md:text-left">
                          <p className="text-[10px] uppercase font-bold text-blue-400 mb-0.5">Neto</p>
                          <div className={`${privacyMode ? 'blur-sm' : ''}`}>
                              <p className={`text-sm md:text-xl font-bold truncate ${stats.netMonthly < 0 ? 'text-red-300' : ''}`}>{formatMoney(stats.netMonthly)}</p>
                              <p className="text-[10px] text-slate-400 font-medium font-mono">(US$ {Math.round(stats.netMonthly / currentDollarRate)})</p>
                          </div>
                      </div>
                  </div>
               </div>
          </section>

          {/* 1.5 MINI TREND CHART */}
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">show_chart</span>
                      Últimos 6 meses
                  </span>
                  <button onClick={onOpenMonthComparator} className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5">
                      Comparar
                      <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                  </button>
              </div>
              <div className="flex items-end justify-between gap-1.5 h-20">
                  {trendData.months.map((m, i) => {
                      const expH = (m.expense / trendData.maxVal) * 100;
                      const incH = (m.income / trendData.maxVal) * 100;
                      const isCurrentMonth = i === trendData.months.length - 1;
                      return (
                          <div key={m.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                              <div className="w-full flex justify-center gap-0.5 items-end flex-1">
                                  <div 
                                      className={`w-2 rounded-t-sm transition-all duration-500 ${isCurrentMonth ? 'bg-emerald-500' : 'bg-emerald-300 dark:bg-emerald-700'}`}
                                      style={{ height: `${Math.max(2, incH)}%` }}
                                  />
                                  <div 
                                      className={`w-2 rounded-t-sm transition-all duration-500 ${isCurrentMonth ? 'bg-red-500' : 'bg-red-300 dark:bg-red-700'}`}
                                      style={{ height: `${Math.max(2, expH)}%` }}
                                  />
                              </div>
                              <span className={`text-[9px] font-bold ${isCurrentMonth ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{m.label}</span>
                          </div>
                      );
                  })}
              </div>
              <div className="flex items-center justify-center gap-4 mt-2">
                  <span className="flex items-center gap-1 text-[9px] text-slate-400"><span className="size-1.5 rounded-full bg-emerald-500 inline-block" /> Ingresos</span>
                  <span className="flex items-center gap-1 text-[9px] text-slate-400"><span className="size-1.5 rounded-full bg-red-500 inline-block" /> Gastos</span>
              </div>
          </div>

          {/* 1.5 COLLECTION STATUS */}
          {(() => {
              const activeSources = (profile.incomeSources || []).filter(s => s.isActive !== false);
              if (activeSources.length === 0) return null;
              const now = new Date();
              const pfx = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
              let totalSources = 0;
              let paidSources = 0;
              let totalDeliveries = 0;
              let doneDeliveries = 0;
              activeSources.forEach(src => {
                  const mode = src.incomeMode || (src.isCreatorSource ? 'VARIABLE' : 'FIXED');
                  if (mode === 'PER_DELIVERY') {
                      const paid = (src.posts || []).filter(p => p.isPaid).length;
                      if (paid > 0) paidSources++;
                      totalSources++;
                  } else {
                      const hasPaid = src.payments?.some(p => p.month.startsWith(pfx) && p.isPaid);
                      if (hasPaid) paidSources++;
                      totalSources++;
                  }
                  if (src.targetPosts && src.targetPosts > 0) {
                      const mp = src.payments?.find(p => p.month.startsWith(pfx));
                      totalDeliveries += src.targetPosts;
                      doneDeliveries += mp?.postsCompleted || 0;
                  }
              });
              const pct = totalSources > 0 ? (paidSources / totalSources) * 100 : 0;
              return (
                  <div onClick={onOpenIncomeDashboard} className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-emerald-500">payments</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cobranza del Mes</span>
                          </div>
                          <span className={`text-xs font-black ${pct === 100 ? 'text-emerald-500' : pct > 0 ? 'text-amber-500' : 'text-slate-400'}`}>{paidSources}/{totalSources}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-2">
                          <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">
                              {paidSources === totalSources ? '¡Todo cobrado!' : `${totalSources - paidSources} pendiente${totalSources - paidSources > 1 ? 's' : ''}`}
                          </span>
                          {totalDeliveries > 0 && (
                              <span className={`text-[10px] font-bold ${doneDeliveries >= totalDeliveries ? 'text-emerald-500' : 'text-indigo-500'}`}>
                                  Entregas: {doneDeliveries}/{totalDeliveries}
                              </span>
                          )}
                      </div>
                  </div>
              );
          })()}

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

          {/* 2.5 INSIGHTS INTELIGENTES */}
          {insights.length > 0 && (
              <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                      Insights
                  </h3>
                  <div className="space-y-2">
                      {insights.map(insight => {
                          const colorMap: Record<string, { bg: string, border: string, icon: string, text: string }> = {
                              emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', icon: 'text-emerald-500', text: 'text-emerald-800 dark:text-emerald-300' },
                              red: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', icon: 'text-red-500', text: 'text-red-800 dark:text-red-300' },
                              amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', icon: 'text-amber-500', text: 'text-amber-800 dark:text-amber-300' },
                              blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', icon: 'text-blue-500', text: 'text-blue-800 dark:text-blue-300' },
                              purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', icon: 'text-purple-500', text: 'text-purple-800 dark:text-purple-300' },
                              gray: { bg: 'bg-slate-50 dark:bg-slate-800/50', border: 'border-slate-200 dark:border-slate-700', icon: 'text-slate-400', text: 'text-slate-600 dark:text-slate-300' },
                          };
                          const c = colorMap[insight.color] || colorMap.gray;

                          return (
                              <button
                                  key={insight.id}
                                  onClick={insight.action}
                                  className={`w-full flex items-center gap-3 p-3 rounded-xl border backdrop-blur-lg ${c.bg} ${c.border} transition-all ${insight.action ? 'hover:scale-[1.01] active:scale-[0.99] cursor-pointer' : 'cursor-default'}`}
                              >
                                  <span className={`material-symbols-outlined text-[20px] ${c.icon} shrink-0`}>{insight.icon}</span>
                                  <p className={`text-xs font-medium text-left leading-snug ${c.text}`}>{insight.text}</p>
                                  {insight.action && <span className="material-symbols-outlined text-[16px] text-slate-300 dark:text-slate-600 shrink-0 ml-auto">chevron_right</span>}
                              </button>
                          );
                      })}
                  </div>
              </div>
          )}

          {/* 3. APP LAUNCHER GRID */}
          {(() => {
              const allApps = [
                  { id: 'ingresos', title: 'Ingresos', subtitle: 'Dashboard', icon: 'trending_up', color: 'blue', onClick: onOpenIncomeDashboard },
                  { id: 'contratos', title: 'Contratos', subtitle: 'Gestión', icon: 'payments', color: 'sky', onClick: onOpenIncomeManager },
                  { id: 'suscripciones', title: 'Suscripciones', subtitle: 'Dashboard', icon: 'subscriptions', color: 'indigo', onClick: onOpenSubscriptionDashboard },
                  { id: 'gastos-fijos', title: 'Gastos Fijos', subtitle: `Total: ${formatMoney(metrics.fixedExpenses)}`, icon: 'home_work', color: 'violet', onClick: onOpenSubscriptions, showPrivacy: true },
                  { id: 'presupuesto', title: 'Presupuesto', subtitle: 'Tu plata mensual', icon: 'account_balance', color: 'teal', onClick: onOpenBudget },
                  { id: 'apartados', title: 'Apartados', subtitle: `${formatMoney(metrics.totalReserved)}`, icon: 'savings', color: 'purple', onClick: onOpenSavingsBuckets, showPrivacy: true },
                  { id: 'eventos', title: 'Eventos', subtitle: `${activeEventsCount} Activos`, icon: 'flight_takeoff', color: 'pink', onClick: onOpenEvents },
                  { id: 'deudas', title: 'Deudas', subtitle: `${formatMoney(metrics.totalDebt)}`, icon: 'gavel', color: 'red', onClick: onOpenDebts, showPrivacy: true },
                  { id: 'analiticas', title: 'Analíticas', subtitle: 'Gráficos', icon: 'bar_chart', color: 'orange', onClick: onOpenAnalytics },
                  { id: 'comparar', title: 'Comparar', subtitle: 'Mes vs Mes', icon: 'compare_arrows', color: 'cyan', onClick: onOpenMonthComparator },
                  { id: 'radiografia', title: 'Radiografía', subtitle: 'Foto completa', icon: 'monitoring', color: 'amber', onClick: onOpenFinancialXRay },
                  { id: 'patrimonio', title: 'Patrimonio', subtitle: 'Tu crecimiento', icon: 'diamond', color: 'purple', onClick: onOpenPatrimonio },
                  { id: 'piloto', title: 'Piloto Auto', subtitle: 'Proyección', icon: 'rocket_launch', color: 'emerald', onClick: onOpenAutoPilot },
                  { id: 'metas', title: 'Mis Metas', subtitle: 'Objetivos', icon: 'flag', color: 'pink', onClick: onOpenGoals },
                  { id: 'reporte', title: 'Reporte PDF', subtitle: 'Descargar', icon: 'picture_as_pdf', color: 'red', onClick: onOpenReport },
                  { id: 'cierre', title: 'Cierre Mensual', subtitle: 'Paso a paso', icon: 'fact_check', color: 'teal', onClick: onOpenMonthlyClose },
                  { id: 'year-review', title: 'Año en Review', subtitle: new Date().getFullYear().toString(), icon: 'auto_awesome', color: 'amber', onClick: onOpenYearReview },
                  { id: 'simulador', title: 'Simulador', subtitle: 'Escenarios', icon: 'timeline', color: 'violet', onClick: onOpenFuture },
                  { id: 'costo-vida', title: 'Costo Vida', subtitle: 'Calculadora', icon: 'price_check', color: 'emerald', onClick: onOpenSalaryCalculator },
              ];

              // Ordenar según el orden guardado del usuario
              const savedOrder = profile.appOrder || [];
              const orderedApps = savedOrder.length > 0
                  ? [...allApps].sort((a, b) => {
                      const idxA = savedOrder.indexOf(a.id);
                      const idxB = savedOrder.indexOf(b.id);
                      if (idxA === -1 && idxB === -1) return 0;
                      if (idxA === -1) return 1;
                      if (idxB === -1) return -1;
                      return idxA - idxB;
                  })
                  : allApps;

              const moveApp = (index: number, direction: 'up' | 'down') => {
                  const newIndex = direction === 'up' ? index - 1 : index + 1;
                  if (newIndex < 0 || newIndex >= orderedApps.length) return;
                  const newOrder = orderedApps.map(a => a.id);
                  [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
                  if (onUpdateProfile) {
                      onUpdateProfile({ ...profile, appOrder: newOrder });
                  }
              };

              return (
                  <div>
                      <div className="flex items-center justify-between mb-3 ml-1">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Apps & Herramientas</h3>
                          <button 
                              onClick={() => setIsEditingApps(!isEditingApps)}
                              className={`text-[10px] font-bold px-3 py-1 rounded-full transition-colors ${isEditingApps ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary'}`}
                          >
                              {isEditingApps ? 'Listo' : 'Ordenar'}
                          </button>
                      </div>
                      <div className={`grid ${isEditingApps ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'} gap-3`}>
                          {orderedApps.map((app, index) => (
                              isEditingApps ? (
                                  <div key={app.id} className="flex items-center gap-2 bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-xl p-3 shadow-sm">
                                      <div className="flex flex-col gap-0.5">
                                          <button 
                                              onClick={() => moveApp(index, 'up')}
                                              className={`size-7 rounded-lg flex items-center justify-center transition-colors ${index === 0 ? 'opacity-20' : 'bg-slate-100 dark:bg-slate-800 hover:bg-primary/20 text-slate-500 hover:text-primary'}`}
                                              disabled={index === 0}
                                          >
                                              <span className="material-symbols-outlined text-[16px]">expand_less</span>
                                          </button>
                                          <button 
                                              onClick={() => moveApp(index, 'down')}
                                              className={`size-7 rounded-lg flex items-center justify-center transition-colors ${index === orderedApps.length - 1 ? 'opacity-20' : 'bg-slate-100 dark:bg-slate-800 hover:bg-primary/20 text-slate-500 hover:text-primary'}`}
                                              disabled={index === orderedApps.length - 1}
                                          >
                                              <span className="material-symbols-outlined text-[16px]">expand_more</span>
                                          </button>
                                      </div>
                                      <div className="flex items-center gap-3 flex-1">
                                          <div className={`size-8 rounded-lg flex items-center justify-center ${
                                              {blue:'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',indigo:'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',teal:'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',purple:'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',pink:'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',red:'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',orange:'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',yellow:'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',emerald:'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',violet:'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',amber:'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',cyan:'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400'}[app.color] || ''
                                          }`}>
                                              <span className="material-symbols-outlined text-[18px]">{app.icon}</span>
                                          </div>
                                          <div>
                                              <p className="text-sm font-bold text-slate-900 dark:text-white">{app.title}</p>
                                              <p className="text-[10px] text-slate-400">{app.subtitle}</p>
                                          </div>
                                      </div>
                                      <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600">#{index + 1}</span>
                                  </div>
                              ) : (
                                  <AppCard 
                                      key={app.id} 
                                      title={app.title} 
                                      subtitle={app.subtitle} 
                                      icon={app.icon} 
                                      color={app.color} 
                                      onClick={app.onClick} 
                                      privacyMode={app.showPrivacy ? privacyMode : false} 
                                  />
                              )
                          ))}
                      </div>
                  </div>
              );
          })()}

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
  tooltip?: React.ReactNode;
}> = ({ title, subtitle, icon, color, onClick, privacyMode, tooltip }) => {
    
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
        cyan: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
    };

    return (
        <button 
            onClick={onClick}
            className="flex flex-col items-start p-3 md:p-4 bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-slate-700/50 shadow-sm hover:shadow-lg hover:bg-white/90 dark:hover:bg-slate-800/80 hover:-translate-y-1 active:scale-[0.98] transition-all duration-200 h-24 md:h-28 justify-between relative overflow-visible group"
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
            {/* Render Tooltip if provided and not in privacy mode (unless forced) */}
            {!privacyMode && tooltip}
        </button>
    );
}

export default Dashboard;
