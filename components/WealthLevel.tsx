
import React, { useMemo } from 'react';
import { FinancialProfile, FinancialMetrics } from '../types';

interface Props {
  profile: FinancialProfile;
  metrics: FinancialMetrics;
  onBack: () => void;
}

const WealthLevel: React.FC<Props> = ({ profile, metrics, onBack }) => {
  const dollarRate = profile.customDollarRate || 1130;
  const balanceUSD = metrics.balance / dollarRate;

  // Sistema de 12 Niveles para gamificación constante
  const levels = [
    { 
        id: 1, 
        limit: 0, 
        name: 'Novato', 
        desc: 'El punto de partida. Todo imperio comienza aquí.', 
        icon: 'start', 
        color: 'from-slate-500 to-slate-700' 
    },
    { 
        id: 2, 
        limit: 500, 
        name: 'Explorador', 
        desc: 'Descubriendo el valor del ahorro.', 
        icon: 'hiking', 
        color: 'from-stone-400 to-stone-600' 
    },
    { 
        id: 3, 
        limit: 1000, 
        name: 'Ahorrador', 
        desc: 'Tu primer colchón de seguridad real.', 
        icon: 'savings', 
        color: 'from-orange-400 to-orange-600' 
    },
    { 
        id: 4, 
        limit: 5000, 
        name: 'Escudero', 
        desc: 'Protección sólida ante imprevistos.', 
        icon: 'shield', 
        color: 'from-amber-500 to-amber-700' 
    },
    { 
        id: 5, 
        limit: 10000, 
        name: 'Constructor', 
        desc: 'Cimentando las bases de tu patrimonio.', 
        icon: 'foundation', 
        color: 'from-blue-400 to-blue-600' 
    },
    { 
        id: 6, 
        limit: 25000, 
        name: 'Mercader', 
        desc: 'Tu capital empieza a tener peso.', 
        icon: 'storefront', 
        color: 'from-cyan-500 to-cyan-700' 
    },
    { 
        id: 7, 
        limit: 50000, 
        name: 'Capitán', 
        desc: 'Dirigiendo tu propio destino financiero.', 
        icon: 'sailing', 
        color: 'from-indigo-500 to-indigo-700' 
    },
    { 
        id: 8, 
        limit: 100000, 
        name: 'Inversionista', 
        desc: 'El dinero trabaja duro para ti. (6 Cifras)', 
        icon: 'trending_up', 
        color: 'from-emerald-500 to-emerald-700' 
    },
    { 
        id: 9, 
        limit: 250000, 
        name: 'Arquitecto', 
        desc: 'Diseñando una vida de libertad.', 
        icon: 'architecture', 
        color: 'from-violet-500 to-violet-700' 
    },
    { 
        id: 10, 
        limit: 500000, 
        name: 'Magnate', 
        desc: 'Medio millón. Poder financiero real.', 
        icon: 'domain', 
        color: 'from-fuchsia-600 to-purple-800' 
    },
    { 
        id: 11, 
        limit: 750000, 
        name: 'Soberano', 
        desc: 'Dominio casi total del juego.', 
        icon: 'crown', 
        color: 'from-rose-500 to-red-700' 
    },
    { 
        id: 12, 
        limit: 1000000, 
        name: 'Leyenda', 
        desc: 'El Club del Millón de Dólares.', 
        icon: 'diamond', 
        color: 'from-yellow-400 to-yellow-600' 
    }
  ];

  const currentLevelIndex = useMemo(() => {
      let idx = 0;
      for (let i = levels.length - 1; i >= 0; i--) {
          if (balanceUSD >= levels[i].limit) {
              idx = i;
              break;
          }
      }
      return idx;
  }, [balanceUSD]);

  const currentLevel = levels[currentLevelIndex];
  const nextLevel = levels[currentLevelIndex + 1];
  
  const progressPercent = nextLevel 
    ? Math.min(100, Math.max(0, ((balanceUSD - currentLevel.limit) / (nextLevel.limit - currentLevel.limit)) * 100))
    : 100;

  const formatUSD = (val: number) => {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
            <h2 className="text-lg font-bold">Mapa de Riqueza</h2>
            <p className="text-xs text-slate-500">Tu camino a la cima</p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-lg mx-auto p-6 pb-24 space-y-8 animate-[fadeIn_0.3s_ease-out]">
        
        {/* Main Status Card */}
        <div className={`rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden bg-gradient-to-br ${currentLevel.color}`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
                <div className="size-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 border border-white/30 shadow-inner">
                    <span className="material-symbols-outlined text-4xl">{currentLevel.icon}</span>
                </div>
                <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">Nivel Actual {currentLevel.id}</p>
                <h1 className="text-4xl font-black mb-2">{currentLevel.name}</h1>
                <p className="text-white/90 font-medium text-sm mb-6">{currentLevel.desc}</p>
                
                <div className="w-full bg-black/20 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                    <p className="text-xs text-white/70 uppercase tracking-widest font-bold mb-1">Patrimonio Neto</p>
                    <p className="text-3xl font-bold">{formatUSD(balanceUSD)}</p>
                </div>
            </div>
        </div>

        {/* Timeline Map */}
        <div className="relative pl-8 border-l-2 border-slate-200 dark:border-slate-800 space-y-12">
            {levels.map((lvl, idx) => {
                const isCompleted = idx <= currentLevelIndex;
                const isCurrent = idx === currentLevelIndex;
                const isNext = idx === currentLevelIndex + 1;

                return (
                    <div key={lvl.id} className={`relative group transition-all duration-500 ${!isCompleted && !isNext ? 'opacity-40 grayscale blur-[0.5px]' : 'opacity-100'}`}>
                        {/* Dot Indicator */}
                        <div className={`absolute -left-[41px] top-0 size-5 rounded-full border-4 border-background-light dark:border-background-dark transition-all z-10 ${isCompleted ? `bg-gradient-to-r ${lvl.color} scale-110` : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                        
                        {/* Level Card */}
                        <div className={`bg-surface-light dark:bg-surface-dark p-5 rounded-2xl border transition-all ${isCurrent ? 'border-primary shadow-lg ring-2 ring-primary/20 scale-[1.02]' : 'border-slate-200 dark:border-slate-700'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-3">
                                    <div className={`size-10 rounded-full flex items-center justify-center shadow-sm ${isCompleted ? `bg-gradient-to-br ${lvl.color} text-white` : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                        <span className="material-symbols-outlined text-[20px]">{lvl.icon}</span>
                                    </div>
                                    <div>
                                        <h3 className={`font-bold text-sm ${isCurrent ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>{lvl.name}</h3>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{formatUSD(lvl.limit)}</p>
                                    </div>
                                </div>
                                {isCompleted && !isCurrent && (
                                    <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                                )}
                                {isCurrent && (
                                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-full border border-primary/20">ACTUAL</span>
                                )}
                                {!isCompleted && (
                                    <span className="material-symbols-outlined text-slate-300 text-lg">lock</span>
                                )}
                            </div>
                            
                            {/* Progress bar for Next Level */}
                            {isNext && (
                                <div className="mt-4 animate-[fadeIn_0.5s_ease-out]">
                                    <div className="flex justify-between text-xs font-bold mb-1 text-slate-500">
                                        <span>Progreso al Nivel {lvl.id}</span>
                                        <span>{Math.round(progressPercent)}%</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                                        <div className={`h-full bg-gradient-to-r ${lvl.color} transition-all duration-1000 relative`} style={{ width: `${progressPercent}%` }}>
                                            <div className="absolute inset-0 bg-white/20 animate-[pulse_2s_infinite]"></div>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 text-right">
                                        Faltan <span className="font-bold text-slate-600 dark:text-slate-300">{formatUSD(lvl.limit - balanceUSD)}</span> para desbloquear
                                    </p>
                                </div>
                            )}
                            
                            {/* Description only for unlocked or next */}
                            {(isCompleted || isNext) && (
                                <p className="text-xs text-slate-500 mt-2 italic border-t border-slate-100 dark:border-slate-800 pt-2">{lvl.desc}</p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>

      </div>
    </div>
  );
};

export default WealthLevel;
