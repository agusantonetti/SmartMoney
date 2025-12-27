
import React, { useState } from 'react';
import { FinancialProfile, SavingsBucket } from '../types';

interface Props {
  profile: FinancialProfile;
  totalBalance: number;
  onUpdateProfile: (profile: FinancialProfile) => void;
  onBack: () => void;
}

const SavingsBuckets: React.FC<Props> = ({ profile, totalBalance, onUpdateProfile, onBack }) => {
  const [buckets, setBuckets] = useState<SavingsBucket[]>(profile.savingsBuckets || []);
  const [isAdding, setIsAdding] = useState(false);
  
  // Estados para crear nuevo
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');

  // Estados para edición
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');

  const totalReserved = buckets.reduce((acc, b) => acc + b.currentAmount, 0);
  const freeBalance = totalBalance - totalReserved;

  const handleAddBucket = () => {
    if (!name || !amount) return;
    
    const newBucket: SavingsBucket = {
      id: Date.now().toString(),
      name,
      targetAmount: parseFloat(amount),
      currentAmount: parseFloat(amount), // Por defecto apartamos el total indicado
      icon: 'folder_special'
    };

    const updated = [...buckets, newBucket];
    setBuckets(updated);
    onUpdateProfile({ ...profile, savingsBuckets: updated });
    
    setName('');
    setAmount('');
    setIsAdding(false);
  };

  const handleStartEdit = (bucket: SavingsBucket) => {
    setEditingId(bucket.id);
    setEditName(bucket.name);
    setEditAmount(bucket.currentAmount.toString());
    setIsAdding(false); // Cerrar formulario de agregar si está abierto
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditAmount('');
  };

  const handleSaveEdit = () => {
    if (!editName || !editAmount) return;

    const newAmount = parseFloat(editAmount);
    const updatedBuckets = buckets.map(b => {
      if (b.id === editingId) {
        return {
          ...b,
          name: editName,
          currentAmount: newAmount,
          targetAmount: newAmount // Mantenemos sincronizado target y current para este modelo de "reserva simple"
        };
      }
      return b;
    });

    setBuckets(updatedBuckets);
    onUpdateProfile({ ...profile, savingsBuckets: updatedBuckets });
    handleCancelEdit();
  };

  const handleDeleteBucket = (id: string) => {
    const updated = buckets.filter(b => b.id !== id);
    setBuckets(updated);
    onUpdateProfile({ ...profile, savingsBuckets: updated });
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { 
      style: 'currency', 
      currency: 'MXN',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold">Mis Apartados</h2>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto p-6 space-y-8 pb-24">
        
        {/* Balance Breakdown Card */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Disponible Real</p>
              <h1 className="text-4xl font-black text-primary">{formatMoney(freeBalance)}</h1>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Saldo Total</p>
              <p className="text-xl font-bold opacity-60">{formatMoney(totalBalance)}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-500">Reservado en Apartados</span>
              <span className="text-slate-900 dark:text-white">{formatMoney(totalReserved)}</span>
            </div>
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${(totalReserved / totalBalance) * 100}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-400 italic">El dinero de los apartados se resta de tu balance "disponible" para que no lo gastes por error.</p>
          </div>
        </div>

        {/* List Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-500">category</span>
              Tus Proyectos
            </h3>
            {!editingId && !isAdding && (
              <button 
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 text-sm font-bold text-white bg-primary hover:bg-blue-600 px-4 py-2 rounded-full transition-colors shadow-lg shadow-primary/20"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Crear Apartado
              </button>
            )}
          </div>

          {isAdding && (
            <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl animate-[fadeIn_0.2s_ease-out]">
              <h4 className="text-lg font-bold mb-4 flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined">folder_special</span>
                  Nuevo Apartado
              </h4>
              <div className="grid gap-4">
                <div className="relative group">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors material-symbols-outlined">label</span>
                   <input 
                    type="text" 
                    placeholder="Nombre (Ej. Boda, Emergencias)" 
                    className="w-full bg-slate-50 dark:bg-slate-900/50 h-14 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium border border-transparent focus:border-primary/30"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="relative group">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors material-symbols-outlined">attach_money</span>
                   <input 
                    type="number" 
                    placeholder="Monto a Apartar" 
                    className="w-full bg-slate-50 dark:bg-slate-900/50 h-14 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-lg border border-transparent focus:border-primary/30"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-3 pt-2">
                    <button 
                    onClick={handleAddBucket}
                    disabled={!name || !amount}
                    className="flex-1 bg-primary text-white font-bold h-12 rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">check</span>
                        Confirmar
                    </button>
                    <button 
                    onClick={() => setIsAdding(false)}
                    className="px-6 h-12 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4">
            {buckets.length === 0 && !isAdding && (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2">label_important</span>
                <p>No tienes dinero apartado aún.</p>
                <p className="text-xs mt-1">Crea uno para proteger tus ahorros de compras impulsivas.</p>
              </div>
            )}
            
            {buckets.map(bucket => {
              const isEditing = editingId === bucket.id;
              
              return isEditing ? (
                // EDIT MODE CARD
                <div key={bucket.id} className="bg-surface-light dark:bg-surface-dark p-5 rounded-3xl border border-primary/30 shadow-xl z-10 animate-[fadeIn_0.2s_ease-out]">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-primary flex items-center gap-2">
                        <span className="material-symbols-outlined">edit</span>
                        Editando
                    </h4>
                    <button onClick={handleCancelEdit} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  <div className="grid gap-4">
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors material-symbols-outlined">label</span>
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 dark:bg-slate-900/50 h-14 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium border border-transparent focus:border-primary/30"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors material-symbols-outlined">attach_money</span>
                      <input 
                        type="number" 
                        className="w-full bg-slate-50 dark:bg-slate-900/50 h-14 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-lg border border-transparent focus:border-primary/30"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                       <button 
                        onClick={handleSaveEdit}
                        className="flex-1 bg-primary text-white font-bold h-12 rounded-xl shadow-lg shadow-primary/20 hover:bg-blue-600 transition-colors"
                      >
                        Guardar
                      </button>
                      <button 
                        onClick={handleCancelEdit}
                        className="px-6 h-12 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // VIEW MODE CARD
                <div key={bucket.id} className="bg-surface-light dark:bg-surface-dark p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between group hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <span className="material-symbols-outlined text-2xl">{bucket.icon}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">{bucket.name}</h4>
                      <p className="text-xs text-slate-500">Monto reservado</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-black text-lg text-slate-900 dark:text-white">{formatMoney(bucket.currentAmount)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleStartEdit(bucket)}
                        className="text-slate-300 hover:text-primary transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button 
                        onClick={() => handleDeleteBucket(bucket.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Eliminar"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SavingsBuckets;
