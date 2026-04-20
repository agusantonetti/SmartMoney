
import React, { useState, useMemo } from 'react';
import { FinancialProfile, FinancialGoal, Transaction } from '../types';
import { formatMoney, formatMoneyUSD, getDollarRate, getSalaryForMonth, getCurrentMonthKey, isOneTimePurchase } from '../utils';

interface Props {
  profile: FinancialProfile;
  transactions: Transaction[];
  onUpdateProfile: (profile: FinancialProfile) => void;
  onBack: () => void;
}

const GOAL_PRESETS = [
  { name: 'Viaje', icon: 'flight', color: 'blue' },
  { name: 'Auto', icon: 'directions_car', color: 'red' },
  { name: 'Tecnología', icon: 'laptop', color: 'violet' },
  { name: 'Fondo de emergencia', icon: 'shield', color: 'emerald' },
  { name: 'Inversión inicial', icon: 'trending_up', color: 'cyan' },
  { name: 'Otro', icon: 'flag', color: 'amber' },
];

const GoalsTracker: React.FC<Props> = ({ profile, transactions, onUpdateProfile, onBack }) => {
  const dollarRate = getDollarRate(profile);
  const goals = profile.goals || [];
  const [isAdding, setIsAdding] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(GOAL_PRESETS[0]);
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalCurrency, setGoalCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [goalDeadline, setGoalDeadline] = useState('');

  // Ahorro mensual promedio del usuario
  const monthlySaving = useMemo(() => {
    const now = new Date();
    const currentMonthKey = getCurrentMonthKey();
    const salary = getSalaryForMonth(profile, currentMonthKey, dollarRate);
    const expenses: number[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const exp = transactions.filter(t => t.type === 'expense' && t.date.startsWith(mk) && !isOneTimePurchase(t)).reduce((a, t) => a + t.amount, 0);
      if (exp > 0) expenses.push(exp);
    }
    const avgExp = expenses.length > 0 ? expenses.reduce((a, b) => a + b, 0) / expenses.length : 0;
    return salary - avgExp;
  }, [profile, transactions, dollarRate]);

  const handleAddGoal = () => {
    const amount = parseFloat(goalAmount);
    if (!goalName || isNaN(amount) || amount <= 0) return;

    const newGoal: FinancialGoal = {
      id: Date.now().toString(),
      name: goalName,
      targetAmount: amount,
      currency: goalCurrency,
      currentAmount: 0,
      deadline: goalDeadline || undefined,
      createdAt: new Date().toISOString(),
      icon: selectedPreset.icon,
      color: selectedPreset.color,
    };

    onUpdateProfile({ ...profile, goals: [...goals, newGoal] });
    setGoalName('');
    setGoalAmount('');
    setGoalDeadline('');
    setIsAdding(false);
  };

  const handleUpdateGoalAmount = (goalId: string, newAmount: number) => {
    const updated = goals.map(g => g.id === goalId ? { ...g, currentAmount: Math.max(0, newAmount) } : g);
    onUpdateProfile({ ...profile, goals: updated });
  };

  const handleDeleteGoal = (goalId: string) => {
    onUpdateProfile({ ...profile, goals: goals.filter(g => g.id !== goalId) });
  };

  const getGoalARS = (goal: FinancialGoal) => goal.currency === 'USD' ? goal.targetAmount * dollarRate : goal.targetAmount;
  const getCurrentARS = (goal: FinancialGoal) => goal.currency === 'USD' ? goal.currentAmount * dollarRate : goal.currentAmount;

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      <div className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-white/30 dark:border-slate-700/40 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold">Mis Metas</h2>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto p-6 space-y-5 pb-24">

        {/* TU CAPACIDAD DE AHORRO */}
        <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-1 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">speed</span>
            Tu capacidad de ahorro
          </h3>
          <p className={`text-xl font-black ${monthlySaving >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatMoney(monthlySaving)}/mes
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Basado en tus sueldos y gasto promedio de los últimos 3 meses</p>
        </div>

        {/* METAS EXISTENTES */}
        {goals.length > 0 && (
          <div className="space-y-3">
            {goals.map(goal => {
              const targetARS = getGoalARS(goal);
              const currentARS = getCurrentARS(goal);
              const progress = targetARS > 0 ? Math.min(100, (currentARS / targetARS) * 100) : 0;
              const remaining = targetARS - currentARS;
              const monthsNeeded = monthlySaving > 0 ? Math.ceil(remaining / monthlySaving) : Infinity;
              const isComplete = progress >= 100;

              return (
                <div key={goal.id} className={`bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border rounded-2xl p-4 ${isComplete ? 'border-emerald-300 dark:border-emerald-700' : 'border-white/30 dark:border-slate-700/50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`size-10 rounded-xl flex items-center justify-center bg-${goal.color}-100 dark:bg-${goal.color}-900/30 text-${goal.color}-600 dark:text-${goal.color}-400`}>
                        <span className="material-symbols-outlined">{goal.icon}</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold">{goal.name}</h4>
                        <p className="text-[10px] text-slate-400">
                          Meta: {goal.currency === 'USD' ? `US$ ${goal.targetAmount.toLocaleString()}` : formatMoney(goal.targetAmount)}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteGoal(goal.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                    <div className={`h-full rounded-full transition-all duration-700 ${isComplete ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between mb-3">
                    <span className="text-[10px] font-bold text-slate-400">{Math.round(progress)}%</span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {isComplete ? 'Meta cumplida' : `Faltan ${formatMoney(remaining)}`}
                    </span>
                  </div>

                  {/* Actualizar monto */}
                  {!isComplete && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">Ahorrado:</span>
                      <div className="relative flex-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">{goal.currency === 'USD' ? 'US$' : '$'}</span>
                        <input
                          type="number"
                          value={goal.currentAmount || ''}
                          onChange={e => handleUpdateGoalAmount(goal.id, parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-100 dark:bg-slate-900 rounded-lg pl-9 pr-3 py-1.5 text-sm font-bold outline-none focus:ring-1 focus:ring-blue-500"
                          style={{ fontSize: '16px' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Estimación */}
                  {!isComplete && monthlySaving > 0 && monthsNeeded < 999 && (
                    <p className="text-[10px] text-slate-400 mt-2 text-center">
                      A tu ritmo actual de ahorro, llegarías en {monthsNeeded} {monthsNeeded === 1 ? 'mes' : 'meses'}
                    </p>
                  )}
                  {isComplete && (
                    <p className="text-center text-emerald-500 font-bold text-xs mt-1 flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Completada
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* AGREGAR META */}
        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-blue-600 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined">add_circle</span>
            {goals.length === 0 ? 'Crear mi primera meta' : 'Agregar meta'}
          </button>
        ) : (
          <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-5 space-y-4 animate-[fadeIn_0.2s_ease-out]">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">flag</span>
              Nueva meta
            </h3>

            {/* Presets */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {GOAL_PRESETS.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => { setSelectedPreset(preset); if (!goalName || GOAL_PRESETS.some(p => p.name === goalName)) setGoalName(preset.name); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold whitespace-nowrap transition-all ${
                    selectedPreset.name === preset.name 
                      ? 'bg-primary/10 border-primary text-primary' 
                      : 'bg-slate-50 dark:bg-slate-900/50 border-transparent text-slate-500'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{preset.icon}</span>
                  {preset.name}
                </button>
              ))}
            </div>

            {/* Nombre */}
            <input
              type="text" placeholder="Nombre de la meta" value={goalName}
              onChange={e => setGoalName(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-900 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-primary/50"
              style={{ fontSize: '16px' }}
            />

            {/* Monto + Moneda */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">{goalCurrency === 'USD' ? 'US$' : '$'}</span>
                <input
                  type="number" placeholder="Monto objetivo" value={goalAmount}
                  onChange={e => setGoalAmount(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-900 rounded-xl pl-10 pr-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-primary/50"
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1">
                <button onClick={() => setGoalCurrency('ARS')} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${goalCurrency === 'ARS' ? 'bg-white dark:bg-slate-700 shadow text-primary' : 'text-slate-400'}`}>ARS</button>
                <button onClick={() => setGoalCurrency('USD')} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${goalCurrency === 'USD' ? 'bg-white dark:bg-slate-700 shadow text-primary' : 'text-slate-400'}`}>USD</button>
              </div>
            </div>

            {/* Fecha objetivo (opcional) */}
            <input
              type="month" value={goalDeadline}
              onChange={e => setGoalDeadline(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-900 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/50"
              style={{ fontSize: '16px' }}
            />
            <p className="text-[10px] text-slate-400 -mt-2 ml-1">Fecha límite (opcional)</p>

            {/* Preview */}
            {parseFloat(goalAmount) > 0 && monthlySaving > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-200 dark:border-emerald-800">
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Con tu ahorro de {formatMoney(monthlySaving)}/mes, llegarías en {Math.ceil((goalCurrency === 'USD' ? parseFloat(goalAmount) * dollarRate : parseFloat(goalAmount)) / monthlySaving)} meses
                </p>
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-2">
              <button onClick={handleAddGoal} className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-sm">Crear meta</button>
              <button onClick={() => setIsAdding(false)} className="px-4 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-bold text-sm">Cancelar</button>
            </div>
          </div>
        )}

        {/* TIPS */}
        {goals.length === 0 && !isAdding && (
          <div className="text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 space-y-2">
            <span className="material-symbols-outlined text-3xl text-slate-300">emoji_objects</span>
            <p className="font-bold text-slate-500">¿No sabés por dónde empezar?</p>
            <p>Creá tu primera meta — puede ser algo simple como "Juntar $100.000 para un viaje" o "Llegar a US$ 1.000 de ahorro".</p>
            <p>La app te va a mostrar cuánto necesitás ahorrar por mes y si vas por buen camino.</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default GoalsTracker;
