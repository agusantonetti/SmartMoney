import React, { useState, useEffect } from 'react';
import { FinancialProfile, Transaction } from '../types';
import { formatMoney } from '../utils';
import {
  SmartMoneyBackup,
  getLocalBackups,
  downloadBackup,
  deleteBackup,
  parseBackupFile,
} from '../backup';

interface Props {
  uid: string;
  currentProfile: FinancialProfile;
  currentTransactions: Transaction[];
  onRestore: (data: { profile: FinancialProfile; transactions: Transaction[] }) => void;
  onBack: () => void;
}

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
};

const BackupManager: React.FC<Props> = ({ uid, currentProfile, currentTransactions, onRestore, onBack }) => {
  const [backups, setBackups] = useState<SmartMoneyBackup[]>([]);
  const [confirmRestore, setConfirmRestore] = useState<SmartMoneyBackup | null>(null);

  const refresh = () => setBackups(getLocalBackups(uid));
  useEffect(() => { refresh(); }, [uid]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const parsed = await parseBackupFile(file);
    if (!parsed) {
      alert('Archivo de backup inválido');
      return;
    }
    setConfirmRestore(parsed);
    e.target.value = '';
  };

  const doRestore = () => {
    if (!confirmRestore) return;
    onRestore({ profile: confirmRestore.profile, transactions: confirmRestore.transactions });
    setConfirmRestore(null);
  };

  const currentSnapshot: SmartMoneyBackup = {
    timestamp: Date.now(),
    isoDate: new Date().toISOString(),
    uid,
    profile: currentProfile,
    transactions: currentTransactions,
    txCount: currentTransactions.length,
    incomeSourceCount: currentProfile.incomeSources?.length || 0,
    hasContent: true,
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white">
      <div className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-white/30 dark:border-slate-700/40 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="text-lg font-bold">Backup y Restauración</h2>
          <p className="text-[10px] text-slate-400">Última defensa contra pérdida de datos</p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto p-6 space-y-6 pb-24">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-start gap-3">
          <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-emerald-600">shield</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm text-emerald-900 dark:text-emerald-100">Backup automático activo</p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5 leading-relaxed">
              Cada vez que se sincronizan datos, guardamos copia local. Si Firestore se rompe alguna vez,
              podés restaurar desde acá. Bajá también un archivo manualmente cada tanto para tener doble seguro.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => downloadBackup(currentSnapshot)}
            className="bg-primary text-white p-4 rounded-2xl font-bold text-sm flex flex-col items-start gap-1 hover:bg-blue-600"
          >
            <span className="material-symbols-outlined">download</span>
            <span>Descargar AHORA</span>
            <span className="text-[10px] opacity-80 font-normal">Estado actual a archivo JSON</span>
          </button>
          <label className="bg-violet-500 text-white p-4 rounded-2xl font-bold text-sm flex flex-col items-start gap-1 hover:bg-violet-600 cursor-pointer">
            <span className="material-symbols-outlined">upload_file</span>
            <span>Restaurar desde archivo</span>
            <span className="text-[10px] opacity-80 font-normal">Subí un backup JSON</span>
            <input type="file" accept=".json,application/json" onChange={handleFile} className="hidden" />
          </label>
        </div>

        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-2">
            Backups automáticos locales ({backups.length})
          </h3>
          {backups.length === 0 ? (
            <div className="text-center py-12 bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2 block">inventory_2</span>
              <p className="text-sm text-slate-400 font-bold">Todavía no hay backups locales</p>
              <p className="text-[11px] text-slate-400 mt-1">Se generan automáticamente al sincronizar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {backups.map(b => (
                <div key={b.timestamp} className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-slate-500">history</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{fmtDate(b.isoDate)}</p>
                    <p className="text-[11px] text-slate-400">
                      {b.txCount} transacciones · {b.incomeSourceCount} contratos
                    </p>
                  </div>
                  <button
                    onClick={() => downloadBackup(b)}
                    className="size-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500"
                    title="Descargar"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                  </button>
                  <button
                    onClick={() => setConfirmRestore(b)}
                    className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-blue-600"
                  >
                    Restaurar
                  </button>
                  <button
                    onClick={() => { if (confirm('¿Eliminar este backup?')) { deleteBackup(b.timestamp); refresh(); } }}
                    className="size-9 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-slate-300 hover:text-red-500"
                    title="Eliminar"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {confirmRestore && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="size-12 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-600">warning</span>
            </div>
            <div>
              <h3 className="font-bold text-lg">¿Restaurar este backup?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Se va a SOBRESCRIBIR el estado actual con los datos del backup. Esto incluye perfil y transacciones.
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-1">
              <p className="text-xs"><span className="text-slate-400 font-bold">Fecha:</span> {fmtDate(confirmRestore.isoDate)}</p>
              <p className="text-xs"><span className="text-slate-400 font-bold">Transacciones:</span> {confirmRestore.txCount}</p>
              <p className="text-xs"><span className="text-slate-400 font-bold">Contratos:</span> {confirmRestore.incomeSourceCount}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-200 dark:border-red-800">
              <p className="text-[11px] text-red-700 dark:text-red-300 font-bold">
                Estado actual que se perderá: {currentTransactions.length} transacciones · {currentProfile.incomeSources?.length || 0} contratos
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmRestore(null)} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                Cancelar
              </button>
              <button onClick={doRestore} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-500 text-white hover:bg-red-600">
                Restaurar (sobrescribir)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupManager;
