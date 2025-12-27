
import React, { useState, useMemo } from 'react';
import { FinancialProfile, IncomeSource, IncomePayment, MediaType, IncomeType } from '../types';

interface Props {
  profile: FinancialProfile;
  transactions: any[];
  onUpdateProfile: (profile: FinancialProfile) => void;
  onBack: () => void;
}

const IncomeManager: React.FC<Props> = ({ profile, onUpdateProfile, onBack }) => {
  const [sources, setSources] = useState<IncomeSource[]>(profile.incomeSources || []);
  
  // View State
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  
  // Adding State
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<IncomeType>('FIXED'); // 'FIXED', 'MEDIA', 'SPORADIC'

  // Form Fields
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceAmount, setNewSourceAmount] = useState('');
  
  // Media Specific State
  const [newMedium, setNewMedium] = useState<MediaType>('TV');
  const [newHours, setNewHours] = useState('');
  const [newDays, setNewDays] = useState('');

  // --- HELPERS ---

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateRates = (salary: number, hoursPerDay: number, daysPerWeek: number) => {
      // Promedio semanas por mes: 4.33
      if (!hoursPerDay || !daysPerWeek) return { hourly: 0, perProgram: 0 };
      
      const monthlyDays = daysPerWeek * 4.33;
      const monthlyHours = monthlyDays * hoursPerDay;
      
      return {
          hourly: monthlyHours > 0 ? salary / monthlyHours : 0,
          perProgram: monthlyDays > 0 ? salary / monthlyDays : 0
      };
  };

  const getMediumConfig = (medium: MediaType = 'OTRO') => {
      switch (medium) {
          case 'TV': return { icon: 'tv', color: 'blue', label: 'TV' };
          case 'RADIO': return { icon: 'mic', color: 'orange', label: 'Radio' };
          case 'STREAM': return { icon: 'podcasts', color: 'purple', label: 'Stream' };
          case 'REDACCION': return { icon: 'article', color: 'slate', label: 'Redacción' };
          case 'EVENTO': return { icon: 'confirmation_number', color: 'pink', label: 'Evento' };
          default: return { icon: 'work', color: 'emerald', label: 'Trabajo' };
      }
  };

  // --- LOGIC: MAIN LIST ---

  const totalFixedIncome = sources
    .filter(s => s.type !== 'SPORADIC') // Solo sumamos lo fijo/mensual al total proyectado
    .reduce((acc, src) => acc + src.amount, 0);
  
  // Calculo de valor hora promedio global (Solo para MEDIOS)
  const globalStats = useMemo(() => {
      let totalSalary = 0;
      let totalHours = 0;
      
      sources.filter(s => s.type === 'MEDIA').forEach(src => {
          totalSalary += src.amount;
          if (src.hoursPerDay && src.daysPerWeek) {
              totalHours += (src.hoursPerDay * src.daysPerWeek * 4.33);
          }
      });

      return {
          avgHourly: totalHours > 0 ? totalSalary / totalHours : 0,
          totalHoursMonth: totalHours
      };
  }, [sources]);

  const handleAddSource = () => {
    if (!newSourceName) return;
    
    // Para Sporadic el monto es opcional (puede ser 0)
    const amountVal = parseFloat(newSourceAmount) || 0;
    if (activeTab !== 'SPORADIC' && amountVal <= 0) return; 

    const newSource: IncomeSource = {
      id: Date.now().toString(),
      name: newSourceName,
      amount: amountVal,
      payments: [],
      type: activeTab,
      // Solo si es Media
      medium: activeTab === 'MEDIA' ? newMedium : undefined,
      hoursPerDay: activeTab === 'MEDIA' ? parseFloat(newHours) || 0 : undefined,
      daysPerWeek: activeTab === 'MEDIA' ? parseFloat(newDays) || 0 : undefined
    };

    const updatedSources = [...sources, newSource];
    setSources(updatedSources);
    onUpdateProfile({ ...profile, incomeSources: updatedSources });
    
    // Reset
    setNewSourceName('');
    setNewSourceAmount('');
    setNewHours('');
    setNewDays('');
    setIsAdding(false);
  };

  const handleDeleteSource = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(window.confirm("¿Eliminar este ingreso y su historial?")) {
          const updated = sources.filter(s => s.id !== id);
          setSources(updated);
          onUpdateProfile({ ...profile, incomeSources: updated });
          if(selectedSourceId === id) setSelectedSourceId(null);
      }
  }

  // --- LOGIC: DETAIL VIEW ---
  
  const handleUpdatePayment = (sourceId: string, updatedPayment: IncomePayment) => {
    const sourceIndex = sources.findIndex(s => s.id === sourceId);
    if (sourceIndex === -1) return;

    const source = sources[sourceIndex];
    const existingPaymentIndex = source.payments.findIndex(p => p.month === updatedPayment.month);
    
    let newPayments = [...source.payments];
    if (existingPaymentIndex >= 0) {
      newPayments[existingPaymentIndex] = updatedPayment;
    } else {
      newPayments.push(updatedPayment);
    }

    const updatedSource = { ...source, payments: newPayments };
    const newSources = [...sources];
    newSources[sourceIndex] = updatedSource;
    setSources(newSources);
    onUpdateProfile({ ...profile, incomeSources: newSources });
  };

  const selectedSource = sources.find(s => s.id === selectedSourceId);
  const monthsList = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // --- RENDER ---

  if (selectedSource) {
     // VISTA DETALLE: HISTORIAL DE PAGOS
     return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
           <div className="sticky top-0 z-20 bg-surface-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedSourceId(null)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                   <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div>
                   <h2 className="text-lg font-bold leading-none">{selectedSource.name}</h2>
                   <p className="text-xs text-slate-500">
                       {selectedSource.type === 'SPORADIC' ? 'Facturaciones Eventuales' : 'Historial de Pagos'}
                   </p>
                </div>
              </div>
           </div>
           
           <div className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-6 space-y-6 pb-24">
              
              {selectedSource.type === 'MEDIA' && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                      <h3 className="text-blue-800 dark:text-blue-300 font-bold text-sm mb-2 flex items-center gap-2">
                          <span className="material-symbols-outlined">info</span>
                          Métricas del Contrato
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                              <p className="text-slate-500">Valor Hora</p>
                              <p className="font-bold text-slate-900 dark:text-white">
                                  {formatMoney(calculateRates(selectedSource.amount, selectedSource.hoursPerDay || 0, selectedSource.daysPerWeek || 0).hourly)}
                              </p>
                          </div>
                          <div>
                              <p className="text-slate-500">Por Programa</p>
                              <p className="font-bold text-slate-900 dark:text-white">
                                  {formatMoney(calculateRates(selectedSource.amount, selectedSource.hoursPerDay || 0, selectedSource.daysPerWeek || 0).perProgram)}
                              </p>
                          </div>
                      </div>
                  </div>
              )}

              {/* Year Selector */}
              <div className="flex items-center justify-center gap-6 bg-surface-light dark:bg-surface-dark p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                 <button onClick={() => setViewYear(viewYear - 1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><span className="material-symbols-outlined">chevron_left</span></button>
                 <span className="text-xl font-black">{viewYear}</span>
                 <button onClick={() => setViewYear(viewYear + 1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><span className="material-symbols-outlined">chevron_right</span></button>
              </div>

              <div className="space-y-3">
                 {monthsList.map((monthName, index) => {
                    const monthKey = `${viewYear}-${String(index + 1).padStart(2, '0')}`;
                    const payment = selectedSource.payments.find(p => p.month === monthKey);
                    const currentAmount = payment?.realAmount ?? 0;
                    
                    // Si es esporádico, placeholder es 0, si es fijo, es el sueldo base
                    const placeholder = selectedSource.type === 'SPORADIC' ? "0" : selectedSource.amount.toString();
                    
                    return (
                       <div key={monthName} className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${payment?.realAmount && payment.realAmount > 0 ? 'bg-surface-light dark:bg-surface-dark border-primary/30' : 'bg-surface-light dark:bg-surface-dark border-slate-200 dark:border-slate-700 opacity-80'}`}>
                          <div className="flex items-center gap-3">
                             <div className={`size-10 rounded-full flex items-center justify-center font-bold text-xs ${payment?.realAmount && payment.realAmount > 0 ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                 {monthName.substring(0, 3)}
                             </div>
                             <div>
                                 <span className="font-bold">{monthName}</span>
                                 {selectedSource.type === 'SPORADIC' && payment?.notes && (
                                     <span className="block text-[10px] text-slate-500 truncate max-w-[100px]">{payment.notes}</span>
                                 )}
                             </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <input 
                                type="number" 
                                className="w-24 bg-slate-50 dark:bg-slate-900 rounded-lg px-2 py-1 text-right font-bold outline-none"
                                placeholder={placeholder}
                                value={currentAmount || ''}
                                onChange={(e) => handleUpdatePayment(selectedSource.id, {
                                    month: monthKey, realAmount: parseFloat(e.target.value), isPaid: payment?.isPaid || false, isInvoiceSent: payment?.isInvoiceSent || false, notes: payment?.notes
                                })}
                             />
                             <div className="flex gap-1">
                                <button 
                                    onClick={() => handleUpdatePayment(selectedSource.id, { month: monthKey, realAmount: currentAmount || selectedSource.amount, isPaid: !(payment?.isPaid), isInvoiceSent: payment?.isInvoiceSent || false, notes: payment?.notes })} 
                                    className={`size-8 rounded-full flex items-center justify-center transition-colors ${payment?.isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}
                                    title="Cobrado"
                                >
                                    <span className="material-symbols-outlined text-lg">attach_money</span>
                                </button>
                                {selectedSource.type === 'SPORADIC' && (
                                    <button 
                                        onClick={() => handleUpdatePayment(selectedSource.id, { month: monthKey, realAmount: currentAmount, isPaid: payment?.isPaid || false, isInvoiceSent: !(payment?.isInvoiceSent), notes: payment?.notes })} 
                                        className={`size-8 rounded-full flex items-center justify-center transition-colors ${payment?.isInvoiceSent ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400'}`}
                                        title="Factura Enviada"
                                    >
                                        <span className="material-symbols-outlined text-lg">receipt_long</span>
                                    </button>
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
  }

  // VISTA PRINCIPAL
  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      <div className="sticky top-0 z-10 bg-surface-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold">Mis Ingresos</h2>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto p-6 space-y-8 pb-24">
        
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 size-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2 opacity-80">
                        <span className="material-symbols-outlined text-sm">payments</span>
                        <span className="text-xs font-bold uppercase tracking-widest">Fijo Mensual Est.</span>
                    </div>
                    <h2 className="text-4xl font-black tracking-tight">{formatMoney(totalFixedIncome)}</h2>
                </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-2 text-slate-500">
                        <span className="material-symbols-outlined text-sm">timelapse</span>
                        <span className="text-xs font-bold uppercase tracking-widest">Valor Hora (Medios)</span>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white">
                        {formatMoney(globalStats.avgHourly)}<span className="text-sm font-medium text-slate-400">/hr</span>
                    </h2>
                </div>
            </div>
        </div>

        {/* Action Button */}
        {!isAdding && (
            <button 
                onClick={() => setIsAdding(true)}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold p-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
                <span className="material-symbols-outlined">add_circle</span>
                Agregar Ingreso
            </button>
        )}

        {/* Add Form */}
        {isAdding && (
             <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl animate-[fadeIn_0.2s_ease-out]">
                <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">edit_document</span>
                    Nuevo Ingreso
                </h4>

                {/* TABS */}
                <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl mb-6">
                    <button 
                        onClick={() => setActiveTab('FIXED')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'FIXED' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
                    >
                        Sueldo Fijo
                    </button>
                    <button 
                        onClick={() => setActiveTab('MEDIA')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'MEDIA' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}
                    >
                        Medios/TV
                    </button>
                    <button 
                        onClick={() => setActiveTab('SPORADIC')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'SPORADIC' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-500' : 'text-slate-500'}`}
                    >
                        Facturación
                    </button>
                </div>
                
                <div className="space-y-5">
                    
                    {activeTab === 'MEDIA' && (
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Tipo de Medio</label>
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {(['TV', 'RADIO', 'STREAM', 'REDACCION', 'EVENTO'] as MediaType[]).map(m => {
                                    const conf = getMediumConfig(m);
                                    return (
                                        <button 
                                            key={m}
                                            onClick={() => setNewMedium(m)}
                                            className={`flex flex-col items-center gap-1 p-3 rounded-xl border min-w-[80px] transition-all ${newMedium === m ? `bg-${conf.color}-50 border-${conf.color}-500 text-${conf.color}-700 dark:bg-${conf.color}-900/30 dark:text-${conf.color}-300 ring-1 ring-${conf.color}-500` : 'bg-slate-50 dark:bg-slate-900 border-transparent opacity-60 hover:opacity-100'}`}
                                        >
                                            <span className="material-symbols-outlined">{conf.icon}</span>
                                            <span className="text-[10px] font-bold">{conf.label}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    <div className="relative">
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                            {activeTab === 'MEDIA' ? 'Nombre del Programa' : activeTab === 'FIXED' ? 'Empresa / Empleador' : 'Cliente / Concepto'}
                        </label>
                        <input 
                            type="text" 
                            className="w-full bg-slate-50 dark:bg-slate-900 p-3 rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold"
                            placeholder={activeTab === 'MEDIA' ? "Ej. Mañanísima" : "Ej. Trabajo Oficina"}
                            value={newSourceName}
                            onChange={(e) => setNewSourceName(e.target.value)}
                        />
                    </div>

                    <div className="relative">
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                             {activeTab === 'SPORADIC' ? 'Monto Estimado (Opcional)' : 'Monto Mensual'}
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                            <input 
                                type="number" 
                                className="w-full bg-slate-50 dark:bg-slate-900 p-3 pl-8 rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold text-lg"
                                placeholder="0"
                                value={newSourceAmount}
                                onChange={(e) => setNewSourceAmount(e.target.value)}
                            />
                        </div>
                    </div>

                    {activeTab === 'MEDIA' && (
                        <div className="grid grid-cols-2 gap-4 animate-[fadeIn_0.2s_ease-out]">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Horas x Día</label>
                                <input 
                                    type="number" 
                                    className="w-full bg-slate-50 dark:bg-slate-900 p-3 rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold"
                                    placeholder="Ej. 2"
                                    value={newHours}
                                    onChange={(e) => setNewHours(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Días x Semana</label>
                                <input 
                                    type="number" 
                                    className="w-full bg-slate-50 dark:bg-slate-900 p-3 rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold"
                                    placeholder="Ej. 5"
                                    value={newDays}
                                    onChange={(e) => setNewDays(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button onClick={handleAddSource} className="flex-1 bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20">Guardar</button>
                        <button onClick={() => setIsAdding(false)} className="px-6 py-3 font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-xl">Cancelar</button>
                    </div>
                </div>
             </div>
        )}

        {/* Source List */}
        <div className="space-y-4">
            {sources.map(src => {
                // Determine display type (Legacy fallback to FIXED)
                const type = src.type || (src.medium ? 'MEDIA' : 'FIXED');
                
                const conf = type === 'MEDIA' ? getMediumConfig(src.medium) : 
                             type === 'SPORADIC' ? { icon: 'receipt_long', color: 'purple', label: 'Facturación' } : 
                             { icon: 'work', color: 'emerald', label: 'Fijo' };

                const rates = type === 'MEDIA' ? calculateRates(src.amount, src.hoursPerDay || 0, src.daysPerWeek || 0) : null;

                return (
                    <div 
                        key={src.id}
                        onClick={() => setSelectedSourceId(src.id)}
                        className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer group relative"
                    >
                        <button 
                            onClick={(e) => handleDeleteSource(e, src.id)}
                            className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>

                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`size-12 rounded-xl flex items-center justify-center bg-${conf.color}-100 dark:bg-${conf.color}-900/30 text-${conf.color}-600 dark:text-${conf.color}-400`}>
                                    <span className="material-symbols-outlined">{conf.icon}</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{src.name}</h4>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500`}>
                                        {conf.label}
                                    </span>
                                </div>
                            </div>
                            {type !== 'SPORADIC' && (
                                <div className="text-right pr-8">
                                    <p className="font-black text-lg">{formatMoney(src.amount)}</p>
                                    <p className="text-xs text-slate-400">Mensual</p>
                                </div>
                            )}
                            {type === 'SPORADIC' && (
                                <div className="text-right pr-8">
                                    <p className="font-bold text-lg text-purple-500">Eventual</p>
                                    <p className="text-xs text-slate-400">Facturación</p>
                                </div>
                            )}
                        </div>

                        {/* Rate Grid only for Media */}
                        {type === 'MEDIA' && rates && (
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Por Programa</p>
                                    <p className="font-bold text-slate-700 dark:text-slate-200">{formatMoney(rates.perProgram)}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Por Hora</p>
                                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(rates.hourly)}</p>
                                </div>
                            </div>
                        )}
                        
                        {type === 'MEDIA' && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                                <span className="material-symbols-outlined text-sm">schedule</span>
                                <span>{src.hoursPerDay}h diarias • {src.daysPerWeek} días/sem</span>
                            </div>
                        )}

                        {type === 'SPORADIC' && (
                             <div className="mt-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg">
                                 Ingresa aquí para registrar facturas de meses específicos.
                             </div>
                        )}
                    </div>
                );
            })}
        </div>

      </div>
    </div>
  );
};

export default IncomeManager;
