
import React, { useMemo } from 'react';
import { FinancialProfile, Transaction, FinancialMetrics } from '../types';

interface Props {
  profile: FinancialProfile;
  transactions: Transaction[];
  metrics: FinancialMetrics;
  onBack: () => void;
}

interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    isUnlocked: boolean;
    progress: number; // 0 to 100
    targetDisplay: string;
    category: 'saver' | 'tracker' | 'planner' | 'debt';
}

const Achievements: React.FC<Props> = ({ profile, transactions, metrics, onBack }) => {

  const achievements: Achievement[] = useMemo(() => {
      const list: Achievement[] = [];
      
      // 1. TRACKER (Constancia en registros)
      const txCount = transactions.length;
      list.push({
          id: 'track_1', title: 'Primeros Pasos', description: 'Registra tus primeros 5 movimientos.',
          icon: 'footprint', tier: 'bronze', category: 'tracker',
          isUnlocked: txCount >= 5, progress: Math.min(100, (txCount/5)*100), targetDisplay: `${txCount}/5`
      });
      list.push({
          id: 'track_2', title: 'Hábito Formado', description: 'Registra 50 movimientos.',
          icon: 'edit_calendar', tier: 'silver', category: 'tracker',
          isUnlocked: txCount >= 50, progress: Math.min(100, (txCount/50)*100), targetDisplay: `${txCount}/50`
      });
      list.push({
          id: 'track_3', title: 'Maestro del Registro', description: 'Supera los 200 movimientos registrados.',
          icon: 'history_edu', tier: 'gold', category: 'tracker',
          isUnlocked: txCount >= 200, progress: Math.min(100, (txCount/200)*100), targetDisplay: `${txCount}/200`
      });

      // 2. SAVER (Apartados y Reservas)
      const bucketsCount = profile.savingsBuckets?.length || 0;
      const totalSaved = metrics.totalReserved;
      list.push({
          id: 'save_1', title: 'Visionario', description: 'Crea tu primer apartado de ahorro.',
          icon: 'savings', tier: 'bronze', category: 'saver',
          isUnlocked: bucketsCount >= 1, progress: bucketsCount >= 1 ? 100 : 0, targetDisplay: bucketsCount >= 1 ? '¡Listo!' : '0/1'
      });
      list.push({
          id: 'save_2', title: 'Colchón de Seguridad', description: 'Ten al menos $100,000 en apartados activos.',
          icon: 'shield', tier: 'silver', category: 'saver',
          isUnlocked: totalSaved >= 100000, progress: Math.min(100, (totalSaved/100000)*100), targetDisplay: `$${(totalSaved/1000).toFixed(0)}k / $100k`
      });

      // 3. PLANNER (Eventos y Presupuestos)
      const eventsCount = profile.events?.length || 0;
      const limitsCount = Object.keys(profile.budgetLimits || {}).length;
      list.push({
          id: 'plan_1', title: 'El Arquitecto', description: 'Define límites de gasto para 3 categorías.',
          icon: 'tune', tier: 'bronze', category: 'planner',
          isUnlocked: limitsCount >= 3, progress: Math.min(100, (limitsCount/3)*100), targetDisplay: `${limitsCount}/3`
      });
      list.push({
          id: 'plan_2', title: 'Trotamundos', description: 'Crea tu primer evento de viaje.',
          icon: 'flight', tier: 'silver', category: 'planner',
          isUnlocked: eventsCount >= 1, progress: eventsCount >= 1 ? 100 : 0, targetDisplay: eventsCount >= 1 ? '¡Listo!' : '0/1'
      });

      // 4. DEBT SLAYER
      const hasDebtsConfigured = (profile.debts?.length || 0) > 0;
      const remainingDebt = (profile.debts || []).reduce((acc, d) => acc + (d.totalAmount - d.currentAmount), 0);
      
      list.push({
          id: 'debt_1', title: 'Libre como el Viento', description: 'No tener deudas pendientes (o pagarlas todas).',
          icon: 'sentiment_satisfied', tier: 'platinum', category: 'debt',
          isUnlocked: hasDebtsConfigured && remainingDebt <= 0, 
          progress: (hasDebtsConfigured && remainingDebt <= 0) ? 100 : hasDebtsConfigured ? 10 : 0,
          targetDisplay: remainingDebt <= 0 ? '¡Libre!' : 'Pendiente'
      });

      return list;
  }, [transactions, profile, metrics]);

  const unlockedCount = achievements.filter(a => a.isUnlocked).length;
  const totalCount = achievements.length;
  const completionPercentage = (unlockedCount / totalCount) * 100;

  // Colors based on tiers
  const getTierColor = (tier: string) => {
      switch(tier) {
          case 'bronze': return 'from-orange-700 to-amber-700'; // Bronce
          case 'silver': return 'from-slate-400 to-slate-500'; // Plata
          case 'gold': return 'from-yellow-400 to-yellow-600'; // Oro
          case 'platinum': return 'from-cyan-400 to-blue-600'; // Platino
          default: return 'from-slate-700 to-slate-800';
      }
  };

  const getIconColor = (tier: string, unlocked: boolean) => {
      if (!unlocked) return 'text-slate-300';
      switch(tier) {
          case 'bronze': return 'text-amber-700';
          case 'silver': return 'text-slate-400';
          case 'gold': return 'text-yellow-500';
          case 'platinum': return 'text-cyan-400';
          default: return 'text-slate-500';
      }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
            <h2 className="text-lg font-bold">Sala de Trofeos</h2>
            <p className="text-xs text-slate-500">Tus hábitos tienen recompensa</p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl mx-auto p-6 space-y-8 pb-24 animate-[fadeIn_0.3s_ease-out]">
        
        {/* Progress Overview */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-end mb-4 relative z-10">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Nivel de Hábitos</p>
                    <h1 className="text-3xl font-black">{unlockedCount} / {totalCount} <span className="text-lg font-medium text-slate-400">Desbloqueados</span></h1>
                </div>
                <div className="size-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-200 dark:border-slate-700">
                    <span className="material-symbols-outlined text-3xl text-yellow-500">emoji_events</span>
                </div>
            </div>
            
            <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative z-10">
                <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-1000" style={{ width: `${completionPercentage}%` }}></div>
            </div>
            
            {/* Background Decor */}
            <div className="absolute -top-10 -right-10 size-40 bg-yellow-500/10 rounded-full blur-3xl"></div>
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((ach) => (
                <div 
                    key={ach.id} 
                    className={`relative p-5 rounded-2xl border transition-all duration-300 group overflow-hidden ${
                        ach.isUnlocked 
                        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:border-yellow-500/50' 
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-70 grayscale'
                    }`}
                >
                    {/* Unlocked Shine Effect */}
                    {ach.isUnlocked && (
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none"></div>
                    )}

                    <div className="flex items-start gap-4 relative z-10">
                        {/* Icon Badge */}
                        <div className={`size-14 rounded-2xl flex items-center justify-center shadow-inner ${ach.isUnlocked ? 'bg-gradient-to-br ' + getTierColor(ach.tier) : 'bg-slate-200 dark:bg-slate-800'}`}>
                            <span className={`material-symbols-outlined text-2xl text-white drop-shadow-md`}>
                                {ach.isUnlocked ? ach.icon : 'lock'}
                            </span>
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <h4 className={`font-bold text-sm ${ach.isUnlocked ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{ach.title}</h4>
                                {ach.isUnlocked ? (
                                    <span className="text-[10px] font-bold bg-green-100 text-green-600 px-2 py-0.5 rounded-full">OK</span>
                                ) : (
                                    <span className="text-[10px] font-bold text-slate-400">{ach.targetDisplay}</span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                {ach.description}
                            </p>
                            
                            {/* Mini Progress Bar for Locked Items */}
                            {!ach.isUnlocked && (
                                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-3 overflow-hidden">
                                    <div className="h-full bg-slate-400" style={{ width: `${ach.progress}%` }}></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>

      </div>
    </div>
  );
};

export default Achievements;
