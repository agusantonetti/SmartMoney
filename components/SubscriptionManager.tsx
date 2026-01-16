
import React, { useState, useMemo } from 'react';
import { FinancialProfile, Subscription, SubscriptionPayment } from '../types';

interface Props {
  profile: FinancialProfile;
  onUpdateProfile: (profile: FinancialProfile) => void;
  onBack: () => void;
  privacyMode?: boolean;
}

const CATEGORIES = [
  { id: 'housing', label: 'Vivienda', icon: 'home', color: 'orange' },
  { id: 'services', label: 'Servicios', icon: 'bolt', color: 'yellow' },
  { id: 'digital', label: 'Digital', icon: 'smart_display', color: 'indigo' },
  { id: 'education', label: 'Educación', icon: 'school', color: 'blue' },
];

const SubscriptionManager: React.FC<Props> = ({ profile, onUpdateProfile, onBack, privacyMode }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(profile.subscriptions || []);
  const dollarRate = profile.customDollarRate || 1130;
  
  // View State
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());

  // Add State
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'ARS'|'USD'>('ARS');
  const [day, setDay] = useState('');
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[2]);
  
  // NEW STATES
  const [frequency, setFrequency] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [nextDate, setNextDate] = useState('');

  // --- LOGIC: HELPER ---
  const getCurrentMonthKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const formatMoney = (amount: number, currencyCode: string = 'ARS') => {
    return new Intl.NumberFormat(currencyCode === 'ARS' ? 'es-AR' : 'en-US', { 
      style: 'currency', 
      currency: currencyCode, 
      maximumFractionDigits: 0 
    }).format(amount);
  };

  // Helper to get value in ARS normalized to monthly frequency for calculation and sorting
  const getMonthlyArsValue = (sub: Subscription) => {
      let val = sub.currency === 'USD' ? sub.amount * dollarRate : sub.amount;
      if (sub.frequency === 'YEARLY') val = val / 12;
      return val;
  };

  const getDaysUntilDue = (sub: Subscription): number => {
      const now = new Date();
      now.setHours(0,0,0,0);
      
      let targetDate = new Date();
      
      if (sub.nextPaymentDate) {
          targetDate = new Date(sub.nextPaymentDate + 'T00:00:00'); // Append time to fix timezone offset issues somewhat
      } else {
          // Fallback logic if only billingDay exists
          targetDate.setDate(sub.billingDay);
          if (targetDate < now) {
              targetDate.setMonth(targetDate.getMonth() + 1);
          }
      }
      targetDate.setHours(0,0,0,0);

      const diffTime = targetDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
  };

  // --- LOGIC: CRUD ---
  const handleAdd = () => {
    if (!name || !amount) return;

    // Validación de día
    let billingDay = parseInt(day) || 1;
    if (billingDay < 1) billingDay = 1;
    if (billingDay > 31) billingDay = 31;
    
    // Calcular nextPaymentDate inicial si no se proveyó (solo para mensuales)
    let calculatedNextDate = nextDate;
    if (!calculatedNextDate) {
        const d = new Date();
        if (d.getDate() > billingDay) {
            d.setMonth(d.getMonth() + 1);
        }
        d.setDate(billingDay);
        calculatedNextDate = d.toISOString().split('T')[0];
    }

    // Si es anual, asegurarnos que billingDay coincida con el día de la fecha
    if (frequency === 'YEARLY' && nextDate) {
        billingDay = parseInt(nextDate.split('-')[2]);
    }

    const newSub: Subscription = {
      id: Date.now().toString(),
      name,
      amount: parseFloat(amount),
      currency,
      billingDay: billingDay,
      category: selectedCat.id,
      frequency: frequency,
      nextPaymentDate: calculatedNextDate,
      history: []
    };

    const updated = [...subscriptions, newSub];
    setSubscriptions(updated);
    onUpdateProfile({ ...profile, subscriptions: updated });
    
    setName('');
    setAmount('');
    setCurrency('ARS');
    setDay('');
    setNextDate('');
    setFrequency('MONTHLY');
    setIsAdding(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening detail view
    const updated = subscriptions.filter(s => s.id !== id);
    setSubscriptions(updated);
    onUpdateProfile({ ...profile, subscriptions: updated });
    if (selectedSubId === id) setSelectedSubId(null);
  };

  // --- LOGIC: PAYMENTS (VISUAL CHECKLIST ONLY) ---
  const handleUpdatePayment = (subId: string, updatedPayment: SubscriptionPayment) => {
    const subIndex = subscriptions.findIndex(s => s.id === subId);
    if (subIndex === -1) return;

    const sub = subscriptions[subIndex];
    const history = sub.history || [];
    const existingPaymentIndex = history.findIndex(p => p.month === updatedPayment.month);
    
    let newHistory = [...history];

    // Only update visual state in Profile, DO NOT create Transactions
    if (existingPaymentIndex >= 0) {
      newHistory[existingPaymentIndex] = { ...newHistory[existingPaymentIndex], ...updatedPayment };
    } else {
      newHistory.push(updatedPayment);
    }

    const updatedSub = { ...sub, history: newHistory };
    const newSubs = [...subscriptions];
    newSubs[subIndex] = updatedSub;
    
    setSubscriptions(newSubs);
    onUpdateProfile({ ...profile, subscriptions: newSubs });
  };

  // --- RENDER ---
  const getCategoryIcon = (catId: string) => CATEGORIES.find(c => c.id === catId)?.icon || 'receipt';
  const getCategoryColor = (catId: string) => CATEGORIES.find(c => c.id === catId)?.color || 'slate';

  // Sorted Subscriptions: Highest ARS value first
  const sortedSubscriptions = useMemo(() => {
      return [...subscriptions].sort((a, b) => getMonthlyArsValue(b) - getMonthlyArsValue(a));
  }, [subscriptions, dollarRate]);

  // Total monthly normalized in ARS
  const totalMonthlyArs = useMemo(() => {
      return subscriptions.reduce((acc, sub) => acc + getMonthlyArsValue(sub), 0);
  }, [subscriptions, dollarRate]);

  const selectedSub = subscriptions.find(s => s.id === selectedSubId);

  // VISTA DETALLE: CALENDARIO ANUAL DE PAGOS
  if (selectedSub) {
    const monthsList = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const changeYear = (increment: number) => setViewYear(prev => prev + increment);

    return (
      <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
        <div className="sticky top-0 z-20 bg-surface-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm">
           <div className="flex items-center gap-4">
             <button onClick={() => setSelectedSubId(null)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <span className="material-symbols-outlined">arrow_back</span>
             </button>
             <div>
                <h2 className="text-lg font-bold leading-none">{selectedSub.name}</h2>
                <p className="text-xs text-slate-500">Checklist de Pagos</p>
             </div>
           </div>
        </div>

        <div className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-6 space-y-6 pb-24 animate-[fadeIn_0.2s_ease-out]">
            
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50 text-sm text-blue-800 dark:text-blue-300">
                <p className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-lg">info</span>
                    <span>
                        Marcar como "Pagado" aquí solo sirve de recordatorio visual. No afectará tu saldo ni tus gráficos de gastos.
                    </span>
                </p>
            </div>

            {/* Year Selector */}
            <div className="flex items-center justify-center gap-6 bg-surface-light dark:bg-surface-dark p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                 <button onClick={() => changeYear(-1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <span className="material-symbols-outlined">chevron_left</span>
                 </button>
                 <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                    {viewYear}
                 </span>
                 <button onClick={() => changeYear(1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <span className="material-symbols-outlined">chevron_right</span>
                 </button>
            </div>

            {/* Months Grid */}
            <div className="space-y-3">
               {monthsList.map((monthName, index) => {
                  const monthKey = `${viewYear}-${String(index + 1).padStart(2, '0')}`;
                  const history = selectedSub.history || [];
                  const payment = history.find(p => p.month === monthKey);
                  const isCurrentMonth = getCurrentMonthKey() === monthKey;
                  const isFuture = new Date(viewYear, index) > new Date();

                  const currentAmount = payment ? payment.realAmount : selectedSub.amount;
                  const isPaid = payment?.isPaid || false;

                  return (
                     <div 
                        key={monthName}
                        className={`relative rounded-2xl border transition-all duration-200 ${
                           isCurrentMonth 
                           ? 'bg-white dark:bg-slate-800 border-primary shadow-lg shadow-primary/10 ring-1 ring-primary z-10' 
                           : 'bg-surface-light dark:bg-surface-dark border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        } ${isFuture ? 'opacity-60 grayscale-[0.5]' : 'opacity-100'}`}
                     >
                        {isCurrentMonth && (
                             <div className="absolute -top-2.5 left-4 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-20">
                                VENCE EL {selectedSub.billingDay}
                             </div>
                        )}

                        <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                           {/* Month Info */}
                           <div className="md:col-span-4 flex items-center gap-3">
                              <div className={`size-10 rounded-full flex items-center justify-center font-bold text-sm ${isCurrentMonth ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}>
                                 {monthName.substring(0, 3)}
                              </div>
                              <div>
                                 <span className="font-bold text-slate-700 dark:text-slate-200 block md:inline">{monthName}</span>
                                 <span className="text-xs text-slate-400 block md:hidden">Vence día {selectedSub.billingDay}</span>
                              </div>
                           </div>

                           {/* Amount Info (Static Display) */}
                           <div className="md:col-span-4 flex md:justify-center items-center">
                              <p className={`font-bold ${isPaid ? 'text-slate-900 dark:text-white' : 'text-slate-400'} ${privacyMode ? 'blur-sm select-none' : ''}`}>
                                  {formatMoney(currentAmount, selectedSub.currency)}
                              </p>
                           </div>

                           {/* Toggle Paid */}
                           <div className="md:col-span-4 flex justify-end">
                              <button 
                                 onClick={() => handleUpdatePayment(selectedSub.id, {
                                    month: monthKey,
                                    realAmount: currentAmount,
                                    isPaid: !isPaid
                                 })}
                                 className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm transition-all shadow-sm active:scale-95 ${
                                    isPaid 
                                    ? 'bg-emerald-500 text-white shadow-emerald-500/30' 
                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                                 }`}
                              >
                                 <span className="material-symbols-outlined text-[18px]">
                                    {isPaid ? 'check_circle' : 'radio_button_unchecked'}
                                 </span>
                                 {isPaid ? 'PAGADO' : 'PENDIENTE'}
                              </button>
                           </div>
                        </div>
                     </div>
                  );
               })}
            </div>
        </div>
      </div>
    );
  }

  // VISTA LISTA PRINCIPAL
  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      <div className="sticky top-0 z-10 bg-surface-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="text-lg font-bold leading-tight">Gastos Fijos</h2>
          <p className="text-xs text-slate-500">Suscripciones y Alertas</p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto p-6 space-y-8 pb-24">
        
        {/* Summary Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-indigo-900 dark:to-slate-900 rounded-3xl p-8 text-white shadow-xl shadow-slate-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <p className="text-slate-300 font-medium mb-1 relative z-10">Total Mensual Estimado</p>
          <h1 className={`text-5xl font-black tracking-tight relative z-10 transition-all duration-300 ${privacyMode ? 'blur-md select-none opacity-50' : ''}`}>{formatMoney(totalMonthlyArs)}</h1>
          <p className="text-xs text-slate-400 mt-4 relative z-10 opacity-80">
             Incluye gastos en USD convertidos al valor actual (${dollarRate}).
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-500">home_work</span>
              Tus Obligaciones
            </h3>
            {!isAdding && (
              <button 
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 text-sm font-bold text-white bg-primary hover:bg-blue-600 px-4 py-2 rounded-full transition-colors shadow-lg shadow-primary/20"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Agregar
              </button>
            )}
          </div>

          {isAdding && (
             <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl animate-[fadeIn_0.2s_ease-out]">
                <h4 className="text-lg font-bold mb-4 flex items-center gap-2 text-primary">
                    <span className="material-symbols-outlined">receipt_long</span>
                    Nuevo Gasto Fijo
                </h4>
                <div className="grid gap-4">
                   
                   {/* Category Selector */}
                   <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {CATEGORIES.map(cat => (
                        <button
                        key={cat.id}
                        onClick={() => setSelectedCat(cat)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all whitespace-nowrap font-bold text-sm ${
                            selectedCat.id === cat.id 
                            ? `bg-${cat.color}-50 border-${cat.color}-500 text-${cat.color}-700 dark:bg-${cat.color}-900/30 dark:text-${cat.color}-300 ring-1 ring-${cat.color}-500` 
                            : 'bg-slate-50 border-transparent text-slate-500 dark:bg-slate-900/50 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        >
                        <span className="material-symbols-outlined text-[20px]">{cat.icon}</span>
                        <span>{cat.label}</span>
                        </button>
                    ))}
                   </div>

                   {/* Frequency Toggle */}
                   <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex text-xs font-bold">
                        <button 
                            onClick={() => setFrequency('MONTHLY')}
                            className={`flex-1 py-2 rounded-lg transition-all ${frequency === 'MONTHLY' ? 'bg-white dark:bg-slate-700 shadow text-primary' : 'text-slate-500'}`}
                        >
                            Mensual
                        </button>
                        <button 
                            onClick={() => setFrequency('YEARLY')}
                            className={`flex-1 py-2 rounded-lg transition-all ${frequency === 'YEARLY' ? 'bg-white dark:bg-slate-700 shadow text-purple-500' : 'text-slate-500'}`}
                        >
                            Anual
                        </button>
                   </div>

                   {/* Name Input */}
                   <div className="relative group">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors material-symbols-outlined">description</span>
                     <input 
                      type="text" 
                      placeholder={selectedCat.id === 'housing' ? "Ej. Alquiler Depto" : "Ej. Amazon Prime, Seguro Auto"}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 h-14 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium border border-transparent focus:border-primary/30"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoFocus
                     />
                   </div>
                   
                   <div className="grid grid-cols-2 gap-3">
                     <div className="col-span-2 relative group">
                       <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block pl-1">Monto y Moneda</label>
                       <div className="flex gap-2">
                           <div className="relative flex-1">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currency === 'ARS' ? '$' : 'US$'}</span>
                                <input 
                                    type="number" 
                                    placeholder="0" 
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 h-14 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-lg border border-transparent focus:border-primary/30"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                           </div>
                           <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex items-center">
                                <button onClick={() => setCurrency('ARS')} className={`px-4 py-3 rounded-xl text-xs font-bold ${currency === 'ARS' ? 'bg-white dark:bg-slate-600 shadow' : 'text-slate-400'}`}>ARS</button>
                                <button onClick={() => setCurrency('USD')} className={`px-4 py-3 rounded-xl text-xs font-bold ${currency === 'USD' ? 'bg-white dark:bg-slate-600 shadow' : 'text-slate-400'}`}>USD</button>
                           </div>
                       </div>
                     </div>
                     
                     {/* Dynamic Date Input */}
                     <div className="col-span-2 relative group">
                        {frequency === 'MONTHLY' ? (
                            <>
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors material-symbols-outlined">calendar_today</span>
                                <input 
                                    type="number" 
                                    placeholder="Día de Pago (1-31)" 
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 h-14 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold border border-transparent focus:border-primary/30"
                                    value={day}
                                    onChange={(e) => setDay(e.target.value)}
                                    min="1" max="31"
                                />
                            </>
                        ) : (
                            <>
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors material-symbols-outlined">event</span>
                                <input 
                                    type="date" 
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 h-14 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm border border-transparent focus:border-primary/30"
                                    value={nextDate}
                                    onChange={(e) => setNextDate(e.target.value)}
                                />
                            </>
                        )}
                     </div>
                   </div>

                   <div className="flex gap-3 pt-2">
                        <button 
                        onClick={handleAdd}
                        disabled={!name || !amount}
                        className="flex-1 bg-primary text-white font-bold h-12 rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">check</span>
                            Guardar
                        </button>
                        <button 
                        onClick={() => setIsAdding(false)}
                        className="px-6 h-12 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                   </div>
                </div>
             </div>
          )}

          <div className="grid gap-3">
            {sortedSubscriptions.length === 0 && !isAdding && (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">notifications_active</span>
                <p className="font-bold text-slate-500">Sin alertas configuradas</p>
                <p className="text-xs mt-1">Agrega servicios anuales o mensuales para recibir alertas.</p>
              </div>
            )}
            
            {sortedSubscriptions.map((sub) => {
               const icon = getCategoryIcon(sub.category);
               const color = getCategoryColor(sub.category);
               
               const daysUntil = getDaysUntilDue(sub);
               const isUrgent = daysUntil <= 3 && daysUntil >= 0;
               const isDue = daysUntil < 0; 

               // Values
               const monthlyArs = getMonthlyArsValue(sub);
               const percent = totalMonthlyArs > 0 ? (monthlyArs / totalMonthlyArs) * 100 : 0;
               const arsDisplay = sub.currency === 'USD' ? sub.amount * dollarRate : sub.amount;

               return (
                 <div 
                    key={sub.id} 
                    onClick={() => setSelectedSubId(sub.id)}
                    className={`bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between shadow-sm hover:shadow-md transition-all cursor-pointer group gap-4 ${
                        isUrgent 
                        ? 'border-red-400 ring-1 ring-red-400 dark:border-red-500' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                    }`}
                 >
                   <div className="flex items-center gap-4 flex-1">
                     <div className={`size-12 rounded-2xl flex items-center justify-center font-bold text-lg bg-${color}-100 text-${color}-600 dark:bg-${color}-900/30 dark:text-${color}-400 relative shrink-0`}>
                       <span className="material-symbols-outlined">{icon}</span>
                       {isUrgent && (
                           <span className="absolute -top-1 -right-1 size-3 bg-red-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
                       )}
                     </div>
                     <div className="min-w-0">
                       <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors truncate">{sub.name}</h4>
                            {sub.frequency === 'YEARLY' && (
                                <span className="text-[9px] bg-purple-100 text-purple-600 px-1.5 rounded font-bold uppercase">Anual</span>
                            )}
                       </div>
                       
                       <div className="flex items-center gap-1 mt-0.5">
                            {isUrgent ? (
                                <p className="text-xs text-red-500 font-bold flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">warning</span>
                                    Vence en {daysUntil} días
                                </p>
                            ) : (
                                <p className="text-xs text-slate-500">
                                    {daysUntil < 0 ? 'Venció recientemente' : `Faltan ${daysUntil} días`}
                                </p>
                            )}
                       </div>
                     </div>
                   </div>

                   <div className="flex items-center justify-between sm:justify-end gap-4">
                     <div className="text-right">
                        <span className={`font-black text-lg text-slate-800 dark:text-slate-200 transition-all duration-300 block leading-none ${privacyMode ? 'blur-sm select-none' : ''}`}>
                            {formatMoney(sub.amount, sub.currency || 'ARS')}
                        </span>
                        
                        {sub.currency === 'USD' && (
                            <span className={`text-[10px] font-medium text-slate-400 block mt-1 ${privacyMode ? 'blur-sm select-none' : ''}`}>
                                (≈ {formatMoney(arsDisplay)})
                            </span>
                        )}
                        
                        <div className="mt-1 flex justify-end">
                            <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded-md">
                                {percent.toFixed(1)}% del total
                            </span>
                        </div>
                     </div>
                     
                     <div className="flex gap-1">
                        <button 
                            className="size-8 flex items-center justify-center rounded-full text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                        >
                            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                        </button>
                         <button 
                            onClick={(e) => handleDelete(sub.id, e)}
                            className="size-8 flex items-center justify-center rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all z-10"
                        >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                     </div>
                   </div>
                 </div>
              );
            })}
          </div>
        </div>
        
        <div className="text-center text-xs text-slate-400 mt-8">
           Recibirás una alerta en el panel principal 3 días antes de cada vencimiento.
        </div>
      </div>
    </div>
  );
};

export default SubscriptionManager;
