
import React, { useState } from 'react';
import { FinancialProfile, Subscription, SubscriptionPayment } from '../types';

interface Props {
  profile: FinancialProfile;
  onUpdateProfile: (profile: FinancialProfile) => void;
  onBack: () => void;
}

const CATEGORIES = [
  { id: 'housing', label: 'Vivienda', icon: 'home', color: 'orange' },
  { id: 'services', label: 'Servicios', icon: 'bolt', color: 'yellow' },
  { id: 'digital', label: 'Digital', icon: 'smart_display', color: 'indigo' },
  { id: 'education', label: 'Educación', icon: 'school', color: 'blue' },
];

const SubscriptionManager: React.FC<Props> = ({ profile, onUpdateProfile, onBack }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(profile.subscriptions || []);
  
  // View State
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());

  // Add State
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('');
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[2]);

  // --- LOGIC: HELPER ---
  const getCurrentMonthKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: 'ARS', 
      maximumFractionDigits: 0 
    }).format(amount);
  };

  // --- LOGIC: CRUD ---
  const handleAdd = () => {
    if (!name || !amount) return;

    // Validación de día
    let billingDay = parseInt(day) || 1;
    if (billingDay < 1) billingDay = 1;
    if (billingDay > 31) billingDay = 31;

    const newSub: Subscription = {
      id: Date.now().toString(),
      name,
      amount: parseFloat(amount),
      billingDay: billingDay,
      category: selectedCat.id,
      history: []
    };

    const updated = [...subscriptions, newSub];
    setSubscriptions(updated);
    onUpdateProfile({ ...profile, subscriptions: updated });
    
    setName('');
    setAmount('');
    setDay('');
    setIsAdding(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening detail view
    const updated = subscriptions.filter(s => s.id !== id);
    setSubscriptions(updated);
    onUpdateProfile({ ...profile, subscriptions: updated });
    if (selectedSubId === id) setSelectedSubId(null);
  };

  // --- LOGIC: PAYMENTS (HISTORY) ---
  const handleUpdatePayment = (subId: string, updatedPayment: SubscriptionPayment) => {
    const subIndex = subscriptions.findIndex(s => s.id === subId);
    if (subIndex === -1) return;

    const sub = subscriptions[subIndex];
    // Asegurarnos de que history exista
    const history = sub.history || [];
    const existingPaymentIndex = history.findIndex(p => p.month === updatedPayment.month);
    
    let newHistory = [...history];

    if (existingPaymentIndex >= 0) {
      newHistory[existingPaymentIndex] = updatedPayment;
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

  const selectedSub = subscriptions.find(s => s.id === selectedSubId);
  const totalMonthly = subscriptions.reduce((acc, sub) => acc + sub.amount, 0);

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
                <p className="text-xs text-slate-500">Historial de Pagos</p>
             </div>
           </div>
        </div>

        <div className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-6 space-y-6 pb-24 animate-[fadeIn_0.2s_ease-out]">
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

                           {/* Amount Input (Editable because electricity/gas varies) */}
                           <div className="md:col-span-4">
                              <div className="relative">
                                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                                 <input 
                                    type="number" 
                                    className={`w-full bg-slate-50 dark:bg-slate-900/50 rounded-xl pl-6 pr-3 py-2 outline-none focus:ring-2 focus:ring-primary/50 font-bold text-right transition-colors ${currentAmount > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}
                                    placeholder="0"
                                    value={currentAmount}
                                    onChange={(e) => handleUpdatePayment(selectedSub.id, {
                                        month: monthKey,
                                        realAmount: parseFloat(e.target.value),
                                        isPaid: isPaid
                                     })}
                                 />
                              </div>
                              <p className="text-[10px] text-slate-400 text-right mt-1">Monto Real</p>
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
          <p className="text-xs text-slate-500">Alquiler, Servicios y Suscripciones</p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto p-6 space-y-8 pb-24">
        
        {/* Summary Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-indigo-900 dark:to-slate-900 rounded-3xl p-8 text-white shadow-xl shadow-slate-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <p className="text-slate-300 font-medium mb-1 relative z-10">Total a Pagar este Mes</p>
          <h1 className="text-5xl font-black tracking-tight relative z-10">{formatMoney(totalMonthly)}</h1>
          <p className="text-xs text-slate-400 mt-4 relative z-10 opacity-80">
             Suma de Alquiler, Expensas, Servicios y Suscripciones.
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

                   {/* Name Input */}
                   <div className="relative group">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors material-symbols-outlined">description</span>
                     <input 
                      type="text" 
                      placeholder={selectedCat.id === 'housing' ? "Ej. Alquiler Depto, Cochera" : "Ej. Netflix, Gimnasio"}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 h-14 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium border border-transparent focus:border-primary/30"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoFocus
                     />
                   </div>
                   
                   <div className="grid grid-cols-2 gap-3">
                     <div className="relative group">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors material-symbols-outlined">attach_money</span>
                       <input 
                        type="number" 
                        placeholder="Monto" 
                        className="w-full bg-slate-50 dark:bg-slate-900/50 h-14 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-lg border border-transparent focus:border-primary/30"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                       />
                     </div>
                     <div className="relative group">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors material-symbols-outlined">calendar_today</span>
                       <input 
                        type="number" 
                        placeholder="Día (1-31)" 
                        className="w-full bg-slate-50 dark:bg-slate-900/50 h-14 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold border border-transparent focus:border-primary/30"
                        value={day}
                        onChange={(e) => setDay(e.target.value)}
                        min="1" max="31"
                       />
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
            {subscriptions.length === 0 && !isAdding && (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">home_work</span>
                <p className="font-bold text-slate-500">Sin gastos fijos registrados</p>
                <p className="text-xs mt-1">Agrega tu Alquiler, Expensas, Internet o Streaming.</p>
              </div>
            )}
            
            {subscriptions.map((sub) => {
               const icon = getCategoryIcon(sub.category);
               const color = getCategoryColor(sub.category);
               const history = sub.history || [];
               const currentPaid = history.find(p => p.month === getCurrentMonthKey())?.isPaid;
               
               return (
                 <div 
                    key={sub.id} 
                    onClick={() => setSelectedSubId(sub.id)}
                    className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-primary/50"
                 >
                   <div className="flex items-center gap-4">
                     <div className={`size-12 rounded-2xl flex items-center justify-center font-bold text-lg bg-${color}-100 text-${color}-600 dark:bg-${color}-900/30 dark:text-${color}-400`}>
                       <span className="material-symbols-outlined">{icon}</span>
                     </div>
                     <div>
                       <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{sub.name}</h4>
                       <div className="flex items-center gap-2">
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">event</span>
                                Vence el {sub.billingDay}
                            </p>
                            {currentPaid && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 px-1.5 rounded font-bold">PAGADO HOY</span>
                            )}
                       </div>
                     </div>
                   </div>
                   <div className="flex items-center gap-4">
                     <span className="font-black text-lg text-slate-800 dark:text-slate-200">{formatMoney(sub.amount)}</span>
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
           Pulsa sobre un gasto para ver su calendario anual de pagos.
        </div>
      </div>
    </div>
  );
};

export default SubscriptionManager;
