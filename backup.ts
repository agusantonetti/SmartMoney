// ============================================================
// SISTEMA DE BACKUP AUTOMÁTICO LOCAL
// ============================================================
// Cada vez que llega un snapshot CON DATOS de Firestore, guardamos copia en
// localStorage con timestamp. Mantenemos hasta MAX_BACKUPS rotando los viejos.
// Si en algún momento Firestore queda vacío pero tenemos backups locales,
// alertamos al usuario y le ofrecemos restaurar. También permitimos export
// manual a archivo JSON descargable.
//
// Esto es la última línea de defensa contra pérdida de datos: incluso si el
// fix del listener fallara por algún escenario imprevisto, podemos recuperar.

import { FinancialProfile, Transaction } from './types';

export interface SmartMoneyBackup {
  timestamp: number; // ms
  isoDate: string;
  uid: string;
  profile: FinancialProfile;
  transactions: Transaction[];
  // Métricas rápidas para mostrar en la lista de backups sin parsear todo
  txCount: number;
  incomeSourceCount: number;
  hasContent: boolean;
}

const STORAGE_KEY = 'smartMoney_backups_v1';
const MAX_BACKUPS = 30;
// No guardar backup nuevo si el último fue hace menos de este intervalo y los
// datos no cambiaron significativamente (evitar inflar localStorage).
const MIN_BACKUP_INTERVAL_MS = 60 * 1000; // 1 minuto

/** Lee todos los backups locales ordenados por timestamp DESC (más reciente primero). */
export const getLocalBackups = (uid?: string): SmartMoneyBackup[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as SmartMoneyBackup[];
    const filtered = uid ? all.filter(b => b.uid === uid) : all;
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  } catch (e) {
    console.error('Error leyendo backups locales:', e);
    return [];
  }
};

const writeBackups = (backups: SmartMoneyBackup[]) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(backups));
  } catch (e) {
    // Si localStorage está lleno, drop el más viejo y reintentar
    console.error('Error escribiendo backup, intentando limpiar:', e);
    try {
      const trimmed = backups.slice(0, Math.max(5, Math.floor(backups.length / 2)));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e2) {
      console.error('No se pudo guardar backup ni después de limpiar:', e2);
    }
  }
};

const hasMeaningfulData = (profile: FinancialProfile, transactions: Transaction[]): boolean => {
  if (transactions.length > 0) return true;
  const p = profile;
  return !!(
    (p.incomeSources && p.incomeSources.length > 0) ||
    (p.savingsBuckets && p.savingsBuckets.length > 0) ||
    (p.subscriptions && p.subscriptions.length > 0) ||
    (p.debts && p.debts.length > 0) ||
    (p.events && p.events.length > 0) ||
    (p.goals && p.goals.length > 0) ||
    (p.initialBalance && p.initialBalance > 0) ||
    (p.historicalEstimates && p.historicalEstimates.length > 0)
  );
};

/**
 * Guarda un backup en localStorage SOLO si los datos son significativos.
 * Si los datos están vacíos NO guardamos (no queremos sobrescribir historial bueno
 * con un snapshot vacío que podría ser causado por un bug).
 */
export const saveBackup = (uid: string, profile: FinancialProfile, transactions: Transaction[]): void => {
  if (typeof window === 'undefined') return;
  if (!uid) return;
  if (!hasMeaningfulData(profile, transactions)) {
    console.warn('Backup omitido: datos vacíos o insignificantes.');
    return;
  }
  const backups = getLocalBackups();
  const latest = backups.find(b => b.uid === uid);
  // Throttle: si el último backup es muy reciente y nada cambió, skip
  if (latest && Date.now() - latest.timestamp < MIN_BACKUP_INTERVAL_MS) {
    if (
      latest.txCount === transactions.length &&
      latest.incomeSourceCount === (profile.incomeSources?.length || 0)
    ) {
      return;
    }
  }
  const newBackup: SmartMoneyBackup = {
    timestamp: Date.now(),
    isoDate: new Date().toISOString(),
    uid,
    profile,
    transactions,
    txCount: transactions.length,
    incomeSourceCount: profile.incomeSources?.length || 0,
    hasContent: true,
  };
  const updated = [newBackup, ...backups].slice(0, MAX_BACKUPS);
  writeBackups(updated);
};

/** El último backup útil del usuario (con datos significativos). null si no hay. */
export const getLatestBackup = (uid: string): SmartMoneyBackup | null => {
  const list = getLocalBackups(uid);
  return list.find(b => b.hasContent) || null;
};

/** Elimina un backup específico por timestamp. */
export const deleteBackup = (timestamp: number): void => {
  if (typeof window === 'undefined') return;
  const all = getLocalBackups();
  writeBackups(all.filter(b => b.timestamp !== timestamp));
};

/** Dispara descarga de un backup como archivo JSON. */
export const downloadBackup = (backup: SmartMoneyBackup): void => {
  if (typeof window === 'undefined') return;
  const data = {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    backup,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = backup.isoDate.slice(0, 19).replace(/:/g, '-');
  a.download = `smartmoney-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/** Lee un archivo JSON exportado y devuelve el backup. null si inválido. */
export const parseBackupFile = async (file: File): Promise<SmartMoneyBackup | null> => {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    // Soportamos dos formatos: el nuevo con wrapper, y el legacy handleImportData
    if (parsed?.backup?.profile && parsed?.backup?.transactions) {
      return parsed.backup as SmartMoneyBackup;
    }
    if (parsed?.profile && Array.isArray(parsed?.transactions)) {
      return {
        timestamp: Date.now(),
        isoDate: new Date().toISOString(),
        uid: 'imported',
        profile: parsed.profile,
        transactions: parsed.transactions,
        txCount: parsed.transactions.length,
        incomeSourceCount: parsed.profile?.incomeSources?.length || 0,
        hasContent: true,
      };
    }
    return null;
  } catch (e) {
    console.error('Error parseando archivo de backup:', e);
    return null;
  }
};
