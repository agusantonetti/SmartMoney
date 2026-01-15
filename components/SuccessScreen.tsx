
import React, { useMemo } from 'react';
import { FinancialMetrics } from '../types';

interface Props {
  onBack: () => void;
  metrics?: FinancialMetrics;
}

const SuccessScreen: React.FC<Props> = ({ onBack, metrics }) => {
  
  // Helpers
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);
  };

  // Calcular Nivel Actual de Riqueza
  const wealthData = useMemo(() => {
    const balance = metrics?.balance || 0;
    
    // Niveles definidos
    const levels = [
        { limit: 0, name: 'Iniciando', icon: 'flag' },
        { limit: 100000, name: 'Ahorrador', icon: 'savings' },
        { limit: 1000000, name: 'Constructor', icon: 'foundation' },
        { limit: 10000000, name: 'Inversionista', icon: 'auto_graph' },
        { limit: 50000000, name: 'Magnate', icon: 'diamond' }
    ];

    // Encontrar nivel actual
    let currentLevelIndex = 0;
    for(let i = levels.length - 1; i >= 0; i--) {
        if(balance >= levels[i].limit) {
            currentLevelIndex = i;
            break;
        }
    }

    const currentLevel = levels[currentLevelIndex];
    const nextLevel = levels[currentLevelIndex + 1] || { limit: balance * 2, name: 'Dominio Total', icon: 'globe' };
    
    // Calcular progreso al siguiente nivel
    const range = nextLevel.limit - currentLevel.limit;
    const progress = range > 0 ? Math.min(100, Math.max(0, ((balance - currentLevel.limit) / range) * 100)) : 100;
    const remaining = nextLevel.limit - balance;

    return { currentLevel, nextLevel, progress, remaining };
  }, [metrics]);

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-[#0d131b] dark:text-white transition-colors duration-200 relative flex h-screen w-full flex-col overflow-hidden">
      {/* Top Navigation */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2636] px-10 py-4 z-20">
        <div className="flex items-center gap-4">
          <div className="size-8 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined filled text-3xl">account_balance_wallet</span>
          </div>
          <h2 className="text-[#0d131b] dark:text-white text-xl font-bold leading-tight tracking-[-0.015em]">Smart Money</h2>
        </div>
      </header>

      {/* Main Layout with Blurred Background */}
      <main className="flex-1 relative flex items-center justify-center p-4">
        {/* Abstract background shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[10%] left-[10%] w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[20%] right-[15%] w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-[40%] left-[60%] w-48 h-48 bg-yellow-400/10 rounded-full blur-3xl"></div>
        </div>
        
        {/* Overlay for Focus */}
        <div className="absolute inset-0 bg-slate-900/10 dark:bg-black/40 backdrop-blur-[2px] z-10"></div>
        
        {/* Wealth Update Card */}
        <div className="relative z-20 w-full max-w-lg animate-[zoomIn_0.3s_ease-out]">
          <div className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] p-1 border border-white/20 dark:border-slate-700 overflow-hidden">
            
            {/* Dark Premium Header */}
            <div className="relative h-40 bg-slate-900 flex items-center justify-center overflow-hidden rounded-t-[2rem]">
               <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
               </div>
               
               <div className="text-center relative z-10">
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mb-2">ESTATUS FINANCIERO</p>
                   <div className="flex items-center gap-2 text-yellow-400 justify-center">
                       <span className="material-symbols-outlined text-3xl filled">{wealthData.currentLevel.icon}</span>
                       <h2 className="text-3xl font-black text-white">{wealthData.currentLevel.name}</h2>
                   </div>
               </div>
            </div>
            
            {/* Card Body */}
            <div className="pt-8 pb-8 px-8 flex flex-col items-center">
              
              <div className="w-full text-center mb-8">
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Patrimonio Neto Actual</p>
                  <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-6">
                      {formatMoney(metrics?.balance || 0)}
                  </h1>

                  {/* Progress to Next Level */}
                  <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <div className="flex justify-between items-end mb-2">
                          <span className="text-xs font-bold text-slate-500 uppercase">Siguiente: {wealthData.nextLevel.name}</span>
                          <span className="text-xs font-bold text-primary">{Math.round(wealthData.progress)}%</span>
                      </div>
                      <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                            style={{ width: `${wealthData.progress}%` }}
                          ></div>
                      </div>
                      <p className="text-[10px] text-slate-400 text-right">
                          Faltan {formatMoney(wealthData.remaining)}
                      </p>
                  </div>
              </div>
              
              {/* Actions */}
              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={onBack} 
                  className="w-full bg-primary hover:bg-blue-600 text-white font-bold h-14 rounded-full shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
                >
                  <span>Continuar Creciendo</span>
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">trending_up</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <style>{`
        @keyframes zoomIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SuccessScreen;
