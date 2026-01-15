import React, { useState, useEffect } from 'react';
import { FinancialProfile } from '../types';

interface Props {
  onBack: () => void;
  profile?: FinancialProfile;
  onUpdateProfile?: (profile: FinancialProfile) => void;
}

interface DollarRate {
  compra: number;
  venta: number;
  casa: string;
  nombre: string;
  fechaActualizacion: string;
}

const CurrencyConverter: React.FC<Props> = ({ onBack, profile, onUpdateProfile }) => {
  const [amount, setAmount] = useState<string>('1000');
  const [direction, setDirection] = useState<'ARS_TO_USD' | 'USD_TO_ARS'>('ARS_TO_USD');
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  
  // Rate Selection
  const [selectedRateType, setSelectedRateType] = useState<'BLUE' | 'OFICIAL' | 'MANUAL'>('BLUE');
  const [rates, setRates] = useState<{blue: number, oficial: number}>({ blue: 1100, oficial: 980 });
  const [manualRate, setManualRate] = useState<string>(profile?.customDollarRate?.toString() || "1100");

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    setLoading(true);
    try {
        const response = await fetch('https://dolarapi.com/v1/dolares');
        const data: DollarRate[] = await response.json();
        
        const blue = data.find(d => d.casa === 'blue');
        const oficial = data.find(d => d.casa === 'oficial');

        if (blue && oficial) {
            setRates({
                blue: blue.venta,
                oficial: oficial.venta
            });
            setLastUpdated(new Date().toLocaleTimeString());
        }
    } catch (error) {
        console.error("Error fetching rates:", error);
    } finally {
        setLoading(false);
    }
  };

  const getActiveRate = () => {
      if (selectedRateType === 'BLUE') return rates.blue;
      if (selectedRateType === 'OFICIAL') return rates.oficial;
      return parseFloat(manualRate) || rates.blue;
  };

  const activeRate = getActiveRate();

  const handleManualRateChange = (val: string) => {
      setManualRate(val);
      // Persist manual rate if profile exists
      if (profile && onUpdateProfile && parseFloat(val) > 0) {
          onUpdateProfile({
              ...profile,
              customDollarRate: parseFloat(val)
          });
      }
  };

  const loadSalary = () => {
      // Calculate total monthly income
      const salary = (profile?.incomeSources || []).reduce((acc, src) => acc + src.amount, 0) || (profile?.monthlySalary || 0);
      if (salary > 0) {
          setAmount(salary.toString());
          setDirection('ARS_TO_USD');
      } else {
          alert("No tienes un sueldo configurado. Ve a 'Ingresos' para agregarlo.");
      }
  };

  const result = direction === 'ARS_TO_USD' 
    ? (parseFloat(amount) || 0) / activeRate
    : (parseFloat(amount) || 0) * activeRate;

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
                <h2 className="text-lg font-bold">Conversor a Dólar</h2>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                    {loading ? (
                        <span className="flex items-center gap-1"><span className="animate-spin material-symbols-outlined text-[10px]">refresh</span> Actualizando...</span>
                    ) : (
                        <span>Actualizado: {lastUpdated || 'Hoy'}</span>
                    )}
                </p>
            </div>
        </div>
      </div>

      <div className="flex-1 w-full max-w-lg mx-auto p-6 space-y-8 pb-24 animate-[fadeIn_0.3s_ease-out]">
        
        {/* Main Card */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 relative overflow-hidden">
           
           {/* Direction Toggle */}
           <div className="flex justify-center mb-6">
                <button 
                    onClick={() => setDirection(prev => prev === 'ARS_TO_USD' ? 'USD_TO_ARS' : 'ARS_TO_USD')}
                    className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <span className={direction === 'ARS_TO_USD' ? 'text-primary' : 'text-slate-500'}>ARS</span>
                    <span className="material-symbols-outlined text-slate-400">sync_alt</span>
                    <span className={direction === 'USD_TO_ARS' ? 'text-primary' : 'text-slate-500'}>USD</span>
                </button>
           </div>

           {/* Input Amount */}
           <div className="relative mb-8">
              <label className="text-xs font-bold text-slate-400 uppercase mb-2 block text-center">
                  Monto a Convertir ({direction === 'ARS_TO_USD' ? 'Pesos' : 'Dólares'})
              </label>
              <div className="flex items-center justify-center">
                 <span className="text-3xl font-bold text-slate-300 mr-2">{direction === 'ARS_TO_USD' ? '$' : 'US$'}</span>
                 <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-transparent text-center text-5xl font-black outline-none w-full max-w-[280px] placeholder-slate-200"
                    placeholder="0"
                    autoFocus
                 />
              </div>
              
              {/* Load Salary Button */}
              {profile && (
                  <div className="flex justify-center mt-2">
                      <button 
                        onClick={loadSalary}
                        className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1 rounded-lg transition-colors flex items-center gap-1"
                      >
                          <span className="material-symbols-outlined text-[14px]">payments</span>
                          Usar mi Sueldo
                      </button>
                  </div>
              )}
           </div>

           {/* Result */}
           <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-indigo-900 dark:to-slate-900 rounded-2xl p-6 text-center text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 size-24 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                <p className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">Resultado Estimado</p>
                <h2 className="text-4xl font-black">
                    {direction === 'ARS_TO_USD' ? 'US$ ' : '$ '}
                    {new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(result)}
                </h2>
                <p className="text-xs text-slate-400 mt-2 opacity-80">
                    Calculado con Dólar {selectedRateType === 'MANUAL' ? 'Personalizado' : selectedRateType === 'BLUE' ? 'Blue' : 'Oficial'} (${activeRate})
                </p>
           </div>

        </div>

        {/* Rate Settings */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400">settings</span>
                Configuración de Cotización
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <button 
                    onClick={() => setSelectedRateType('BLUE')}
                    className={`p-3 rounded-xl border text-left transition-all ${selectedRateType === 'BLUE' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                    <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Dólar Blue</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">${rates.blue}</p>
                </button>
                
                <button 
                    onClick={() => setSelectedRateType('OFICIAL')}
                    className={`p-3 rounded-xl border text-left transition-all ${selectedRateType === 'OFICIAL' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                    <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Oficial</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">${rates.oficial}</p>
                </button>

                <button 
                    onClick={() => setSelectedRateType('MANUAL')}
                    className={`p-3 rounded-xl border text-left transition-all ${selectedRateType === 'MANUAL' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                    <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Manual</p>
                    <div className="flex items-center gap-1">
                        <span className="text-lg font-bold text-slate-900 dark:text-white">$</span>
                        <input 
                            type="number" 
                            value={manualRate}
                            onChange={(e) => handleManualRateChange(e.target.value)}
                            onClick={(e) => { e.stopPropagation(); setSelectedRateType('MANUAL'); }}
                            className="bg-transparent w-full outline-none text-lg font-bold text-slate-900 dark:text-white min-w-0"
                        />
                    </div>
                </button>
            </div>
            
            <p className="text-[10px] text-slate-400 text-center">
                * Las cotizaciones se obtienen de dolarapi.com. La cotización manual se guardará en tu perfil.
            </p>
        </div>

      </div>
    </div>
  );
};

export default CurrencyConverter;