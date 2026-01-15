import React, { useState, useEffect } from 'react';

interface Props {
  onBack: () => void;
}

// Tasas de cambio base (estimadas contra ARS para el ejemplo, en prod usar API)
const CURRENCIES = [
  { code: 'ARS', name: 'Peso Argentino', flag: '🇦🇷', rate: 1, symbol: '$' },
  { code: 'USD', name: 'Dólar Blue', flag: '🇺🇸', rate: 1100, symbol: 'US$' }, // Blue
  { code: 'USD_OFF', name: 'Dólar Oficial', flag: '🏦', rate: 980, symbol: 'US$' },
  { code: 'EUR', name: 'Euro Blue', flag: '🇪🇺', rate: 1200, symbol: '€' },
  { code: 'MXN', name: 'Peso Mexicano', flag: '🇲🇽', rate: 0.9, symbol: 'Mex$' },
  { code: 'BRL', name: 'Real Brasileño', flag: '🇧🇷', rate: 200, symbol: 'R$' },
  { code: 'CLP', name: 'Peso Chileno', flag: '🇨🇱', rate: 1.2, symbol: 'CLP$' }, // 1000 CLP = 1200 ARS approx logic check
  { code: 'UYU', name: 'Peso Uruguayo', flag: '🇺🇾', rate: 28, symbol: '$U' },
];

const CurrencyConverter: React.FC<Props> = ({ onBack }) => {
  const [amount, setAmount] = useState<string>('1');
  const [fromCurrency, setFromCurrency] = useState(CURRENCIES[1]); // USD Default
  const [toCurrency, setToCurrency] = useState(CURRENCIES[0]); // ARS Default
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Lógica de conversión: (Amount * FromRate) / ToRate
  // Nota: Como todas las tasas están basadas en ARS (Base 1), la fórmula funciona.
  const convertedAmount = amount 
    ? (parseFloat(amount) * fromCurrency.rate) / toCurrency.rate 
    : 0;

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const formatResult = (val: number, symbol: string) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD', // Hack para formato
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val).replace('US$', symbol); // Reemplazar símbolo manualmente
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
           <h2 className="text-lg font-bold">Conversor</h2>
           <p className="text-xs text-slate-500 flex items-center gap-1">
             <span className="size-1.5 rounded-full bg-emerald-500"></span>
             Tasas actualizadas hoy
           </p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-lg mx-auto p-6 space-y-8 pb-24 animate-[fadeIn_0.3s_ease-out]">
        
        {/* Main Converter Card */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 relative">
           
           {/* FROM */}
           <div className="relative z-10">
              <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Tengo</label>
              <div className="flex gap-3 items-center bg-slate-50 dark:bg-slate-900/50 p-2 rounded-2xl border border-transparent focus-within:border-primary/50 transition-colors">
                 <select 
                    value={fromCurrency.code}
                    onChange={(e) => setFromCurrency(CURRENCIES.find(c => c.code === e.target.value) || CURRENCIES[0])}
                    className="bg-white dark:bg-slate-800 py-3 pl-3 pr-8 rounded-xl font-bold text-lg outline-none appearance-none shadow-sm cursor-pointer min-w-[120px]"
                    style={{ backgroundImage: 'none' }}
                 >
                    {CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                    ))}
                 </select>
                 <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 bg-transparent text-right text-3xl font-black outline-none w-full min-w-0"
                    placeholder="0"
                    autoFocus
                 />
              </div>
              <p className="text-right text-xs text-slate-400 mt-1 mr-2">{fromCurrency.name}</p>
           </div>

           {/* SWAP BUTTON */}
           <div className="flex justify-center -my-3 relative z-20">
              <button 
                onClick={handleSwap}
                className="size-12 rounded-full bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
              >
                 <span className="material-symbols-outlined">swap_vert</span>
              </button>
           </div>

           {/* TO */}
           <div className="relative z-10 bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-4 pt-8 -mt-4">
              <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Recibo (Estimado)</label>
              <div className="flex justify-between items-center mb-2">
                 <select 
                    value={toCurrency.code}
                    onChange={(e) => setToCurrency(CURRENCIES.find(c => c.code === e.target.value) || CURRENCIES[0])}
                    className="bg-transparent py-2 font-bold text-lg outline-none cursor-pointer"
                 >
                    {CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.code} - {c.name}</option>
                    ))}
                 </select>
                 <span className="material-symbols-outlined text-slate-400">expand_more</span>
              </div>
              
              <div className="text-right">
                 <h2 className="text-4xl font-black text-primary truncate">
                    {formatResult(convertedAmount, toCurrency.symbol)}
                 </h2>
                 <p className="text-xs text-slate-500 mt-1">
                    1 {fromCurrency.code} = {((fromCurrency.rate / toCurrency.rate)).toFixed(2)} {toCurrency.code}
                 </p>
              </div>
           </div>
        </div>

        {/* Quick Table */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400">table_chart</span>
                Tabla de Conversión Rápida
            </h3>
            <div className="space-y-2">
                {[1, 10, 50, 100].map(val => (
                    <div key={val} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                        <span className="font-medium text-slate-500">{val} {fromCurrency.code}</span>
                        <span className="material-symbols-outlined text-xs text-slate-300">arrow_right_alt</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                            {formatResult((val * fromCurrency.rate) / toCurrency.rate, toCurrency.symbol)}
                        </span>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};

export default CurrencyConverter;