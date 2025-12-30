
import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';

interface Props {
  transactions: Transaction[];
  onUpdateTransactions: (transactions: Transaction[]) => void;
  onBack: () => void;
  privacyMode?: boolean;
}

const ActivityHub: React.FC<Props> = ({ transactions, onUpdateTransactions, onBack, privacyMode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'income' | 'expense'>('ALL');
  
  // Categorías dinámicas basadas en lo existente
  const availableCategories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category));
    return Array.from(cats).sort();
  }, [transactions]);
  
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Lógica de Filtrado
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Texto (Descripción o Monto)
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.amount.toString().includes(searchTerm);
      
      // 2. Tipo
      const matchesType = filterType === 'ALL' || t.type === filterType;

      // 3. Categoría
      const matchesCategory = filterCategory === 'ALL' || t.category === filterCategory;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [transactions, searchTerm, filterType, filterCategory]);

  // Borrar transacción
  const handleDelete = (id: string) => {
    if (window.confirm("¿Seguro que quieres eliminar este movimiento?")) {
      const updated = transactions.filter(t => t.id !== id);
      onUpdateTransactions(updated);
    }
  };

  // Exportar a CSV
  const handleExport = () => {
    const headers = ["Fecha", "Descripción", "Categoría", "Tipo", "Monto", "Moneda Orig", "Monto Orig"];
    const rows = filteredTransactions.map(t => [
        t.date,
        `"${t.description.replace(/"/g, '""')}"`, // Escape quotes
        t.category,
        t.type,
        t.amount,
        t.originalCurrency || 'ARS',
        t.originalAmount || t.amount
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `smartmoney_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      {/* Header Sticky */}
      <div className="sticky top-0 z-20 bg-surface-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-4 space-y-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h2 className="text-lg font-bold">Actividad</h2>
            </div>
            <button 
                onClick={handleExport}
                className="flex items-center gap-2 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full transition-colors"
            >
                <span className="material-symbols-outlined text-[16px]">download</span>
                CSV
            </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input 
                    type="text" 
                    placeholder="Buscar por nombre o monto..." 
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <select 
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-3 text-sm font-bold outline-none border-r-[8px] border-transparent"
                >
                    <option value="ALL">Todos los Tipos</option>
                    <option value="income">Solo Ingresos</option>
                    <option value="expense">Solo Gastos</option>
                </select>
                <select 
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-3 text-sm font-bold outline-none border-r-[8px] border-transparent max-w-[150px]"
                >
                    <option value="ALL">Todas Categorías</option>
                    {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
        </div>
      </div>

      <div className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-6 pb-24">
         {/* Results Counter */}
         <div className="flex justify-between items-center mb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>{filteredTransactions.length} Movimientos</span>
            <span className={`transition-all duration-300 ${privacyMode ? 'blur-sm select-none' : ''}`}>Total: {formatMoney(filteredTransactions.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0))}</span>
         </div>

         {/* Transaction List */}
         <div className="space-y-3">
            {filteredTransactions.length === 0 ? (
                <div className="text-center py-20 opacity-50">
                    <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                    <p>No se encontraron movimientos.</p>
                </div>
            ) : (
                filteredTransactions.map(tx => (
                    <div key={tx.id} className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between group">
                        <div className="flex items-center gap-4 overflow-hidden">
                             <div className={`shrink-0 size-10 rounded-full flex items-center justify-center ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                                <span className="material-symbols-outlined text-[20px]">{tx.type === 'income' ? 'arrow_upward' : 'arrow_downward'}</span>
                             </div>
                             <div className="min-w-0">
                                <p className="font-bold text-slate-900 dark:text-white truncate text-sm">{tx.description}</p>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span>{tx.date}</span>
                                    <span className="size-1 bg-slate-300 rounded-full"></span>
                                    <span className="truncate">{tx.category}</span>
                                </div>
                             </div>
                        </div>
                        <div className="flex items-center gap-3 pl-2">
                             <span className={`font-bold text-sm whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'} ${privacyMode ? 'blur-sm select-none' : ''}`}>
                                {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount)}
                             </span>
                             <button 
                                onClick={() => handleDelete(tx.id)}
                                className="size-8 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                                title="Eliminar"
                             >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                             </button>
                        </div>
                    </div>
                ))
            )}
         </div>
      </div>
    </div>
  );
};

export default ActivityHub;
