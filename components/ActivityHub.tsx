
import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { formatMoney, getAllCategories, isOneTimePurchase, ONE_TIME_CATEGORY } from '../utils';

interface Props {
  transactions: Transaction[];
  onUpdateTransactions: (transactions: Transaction[]) => void;
  onBack: () => void;
  privacyMode?: boolean;
  customCategories?: string[];
}

const ActivityHub: React.FC<Props> = ({ transactions, onUpdateTransactions, onBack, privacyMode, customCategories }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'income' | 'expense'>('ALL');

  // Edit modal state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editDraft, setEditDraft] = useState<Transaction | null>(null);

  // Categorías dinámicas: combinar las de transacciones existentes con las del sistema
  const availableCategories = useMemo(() => {
    const fromTxs = new Set(transactions.map(t => t.category));
    const fromSystem = getAllCategories(customCategories);
    return Array.from(new Set([...fromSystem, ...Array.from(fromTxs)])).sort();
  }, [transactions, customCategories]);

  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Lógica de Filtrado
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.amount.toString().includes(searchTerm);
      const matchesType = filterType === 'ALL' || t.type === filterType;
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

  // Abrir modal de edición
  const handleOpenEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setEditDraft({ ...tx });
  };

  const handleCloseEdit = () => {
    setEditingTx(null);
    setEditDraft(null);
  };

  const handleSaveEdit = () => {
    if (!editDraft || !editingTx) return;
    const updated = transactions.map(t => t.id === editingTx.id ? editDraft : t);
    onUpdateTransactions(updated);
    handleCloseEdit();
  };

  const updateDraft = <K extends keyof Transaction>(field: K, value: Transaction[K]) => {
    if (!editDraft) return;
    setEditDraft({ ...editDraft, [field]: value });
  };

  // Exportar a CSV
  const handleExport = () => {
    const headers = ["Fecha", "Descripción", "Categoría", "Tipo", "Monto", "Moneda Orig", "Monto Orig", "Compra Única"];
    const rows = filteredTransactions.map(t => [
        t.date,
        `"${t.description.replace(/"/g, '""')}"`,
        t.category,
        t.type,
        t.amount,
        t.originalCurrency || 'ARS',
        t.originalAmount || t.amount,
        isOneTimePurchase(t) ? 'Sí' : 'No'
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

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      <div className="sticky top-0 z-20 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-white/30 dark:border-slate-700/40 px-4 md:px-6 pb-4 space-y-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-3 -ml-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
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
                filteredTransactions.map(tx => {
                    const oneTime = isOneTimePurchase(tx);
                    return (
                        <div
                            key={tx.id}
                            onClick={() => handleOpenEdit(tx)}
                            className={`bg-surface-light dark:bg-surface-dark p-4 rounded-xl border flex items-center justify-between group cursor-pointer hover:border-primary/30 transition-colors ${oneTime ? 'border-amber-200 dark:border-amber-800/60' : 'border-slate-200 dark:border-slate-700'}`}
                        >
                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className={`shrink-0 size-10 rounded-full flex items-center justify-center ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                                    <span className="material-symbols-outlined text-[20px]">{tx.type === 'income' ? 'arrow_upward' : 'arrow_downward'}</span>
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <p className="font-bold text-slate-900 dark:text-white truncate text-sm">{tx.description}</p>
                                        {oneTime && (
                                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded-full whitespace-nowrap" title="Compra única: no cuenta en el promedio histórico">
                                                <span className="material-symbols-outlined text-[10px]">auto_awesome</span>
                                                única
                                            </span>
                                        )}
                                    </div>
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
                                    onClick={(e) => { e.stopPropagation(); handleDelete(tx.id); }}
                                    className="size-8 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                                    title="Eliminar"
                                >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                            </div>
                        </div>
                    );
                })
            )}
         </div>
      </div>

      {/* EDIT MODAL */}
      {editingTx && editDraft && (
          <div
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-[fadeIn_0.2s_ease-out]"
              onClick={handleCloseEdit}
          >
              <div
                  className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl md:rounded-3xl border-t md:border border-slate-200 dark:border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
              >
                  {/* Header */}
                  <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700 px-5 py-4 flex items-center justify-between rounded-t-3xl">
                      <h3 className="text-lg font-bold">Editar movimiento</h3>
                      <button
                          onClick={handleCloseEdit}
                          className="size-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                          <span className="material-symbols-outlined text-[20px]">close</span>
                      </button>
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-4">
                      {/* Descripción */}
                      <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Descripción</label>
                          <input
                              type="text"
                              value={editDraft.description}
                              onChange={(e) => updateDraft('description', e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/50"
                              style={{ fontSize: '16px' }}
                          />
                      </div>

                      {/* Monto y Fecha */}
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Monto (ARS)</label>
                              <input
                                  type="number"
                                  value={editDraft.amount}
                                  onChange={(e) => updateDraft('amount', parseFloat(e.target.value) || 0)}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/50"
                                  style={{ fontSize: '16px' }}
                              />
                          </div>
                          <div>
                              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Fecha</label>
                              <input
                                  type="date"
                                  value={editDraft.date}
                                  onChange={(e) => updateDraft('date', e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/50"
                                  style={{ fontSize: '16px' }}
                              />
                          </div>
                      </div>

                      {/* Categoría y Tipo */}
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Categoría</label>
                              <select
                                  value={editDraft.category}
                                  onChange={(e) => updateDraft('category', e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/50"
                                  style={{ fontSize: '16px' }}
                              >
                                  {availableCategories.map(cat => (
                                      <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                  {!availableCategories.includes(editDraft.category) && (
                                      <option value={editDraft.category}>{editDraft.category}</option>
                                  )}
                              </select>
                          </div>
                          <div>
                              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Tipo</label>
                              <button
                                  onClick={() => updateDraft('type', editDraft.type === 'expense' ? 'income' : 'expense')}
                                  className={`w-full py-2.5 rounded-xl text-sm font-bold uppercase transition-colors ${editDraft.type === 'expense' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'}`}
                              >
                                  {editDraft.type === 'expense' ? 'Gasto' : 'Ingreso'}
                              </button>
                          </div>
                      </div>

                      {/* ONE-TIME TOGGLE: solo para gastos */}
                      {editDraft.type === 'expense' && (
                          <div>
                              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Tipo de gasto</label>
                              <button
                                  onClick={() => updateDraft('isOneTime', !editDraft.isOneTime)}
                                  className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl text-left transition-all ${editDraft.isOneTime ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
                              >
                                  <div className="flex items-center gap-3 min-w-0">
                                      <span className={`material-symbols-outlined shrink-0 ${editDraft.isOneTime ? 'text-amber-500' : 'text-slate-400'}`}>
                                          auto_awesome
                                      </span>
                                      <div className="min-w-0">
                                          <p className={`text-sm font-bold ${editDraft.isOneTime ? 'text-amber-700 dark:text-amber-300' : 'text-slate-700 dark:text-slate-200'}`}>
                                              Compra única
                                          </p>
                                          <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                                              {editDraft.isOneTime
                                                  ? 'Excluida del promedio mensual y las tendencias'
                                                  : 'Activá para excluir esta compra del promedio'}
                                          </p>
                                      </div>
                                  </div>
                                  <div className={`shrink-0 w-11 h-6 rounded-full relative transition-colors ${editDraft.isOneTime ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                      <div className={`absolute top-0.5 size-5 bg-white rounded-full shadow transition-all ${editDraft.isOneTime ? 'left-[22px]' : 'left-0.5'}`}></div>
                                  </div>
                              </button>
                              {editDraft.category === ONE_TIME_CATEGORY && !editDraft.isOneTime && (
                                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 ml-1">
                                      La categoría "{ONE_TIME_CATEGORY}" ya excluye esta transacción del promedio.
                                  </p>
                              )}
                          </div>
                      )}
                  </div>

                  {/* Footer */}
                  <div className="sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700 px-5 py-4 flex gap-3">
                      <button
                          onClick={handleCloseEdit}
                          className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                          Cancelar
                      </button>
                      <button
                          onClick={handleSaveEdit}
                          className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-primary hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                      >
                          <span className="material-symbols-outlined text-[18px]">save</span>
                          Guardar
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ActivityHub;
