
import React, { useState, useMemo } from 'react';
import { FinancialProfile, IncomeSource, IncomePayment, PaymentFrequency } from '../types';

interface Props {
  profile: FinancialProfile;
  transactions: any[];
  onUpdateProfile: (profile: FinancialProfile) => void;
  onBack: () => void;
  privacyMode?: boolean;
}

const IncomeManager: React.FC<Props> = ({ profile, onUpdateProfile, onBack, privacyMode }) => {
  const [sources, setSources] = useState<IncomeSource[]>(profile.incomeSources || []);
  const dollarRate = profile.customDollarRate || 1130;
  
  // Sorting State
  const [sortOrder, setSortOrder] = useState<'AMOUNT' | 'DATE'>('AMOUNT');

  // States for adding/editing
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS'); 
  const [frequency, setFrequency] = useState<PaymentFrequency>('MONTHLY');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(''); 
  const [isEndDateEnabled, setIsEndDateEnabled] = useState(false);
  const [isCreatorSource, setIsCreatorSource] = useState(false); 
  
  // Media / Salary Calculator States
  const [programsPerWeek, setProgramsPerWeek] = useState('');
  const [hoursPerProgram, setHoursPerProgram] = useState('');
  const [targetPosts, setTargetPosts] = useState(''); 

  // States for viewing details
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());

  // --- HELPERS ---
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatUSD = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const isContractActive = (src: IncomeSource, targetDate: Date = new Date()) => {
      if (src.isActive === false) return false;
      const start = src.startDate ? new Date(src.startDate) : new Date(0);
      const end = src.endDate ? new Date(src.endDate) : null;
      targetDate.setHours(0,0,0,0);
      start.setHours(0,0,0,0);
      if (end) end.setHours(23,59,59,999);
      if (targetDate < start) return false; 
      if (end && targetDate > end) return false; 
      return true;
  };

  // Helper to get actual inputted amount for the current month
  const getCurrentMonthRealAmount = (src: IncomeSource) => {
      const now = new Date();
      // Format YYYY-MM
      const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}`;
      
      // Filter payments that belong to this month (matches YYYY-MM or YYYY-MM-Q1/2)
      const currentPayments = src.payments.filter(p => p.month.startsWith(currentMonthPrefix));
      
      const totalReal = currentPayments.reduce((acc, p) => acc + p.realAmount, 0);
      
      if (src.currency === 'USD') {
          return totalReal * dollarRate;
      }
      return totalReal;
  };

  const getMonthlyProjection = (src: IncomeSource) => {
      if (!isContractActive(src)) return 0;
      
      // FIX: For Creator Sources, strictly use what has been entered for the current month
      if (src.isCreatorSource) {
          return getCurrentMonthRealAmount(src);
      }

      // Convert to ARS for total projection if source is USD
      let val = src.amount;
      if (src.currency === 'USD') {
          val = src.amount * dollarRate;
      }

      if (src.frequency === 'BIWEEKLY') return val * 2;
      if (src.frequency === 'ONE_TIME') return 0; 
      return val; 
  };

  const totalMonthlyProjected = useMemo(() => {
      return sources.reduce((acc, src) => acc + getMonthlyProjection(src), 0);
  }, [sources, dollarRate]);

  // --- SORTING ---
  const sortedSources = useMemo(() => {
      return [...sources].sort((a, b) => {
          if (sortOrder === 'AMOUNT') {
              // For variable sources, use current month projection for sorting
              const valA = a.isCreatorSource ? getCurrentMonthRealAmount(a) : (a.currency === 'USD' ? a.amount * dollarRate : a.amount);
              const valB = b.isCreatorSource ? getCurrentMonthRealAmount(b) : (b.currency === 'USD' ? b.amount * dollarRate : b.amount);
              return valB - valA;
          }
          // Date Descending (Newest first, using ID as timestamp proxy)
          return b.id.localeCompare(a.id);
      });
  }, [sources, sortOrder, dollarRate]);

  // --- CRUD LOGIC ---
  const handleSaveSource = () => {
      // If creator source, amount can be 0 or ignored
      if (!name) return;
      if (!isCreatorSource && !amount) return;

      const newSource: IncomeSource = {
          id: Date.now().toString(),
          name,
          amount: isCreatorSource ? 0 : parseFloat(amount), // Force 0 for variable sources
          currency, 
          frequency,
          startDate,
          endDate: isEndDateEnabled ? endDate : undefined,
          isActive: true,
          isCreatorSource: isCreatorSource,
          payments: [],
          type: 'FIXED',
          daysPerWeek: programsPerWeek ? parseFloat(programsPerWeek) : undefined,
          hoursPerDay: hoursPerProgram ? parseFloat(hoursPerProgram) : undefined,
          targetPosts: targetPosts ? parseFloat(targetPosts) : undefined,
      };

      const updated = [...sources, newSource];
      setSources(updated);
      onUpdateProfile({ ...profile, incomeSources: updated });
      
      resetForm();
  };

  const resetForm = () => {
      setName('');
      setAmount('');
      setCurrency('ARS');
      setFrequency('MONTHLY');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setIsEndDateEnabled(false);
      setIsCreatorSource(false);
      setProgramsPerWeek('');
      setHoursPerProgram('');
      setTargetPosts('');
      setIsAdding(false);
  };

  const handleDelete = (id: string) => {
      if (confirm('¿Eliminar este contrato? Se perderá el historial de cobros.')) {
          const updated = sources.filter(s => s.id !== id);
          setSources(updated);
          onUpdateProfile({ ...profile, incomeSources: updated });
          if (selectedSourceId === id) setSelectedSourceId(null);
      }
  };

  const handleUpdatePayment = (sourceId: string, payment: IncomePayment) => {
      const srcIdx = sources.findIndex(s => s.id === sourceId);
      if (srcIdx === -1) return;
      
      const src = sources[srcIdx];
      const newPayments = [...src.payments];
      const existIdx = newPayments.findIndex(p => p.month === payment.month);

      if (existIdx >= 0) {
          const existing = newPayments[existIdx];
          newPayments[existIdx] = { 
              ...existing, 
              ...payment, 
              metrics: { ...existing.metrics, ...payment.metrics }
          };
      } else {
          newPayments.push(payment);
      }

      const updatedSrc = { ...src, payments: newPayments };
      const updatedSources = [...sources];
      updatedSources[srcIdx] = updatedSrc;
      
      setSources(updatedSources);
      onUpdateProfile({ ...profile, incomeSources: updatedSources });
  };

  // --- RENDER DETAIL VIEW ---
  const selectedSource = sources.find(s => s.id === selectedSourceId);
  
  if (selectedSource) {
      const monthsList = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const isUSD = selectedSource.currency === 'USD';
      
      const baseAmountArs = isUSD ? selectedSource.amount * dollarRate : selectedSource.amount;

      // Calculate Stats for Creator Source
      const totalImpressions = selectedSource.payments.reduce((acc, p) => acc + (p.metrics?.impressions || 0), 0);
      
      // Calculate earnings in ARS
      const totalEarningsArs = selectedSource.payments.filter(p => p.isPaid).reduce((acc, p) => {
          const val = isUSD ? p.realAmount * dollarRate : p.realAmount;
          return acc + val;
      }, 0);

      const avgRPM = totalImpressions > 0 ? (totalEarningsArs / totalImpressions) : 0;

      // Calculate Stats for Media Salary
      const programsWeek = selectedSource.daysPerWeek || 0;
      const hoursProgram = selectedSource.hoursPerDay || 0;
      const requiredPosts = selectedSource.targetPosts || 0;
      
      let valPerShow = 0;
      let valPerHour = 0;
      let valPerPost = 0;

      // Only calculate fixed per-unit values if there is a base amount
      if (selectedSource.amount > 0) {
          if (programsWeek > 0) {
              const monthlyPrograms = programsWeek * 4.33; 
              valPerShow = baseAmountArs / monthlyPrograms;
              
              if (hoursProgram > 0) {
                  const monthlyHours = monthlyPrograms * hoursProgram;
                  valPerHour = baseAmountArs / monthlyHours;
              }
          }

          if (requiredPosts > 0) {
              valPerPost = baseAmountArs / requiredPosts;
          }
      }

      return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
            <div className="sticky top-0 z-20 bg-surface-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedSourceId(null)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div>
                        <h2 className="text-lg font-bold leading-none flex items-center gap-2">
                            {selectedSource.name}
                            {selectedSource.isCreatorSource && <span className="material-symbols-outlined text-sm text-slate-400">verified</span>}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                selectedSource.frequency === 'BIWEEKLY' ? 'bg-purple-100 text-purple-600' :
                                selectedSource.frequency === 'ONE_TIME' ? 'bg-orange-100 text-orange-600' :
                                'bg-blue-100 text-blue-600'
                            }`}>
                                {selectedSource.frequency === 'BIWEEKLY' ? 'Quincenal' : selectedSource.frequency === 'ONE_TIME' ? 'Proyecto Único' : 'Mensual'}
                            </span>
                            {isUSD && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 rounded font-bold">USD</span>
                            )}
                            <span className="text-xs text-slate-500">
                                {selectedSource.endDate ? `Hasta: ${selectedSource.endDate}` : 'Indefinido'}
                            </span>
                        </div>
                    </div>
                </div>
                <button onClick={() => handleDelete(selectedSource.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-full">
                    <span className="material-symbols-outlined">delete</span>
                </button>
            </div>

            <div className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-6 space-y-6 pb-24">
                
                {/* CREATOR STATS DASHBOARD */}
                {selectedSource.isCreatorSource && (
                    <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="relative z-10 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Ganado (Año Actual)</p>
                                <p className={`text-2xl font-black ${privacyMode ? 'blur-sm' : ''}`}>
                                    {formatMoney(totalEarningsArs)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase mb-1">RPM Promedio</p>
                                <p className="text-2xl font-black text-yellow-400">${avgRPM.toFixed(2)}</p>
                                <p className="text-[10px] text-slate-500">x 1 Millón Impresiones</p>
                            </div>
                            <div className="col-span-2 mt-2 pt-4 border-t border-white/10">
                                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Total Interacciones</p>
                                <p className="text-lg font-bold flex items-center gap-2">
                                    <span className="material-symbols-outlined text-blue-400">bar_chart</span>
                                    {totalImpressions.toFixed(1)} Millones
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* MEDIA SALARY / POST STATS DASHBOARD - Only show if there's a base salary */}
                {!selectedSource.isCreatorSource && selectedSource.amount > 0 && (valPerShow > 0 || valPerPost > 0) && (
                    <div className="grid grid-cols-2 gap-3">
                        {valPerPost > 0 ? (
                            <div className="col-span-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 rounded-3xl relative overflow-hidden shadow-lg flex items-center justify-between">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/2"></div>
                                <div className="relative z-10">
                                    <p className="text-xs text-blue-200 font-bold uppercase mb-1">Valor por Post</p>
                                    <div className={`${privacyMode ? 'blur-sm' : ''}`}>
                                        <p className="text-4xl font-black">{formatMoney(valPerPost)}</p>
                                        {isUSD && <p className="text-xs opacity-70">({formatUSD(valPerPost / dollarRate)})</p>}
                                    </div>
                                </div>
                                <div className="relative z-10 text-right">
                                    <span className="material-symbols-outlined text-3xl opacity-80">post_add</span>
                                    <p className="text-[10px] uppercase font-bold text-blue-200 mt-1">Meta: {requiredPosts} / mes</p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white p-5 rounded-3xl relative overflow-hidden shadow-lg">
                                <div className="absolute top-0 right-0 size-20 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-1 mb-2 opacity-80">
                                        <span className="material-symbols-outlined text-sm">mic</span>
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Valor por Show</span>
                                    </div>
                                    <div className={`${privacyMode ? 'blur-sm' : ''}`}>
                                        <p className="text-2xl font-black">{formatMoney(valPerShow)}</p>
                                        {isUSD && <p className="text-[10px] opacity-70">({formatUSD(valPerShow / dollarRate)})</p>}
                                    </div>
                                    <p className="text-[10px] opacity-70 mt-1">{programsWeek} programas / semana</p>
                                </div>
                            </div>
                        )}
                        
                        {(valPerShow > 0 && valPerPost === 0) && (
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Valor por Hora</p>
                                <div className={`${privacyMode ? 'blur-sm' : ''}`}>
                                    <p className="text-xl font-black text-slate-900 dark:text-white">{valPerHour > 0 ? formatMoney(valPerHour) : '-'}</p>
                                    {isUSD && valPerHour > 0 && <p className="text-[10px] text-slate-400">({formatUSD(valPerHour / dollarRate)})</p>}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">{hoursProgram} horas / programa</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Year Selector and Months List ... */}
                <div className="flex items-center justify-center gap-6 bg-surface-light dark:bg-surface-dark p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <button onClick={() => setViewYear(viewYear - 1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><span className="material-symbols-outlined">chevron_left</span></button>
                    <span className="text-xl font-black">{viewYear}</span>
                    <button onClick={() => setViewYear(viewYear + 1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><span className="material-symbols-outlined">chevron_right</span></button>
                </div>

                <div className="space-y-3">
                    {monthsList.map((monthName, idx) => {
                        const renderPaymentSlot = (periodKey: string, periodLabel: string) => {
                            const payment = selectedSource.payments.find(p => p.month === periodKey);
                            const checkDate = new Date(viewYear, idx, 15);
                            const isActive = isContractActive(selectedSource, checkDate);
                            
                            // For Creator sources, default to 0 if no payment exists (pure variable)
                            // For Fixed sources, default to contract amount
                            const currentVal = payment ? payment.realAmount : (selectedSource.isCreatorSource ? 0 : selectedSource.amount);
                            const isPaid = payment?.isPaid || false;
                            const impressions = payment?.metrics?.impressions || 0;
                            const rpm = (impressions > 0 && currentVal > 0) ? (currentVal / impressions) : 0;
                            const postsDone = payment?.postsCompleted || 0;
                            // Expected is 0 for creator (variable), otherwise contract amount
                            const expected = selectedSource.isCreatorSource ? 0 : selectedSource.amount;

                            const updatePosts = (increment: number) => {
                                const newVal = Math.max(0, postsDone + increment);
                                handleUpdatePayment(selectedSource.id, {
                                    month: periodKey,
                                    realAmount: currentVal || expected,
                                    isPaid,
                                    postsCompleted: newVal
                                });
                            };

                            return (
                                <div key={periodKey} className={`p-4 rounded-xl border flex flex-col gap-3 transition-colors ${
                                    !isActive ? 'opacity-40 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900' :
                                    isPaid ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' :
                                    'bg-surface-light dark:bg-surface-dark border-slate-200 dark:border-slate-700'
                                }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`size-8 rounded-full flex items-center justify-center font-bold text-[10px] uppercase ${isActive ? 'bg-slate-200 dark:bg-slate-700' : 'bg-slate-100 text-slate-300'}`}>
                                                {periodLabel.substring(0, 3)}
                                            </div>
                                            <div>
                                                <span className="font-bold text-sm block">{monthName} - {periodLabel}</span>
                                                {selectedSource.isCreatorSource && impressions > 0 && (
                                                    <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[10px]">visibility</span>
                                                        {impressions}M • RPM: {isUSD ? formatUSD(rpm) : formatMoney(rpm)}
                                                    </span>
                                                )}
                                                {!selectedSource.isCreatorSource && requiredPosts > 0 && isActive && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-bold uppercase text-slate-400">Entregados:</span>
                                                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full px-1.5 py-0.5">
                                                            <button onClick={() => updatePosts(-1)} className="size-5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500"><span className="material-symbols-outlined text-[14px]">remove</span></button>
                                                            <span className={`text-xs font-bold w-10 text-center ${postsDone >= requiredPosts ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>{postsDone}/{requiredPosts}</span>
                                                            <button onClick={() => updatePosts(1)} className="size-5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500"><span className="material-symbols-outlined text-[14px]">add</span></button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {isActive && (
                                            <button 
                                                onClick={() => handleUpdatePayment(selectedSource.id, { 
                                                    month: periodKey, 
                                                    realAmount: currentVal || expected, 
                                                    isPaid: !isPaid,
                                                    postsCompleted: postsDone 
                                                })} 
                                                className={`size-8 rounded-full flex items-center justify-center transition-all ${isPaid ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 hover:bg-slate-300'}`}
                                            >
                                                <span className="material-symbols-outlined text-sm">{isPaid ? 'check' : 'attach_money'}</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Creator Metric Inputs */}
                                    {isActive && selectedSource.isCreatorSource && (
                                        <div className="grid grid-cols-2 gap-3 pl-11">
                                            <div>
                                                <label className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">Ingreso ({isUSD ? 'USD' : 'ARS'})</label>
                                                <input 
                                                    type="number"
                                                    className={`w-full bg-slate-100 dark:bg-slate-800 rounded px-2 py-1 text-sm font-bold outline-none ${privacyMode ? 'blur-sm' : ''}`}
                                                    value={currentVal || ''}
                                                    placeholder="0"
                                                    onChange={(e) => handleUpdatePayment(selectedSource.id, {
                                                        month: periodKey, realAmount: parseFloat(e.target.value), isPaid
                                                    })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">Impresiones (M)</label>
                                                <input 
                                                    type="number"
                                                    step="0.1"
                                                    className="w-full bg-slate-100 dark:bg-slate-800 rounded px-2 py-1 text-sm font-bold outline-none"
                                                    value={impressions || ''}
                                                    placeholder="0.0"
                                                    onChange={(e) => handleUpdatePayment(selectedSource.id, {
                                                        month: periodKey, realAmount: currentVal, isPaid,
                                                        metrics: { impressions: parseFloat(e.target.value) }
                                                    })}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Standard Input */}
                                    {isActive && !selectedSource.isCreatorSource && (
                                        <div className="flex items-center justify-end gap-2 pl-11">
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">{isUSD ? 'Monto (USD):' : 'Monto (ARS):'}</p>
                                            <input 
                                                type="number" 
                                                className={`w-24 bg-transparent text-right font-bold outline-none border-b border-dashed border-slate-300 focus:border-primary ${privacyMode ? 'blur-sm' : ''}`}
                                                placeholder={expected.toString()}
                                                value={currentVal || ''}
                                                onChange={(e) => handleUpdatePayment(selectedSource.id, {
                                                    month: periodKey, realAmount: parseFloat(e.target.value), isPaid, postsCompleted: postsDone
                                                })}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        };

                        if (selectedSource.frequency === 'BIWEEKLY') {
                            return (
                                <div key={monthName} className="space-y-2">
                                    {renderPaymentSlot(`${viewYear}-${String(idx+1).padStart(2,'0')}-Q1`, '1ª Quincena')}
                                    {renderPaymentSlot(`${viewYear}-${String(idx+1).padStart(2,'0')}-Q2`, '2ª Quincena')}
                                </div>
                            );
                        }
                        
                        return renderPaymentSlot(`${viewYear}-${String(idx+1).padStart(2,'0')}`, 'Mensual');
                    })}
                </div>
            </div>
        </div>
      );
  }

  // --- RENDER MAIN LIST ---
  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      <div className="sticky top-0 z-10 bg-surface-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold">Gestión de Contratos</h2>
      </div>

      <div className="flex-1 w-full max-w-4xl mx-auto p-6 space-y-8 pb-24">
        
        {/* TOTAL PROJECTION CARD */}
        <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="relative z-10 flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-2 mb-1 opacity-80">
                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                        <span className="text-xs font-bold uppercase tracking-widest">Proyección Este Mes</span>
                    </div>
                    <h1 className={`text-4xl font-black tracking-tight ${privacyMode ? 'blur-md select-none opacity-50' : ''}`}>
                        {formatMoney(totalMonthlyProjected)}
                    </h1>
                </div>
                <button 
                    onClick={() => setIsAdding(true)} 
                    className="bg-white/20 dark:bg-black/10 hover:bg-white/30 p-3 rounded-full backdrop-blur-md transition-all"
                >
                    <span className="material-symbols-outlined">add</span>
                </button>
            </div>
        </div>

        {/* TIMELINE VISUALIZATION (GANTT) */}
        {sortedSources.length > 0 && (
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Línea de Tiempo (Activos)</h3>
                <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-700 p-4 overflow-x-auto scrollbar-hide shadow-sm">
                    <div className="min-w-[600px]">
                        {/* Month Headers */}
                        <div className="flex mb-4">
                            <div className="w-32 shrink-0"></div>
                            {Array.from({length: 6}).map((_, i) => {
                                const d = new Date();
                                d.setMonth(d.getMonth() + i);
                                return (
                                    <div key={i} className="flex-1 text-center text-[10px] font-bold text-slate-400 uppercase">
                                        {d.toLocaleDateString('es-ES', { month: 'short' })}
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Contracts */}
                        <div className="space-y-3">
                            {sortedSources.filter(s => isContractActive(s)).map(src => {
                                return (
                                    <div key={src.id} className="flex items-center group">
                                        <div className="w-32 shrink-0 pr-4">
                                            <p className="font-bold text-xs truncate flex items-center gap-1">
                                                {src.name}
                                                {src.isCreatorSource && <span className="size-1.5 rounded-full bg-blue-500" title="Creador"></span>}
                                            </p>
                                            <p className="text-[10px] text-slate-500">{src.frequency === 'BIWEEKLY' ? 'Quincenal' : 'Mensual'}</p>
                                        </div>
                                        <div className="flex-1 flex gap-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                                            {/* Bar logic: Check active status for next 6 months */}
                                            {Array.from({length: 6}).map((_, i) => {
                                                const d = new Date();
                                                d.setDate(15); 
                                                d.setMonth(d.getMonth() + i);
                                                const active = isContractActive(src, d);
                                                
                                                let colorClass = 'bg-slate-100 dark:bg-slate-800';
                                                if (active) {
                                                    if (src.frequency === 'BIWEEKLY') colorClass = 'bg-purple-400';
                                                    else if (src.frequency === 'ONE_TIME') colorClass = 'bg-orange-400';
                                                    else colorClass = 'bg-blue-500';
                                                }

                                                return (
                                                    <div key={i} className={`flex-1 ${colorClass} transition-colors opacity-80`}></div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* ADD NEW SOURCE FORM */}
        {isAdding && (
            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl animate-[fadeIn_0.2s_ease-out]">
                <h3 className="font-bold text-lg mb-4">Nuevo Contrato / Ingreso</h3>
                
                <div className="grid gap-4">
                    {/* Name & Amount */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Nombre / Cliente</label>
                            <input 
                                type="text" 
                                className="w-full bg-slate-100 dark:bg-slate-900 p-3 rounded-xl outline-none font-bold text-sm"
                                placeholder="Ej. X Ads"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Monto y Moneda</label>
                            {isCreatorSource ? (
                                <div className="h-11 flex items-center px-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300 font-bold">
                                    Ingreso variable mes a mes.
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currency === 'ARS' ? '$' : 'U$'}</span>
                                        <input 
                                            type="number" 
                                            className="w-full bg-slate-100 dark:bg-slate-900 p-3 pl-8 rounded-xl outline-none font-bold text-sm"
                                            placeholder="0"
                                            value={amount}
                                            onChange={e => setAmount(e.target.value)}
                                        />
                                    </div>
                                    <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl flex items-center">
                                        <button 
                                            onClick={() => setCurrency('ARS')} 
                                            className={`px-3 py-2 rounded-lg text-xs font-bold ${currency === 'ARS' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-400'}`}
                                        >
                                            ARS
                                        </button>
                                        <button 
                                            onClick={() => setCurrency('USD')} 
                                            className={`px-3 py-2 rounded-lg text-xs font-bold ${currency === 'USD' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-400'}`}
                                        >
                                            USD
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Creator Toggle */}
                    <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={isCreatorSource} onChange={(e) => setIsCreatorSource(e.target.checked)} />
                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-black"></div>
                        </label>
                        <div>
                            <span className="text-sm font-bold block">Ingreso de Creador (X / YouTube)</span>
                            <span className="text-[10px] text-slate-500">Habilita registro variable por mes sin monto fijo.</span>
                        </div>
                    </div>

                    {/* Calculator Fields (Only if NOT Creator) */}
                    {!isCreatorSource && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                            <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Entregables / Métricas (Opcional)</div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-1 block">Posts por Mes (Objetivo)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[16px]">post_add</span>
                                        <input 
                                            type="number" 
                                            className="w-full bg-white dark:bg-slate-800 p-2 pl-9 rounded-lg outline-none text-sm font-bold border border-slate-200 dark:border-slate-700 focus:border-primary"
                                            placeholder="Ej. 10"
                                            value={targetPosts}
                                            onChange={e => setTargetPosts(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-1 block">Progs. x Semana</label>
                                    <input 
                                        type="number" 
                                        className="w-full bg-white dark:bg-slate-800 p-2 rounded-lg outline-none text-sm font-bold border border-slate-200 dark:border-slate-700 focus:border-primary"
                                        placeholder="Ej. 5"
                                        value={programsPerWeek}
                                        onChange={e => setProgramsPerWeek(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-1 block">Horas x Prog.</label>
                                    <input 
                                        type="number" 
                                        className="w-full bg-white dark:bg-slate-800 p-2 rounded-lg outline-none text-sm font-bold border border-slate-200 dark:border-slate-700 focus:border-primary"
                                        placeholder="Ej. 2"
                                        value={hoursPerProgram}
                                        onChange={e => setHoursPerProgram(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Frequency */}
                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Frecuencia de Pago</label>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setFrequency('MONTHLY')} 
                                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${frequency === 'MONTHLY' ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                            >
                                Mensual
                            </button>
                            <button 
                                onClick={() => setFrequency('BIWEEKLY')} 
                                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${frequency === 'BIWEEKLY' ? 'bg-purple-50 border-purple-500 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                            >
                                Quincenal
                            </button>
                            <button 
                                onClick={() => setFrequency('ONE_TIME')} 
                                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${frequency === 'ONE_TIME' ? 'bg-orange-50 border-orange-500 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                            >
                                Único
                            </button>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Inicio Contrato</label>
                            <input 
                                type="date" 
                                className="w-full bg-slate-100 dark:bg-slate-900 p-3 rounded-xl outline-none font-bold text-sm"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="text-[10px] uppercase font-bold text-slate-400 block">Fin Contrato</label>
                                <div className="flex items-center gap-1">
                                    <input type="checkbox" checked={isEndDateEnabled} onChange={e => setIsEndDateEnabled(e.target.checked)} className="size-3 accent-primary" />
                                    <span className="text-[10px] text-slate-500">Definir</span>
                                </div>
                            </div>
                            <input 
                                type="date" 
                                disabled={!isEndDateEnabled}
                                className={`w-full bg-slate-100 dark:bg-slate-900 p-3 rounded-xl outline-none font-bold text-sm transition-opacity ${!isEndDateEnabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button onClick={handleSaveSource} disabled={!name || (!isCreatorSource && !amount)} className="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-lg disabled:opacity-50">Guardar Contrato</button>
                        <button onClick={() => setIsAdding(false)} className="px-6 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold rounded-xl">Cancelar</button>
                    </div>
                </div>
            </div>
        )}

        {/* LIST OF SOURCES */}
        <div className="flex items-center justify-between mb-2">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Listado</h3>
             <button 
                onClick={() => setSortOrder(prev => prev === 'AMOUNT' ? 'DATE' : 'AMOUNT')}
                className="flex items-center gap-1 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-slate-500 hover:text-primary transition-colors"
             >
                <span className="material-symbols-outlined text-[14px]">sort</span>
                {sortOrder === 'AMOUNT' ? 'Mayor a Menor' : 'Recientes'}
             </button>
        </div>
        <div className="space-y-4">
            {sortedSources.map(src => {
                const isActive = isContractActive(src);
                const isBiweekly = src.frequency === 'BIWEEKLY';
                const isUSD = src.currency === 'USD';
                
                // Calculate display amounts
                // For creator sources, we want to show CURRENT MONTHS real income in the list, not 0
                const currentMonthReal = getCurrentMonthRealAmount(src);
                
                const displayAmountArs = src.isCreatorSource 
                    ? currentMonthReal 
                    : (isUSD ? src.amount * dollarRate : src.amount);
                
                return (
                    <div 
                        key={src.id} 
                        onClick={() => setSelectedSourceId(src.id)}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-md relative overflow-hidden group ${
                            isActive 
                            ? 'bg-surface-light dark:bg-surface-dark border-slate-200 dark:border-slate-700' 
                            : 'bg-slate-50 dark:bg-slate-900/50 border-transparent opacity-60 hover:opacity-100'
                        }`}
                    >
                        {/* Status Stripe */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>

                        <div className="flex justify-between items-start pl-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-lg text-slate-900 dark:text-white">{src.name}</h4>
                                    {src.isCreatorSource && (
                                        <span className="bg-black text-white dark:bg-white dark:text-black text-[9px] font-bold px-1.5 rounded uppercase">Ads</span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                        src.frequency === 'BIWEEKLY' ? 'bg-purple-100 text-purple-600' : 
                                        src.frequency === 'ONE_TIME' ? 'bg-orange-100 text-orange-600' : 
                                        'bg-blue-100 text-blue-600'
                                    }`}>
                                        {src.frequency === 'BIWEEKLY' ? 'Quincenal' : src.frequency === 'ONE_TIME' ? 'Proyecto' : 'Mensual'}
                                    </span>
                                    {!isActive && <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-600 font-bold uppercase">Inactivo</span>}
                                    {isActive && src.endDate && (
                                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[10px]">event_busy</span>
                                            Fin: {src.endDate}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`font-black text-lg text-slate-900 dark:text-white transition-all duration-300 leading-none ${privacyMode ? 'blur-sm select-none' : ''}`}>
                                    {formatMoney(displayAmountArs)}
                                </div>
                                {src.isCreatorSource ? (
                                    <p className="text-[10px] text-emerald-500 font-bold mt-1">Este mes</p>
                                ) : (
                                    <>
                                        {isUSD && (
                                            <div className={`text-xs font-medium text-slate-400 mt-1 ${privacyMode ? 'blur-sm select-none' : ''}`}>
                                                ({formatUSD(src.amount)})
                                            </div>
                                        )}
                                        
                                        {isBiweekly && isActive && !isUSD && (
                                            <p className="text-[10px] text-slate-400 mt-1">Est. Mes: {formatMoney(src.amount * 2)}</p>
                                        )}
                                        {isBiweekly && isActive && isUSD && (
                                            <p className="text-[10px] text-slate-400 mt-1">Est. Mes: {formatMoney(src.amount * 2 * dollarRate)}</p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>

      </div>
    </div>
  );
};

export default IncomeManager;
