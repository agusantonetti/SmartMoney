
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

  const levels = [
    { 
        id: 1, 
        limit: 0, 
        name: 'Semilla', 
        desc: 'El comienzo de todo gran imperio.', 
        icon: 'spa', 
        color: 'from-slate-400 to-slate-600' 
    },
    { 
        id: 2, 
        limit: 1000, 
        name: 'Ahorrador', 
        desc: 'Primeros pasos de seguridad.', 
        icon: 'account_balance', 
        color: 'from-orange-400 to-orange-600' 
    },
    { 
        id: 3, 
        limit: 10000, 
        name: 'Constructor', 
        desc: 'Cimentando bases sólidas.', 
        icon: 'foundation', 
        color: 'from-blue-400 to-blue-600' 
    },
    { 
        id: 4, 
        limit: 100000, 
        name: 'Inversionista', 
        desc: 'El dinero trabaja para ti.', 
        icon: 'trending_up', 
        color: 'from-emerald-400 to-emerald-600' 
    },
    { 
        id: 5, 
        limit: 500000, 
        name: 'Magnate', 
        desc: 'Libertad financiera a la vista.', 
        icon: 'auto_graph', 
        color: 'from-purple-500 to-purple-700' 
    },
    { 
        id: 6, 
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
            <p className="text-xs text-slate-500">Tu camino al millón</p>
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
                <h1 className="text-4xl font-black mb-1">{currentLevel.name}</h1>
                <p className="text-white/80 font-medium text-sm mb-6">{currentLevel.desc}</p>
                
                <div className="w-full bg-black/20 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                    <p className="text-xs text-white/70 uppercase tracking-widest font-bold mb-1">Patrimonio Actual</p>
                    <p className="text-3xl font-bold">{formatUSD(balanceUSD)}</p>
                </div>
            </div>
        </div>

        {/* Timeline */}
        <div className="relative pl-8 border-l-2 border-slate-200 dark:border-slate-800 space-y-12">
            {levels.map((lvl, idx) => {
                const isCompleted = idx <= currentLevelIndex;
                const isCurrent = idx === currentLevelIndex;
                const isNext = idx === currentLevelIndex + 1;

                return (
                    <div key={lvl.id} className={`relative group ${!isCompleted && !isNext ? 'opacity-50 blur-[1px]' : 'opacity-100'}`}>
                        {/* Dot */}
                        <div className={`absolute -left-[41px] top-0 size-5 rounded-full border-4 border-background-light dark:border-background-dark transition-all ${isCompleted ? `bg-gradient-to-r ${lvl.color}` : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                        
                        {/* Content */}
                        <div className={`bg-surface-light dark:bg-surface-dark p-5 rounded-2xl border transition-all ${isCurrent ? 'border-primary shadow-lg ring-1 ring-primary/20' : 'border-slate-200 dark:border-slate-700'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-3">
                                    <div className={`size-10 rounded-full flex items-center justify-center ${isCompleted ? `bg-gradient-to-br ${lvl.color} text-white` : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                        <span className="material-symbols-outlined text-[20px]">{lvl.icon}</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">{lvl.name}</h3>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{formatUSD(lvl.limit)}</p>
                                    </div>
                                </div>
                                {isCompleted && (
                                    <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                                )}
                                {!isCompleted && (
                                    <span className="material-symbols-outlined text-slate-300">lock</span>
                                )}
                            </div>
                            
                            {isNext && (
                                <div className="mt-4">
                                    <div className="flex justify-between text-xs font-bold mb-1 text-slate-500">
                                        <span>Progreso</span>
                                        <span>{Math.round(progressPercent)}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 text-right">
                                        Faltan {formatUSD(lvl.limit - balanceUSD)}
                                    </p>
                                </div>
                            )}
                            
                            {!isNext && (
                                <p className="text-xs text-slate-500 mt-2 italic">{lvl.desc}</p>
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
