
import React, { useState, useMemo } from 'react';
import { FinancialProfile, Transaction } from '../types';

interface Props {
  profile: FinancialProfile;
  transactions: Transaction[];
  onUpdateProfile: (profile: FinancialProfile) => void;
  onBack: () => void;
}

const BudgetControl: React.FC<Props> = ({ profile, transactions, onUpdateProfile, onBack }) => {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [limitInput, setLimitInput] = useState('');

  // 1. Obtener todas las categorías únicas usadas en gastos
  const categories = useMemo(() => {
    const cats = new Set(transactions.filter(t => t.type === 'expense').map(t => t.category));
    // Agregar categorías por defecto si no existen
    cats.add('Comida');
    cats.add('Transporte');
    cats.add('Hogar');
    cats.add('Otros');
    return Array.from(cats).sort();
  }, [transactions]);

  // 2. Calcular gastos del mes actual por categoría
  const currentMonthData = useMemo(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const monthlyExpenses = transactions.filter(t => 
        t.type === 'expense' && t.date.startsWith(currentMonthKey)
    );

    const totals: Record<string, number> = {};
    monthlyExpenses.forEach(t => {
        totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
    return totals;
  }, [transactions]);

  // 3. Manejo de límites
  const handleSaveLimit = (category: string) => {
    const amount = parseFloat(limitInput);
    if (isNaN(amount)) return; // Si es vacío o inválido, no hacemos nada o podríamos borrar el límite si es 0
    
    const newLimits = { ...profile.budgetLimits, [category]: amount };
    // Si el monto es 0, removemos el límite
    if (amount === 0) delete newLimits[category];

    onUpdateProfile({ ...profile, budgetLimits: newLimits });
    setEditingCategory(null);
    setLimitInput('');
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);
  };

  const getProgressColor = (spent: number, limit: number) => {
    if (!limit) return 'bg-slate-200 dark:bg-slate-700'; // Sin límite
    const percentage = spent / limit;
    if (percentage >= 1) return 'bg-red-500';
    if (percentage >= 0.8) return 'bg-yellow-400';
    return 'bg-emerald-500';
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
           <h2 className="text-lg font-bold">Límites Mensuales</h2>
           <p className="text-xs text-slate-500">Controla tus gastos para no excederte.</p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto p-6 space-y-6 pb-24">
         
         {categories.map(cat => {
            const spent = currentMonthData[cat] || 0;
            const limit = profile.budgetLimits?.[cat] || 0;
            const hasLimit = limit > 0;
            const percentage = hasLimit ? Math.min(100, (spent / limit) * 100) : 0;
            const remaining = Math.max(0, limit - spent);
            const isEditing = editingCategory === cat;
            const progressColor = getProgressColor(spent, limit);

            return (
               <div key={cat} className="bg-surface-light dark:bg-surface-dark p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-600">
                  <div className="flex justify-between items-start mb-3">
                     <div className="flex items-center gap-3">
                        <div className={`size-10 rounded-full flex items-center justify-center ${hasLimit && spent > limit ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                           <span className="material-symbols-outlined">
                              {cat === 'Comida' ? 'restaurant' : 
                               cat === 'Transporte' ? 'commute' : 
                               cat === 'Hogar' ? 'home' : 'category'}
                           </span>
                        </div>
                        <div>
                           <h4 className="font-bold text-slate-900 dark:text-white">{cat}</h4>
                           <p className="text-xs text-slate-500">Gastado este mes: {formatMoney(spent)}</p>
                        </div>
                     </div>
                     
                     {!isEditing && (
                        <button 
                           onClick={() => {
                              setEditingCategory(cat);
                              setLimitInput(limit ? limit.toString() : '');
                           }}
                           className="text-primary text-xs font-bold bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full transition-colors"
                        >
                           {hasLimit ? 'Editar Límite' : 'Definir Límite'}
                        </button>
                     )}
                  </div>

                  {isEditing ? (
                     <div className="mt-3 flex gap-2 animate-[fadeIn_0.2s_ease-out]">
                        <div className="relative flex-1">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                           <input 
                              type="number" 
                              className="w-full bg-slate-100 dark:bg-slate-900 rounded-lg pl-6 pr-3 py-2 outline-none focus:ring-2 focus:ring-primary/50 font-bold"
                              placeholder="Monto Máximo"
                              value={limitInput}
                              onChange={(e) => setLimitInput(e.target.value)}
                              autoFocus
                           />
                        </div>
                        <button 
                           onClick={() => handleSaveLimit(cat)}
                           className="bg-primary text-white px-4 rounded-lg font-bold shadow-lg shadow-primary/20"
                        >
                           Guardar
                        </button>
                        <button 
                           onClick={() => setEditingCategory(null)}
                           className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 rounded-lg"
                        >
                           <span className="material-symbols-outlined">close</span>
                        </button>
                     </div>
                  ) : (
                     <div className="mt-3 space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                           <span className={`${spent > limit && hasLimit ? 'text-red-500' : 'text-slate-500'}`}>
                              {Math.round(percentage)}% Utilizado
                           </span>
                           {hasLimit ? (
                              <span className="text-slate-400">
                                 Quedan: <span className={`${remaining < limit * 0.2 ? 'text-red-500' : 'text-emerald-500'}`}>{formatMoney(remaining)}</span>
                              </span>
                           ) : (
                              <span className="text-slate-400 italic">Sin límite definido</span>
                           )}
                        </div>
                        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                           <div 
                              className={`h-full rounded-full transition-all duration-1000 ease-out ${progressColor}`}
                              style={{ width: `${hasLimit ? percentage : 0}%` }}
                           ></div>
                        </div>
                        {hasLimit && (
                           <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                              <span>$0</span>
                              <span>Límite: {formatMoney(limit)}</span>
                           </div>
                        )}
                     </div>
                  )}
               </div>
            );
         })}

         <div className="text-center text-xs text-slate-400 mt-8 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
            <p>💡 <b>Tip:</b> Si te excedes en un presupuesto, la barra se pondrá roja. Intenta mantener tus categorías clave (como Comida) en verde.</p>
         </div>
      </div>
    </div>
  );
};

export default BudgetControl;
