
import React, { useState, useMemo } from 'react';
import { FinancialProfile, HistoricalMonthEstimate } from '../types';
import { formatMoney } from '../utils';

interface Props {
  profile: FinancialProfile;
  onUpdateProfile: (profile: FinancialProfile) => void;
  onBack: () => void;
  privacyMode?: boolean;
}

const TOTAL_KEY = 'Total';

const monthLabel = (key: string): string => {
  const [y, m] = key.split('-');
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
};

const buildMonthOptions = (count: number): string[] => {
  const result: string[] = [];
  const now = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return result;
};

const sumEstimate = (est?: HistoricalMonthEstimate): number =>
  est ? Object.values(est.byCategory).reduce((a, n) => a + (n || 0), 0) : 0;

const HistoricalEstimates: React.FC<Props> = ({ profile, onUpdateProfile, onBack, privacyMode }) => {
  const estimates = profile.historicalEstimates || [];
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    estimates.forEach(e => { initial[e.month] = String(sumEstimate(e)); });
    return initial;
  });
  const blur = privacyMode ? 'blur-sm' : '';

  const monthOptions = useMemo(() => buildMonthOptions(24), []);

  const getEstimate = (month: string): HistoricalMonthEstimate | undefined =>
    estimates.find(e => e.month === month);

  const totalEstimated = useMemo(
    () => estimates.reduce((sum, e) => sum + sumEstimate(e), 0),
    [estimates],
  );

  const saveMonth = (month: string, amount: number) => {
    const others = estimates.filter(e => e.month !== month);
    const newList = amount > 0
      ? [...others, { month, byCategory: { [TOTAL_KEY]: amount } }].sort((a, b) => a.month.localeCompare(b.month))
      : others;
    onUpdateProfile({ ...profile, historicalEstimates: newList });
  };

  const handleBlur = (month: string) => {
    const raw = drafts[month];
    const n = parseFloat(raw);
    const current = sumEstimate(getEstimate(month));
    if (isNaN(n) || n < 0) {
      setDrafts(d => ({ ...d, [month]: current > 0 ? String(current) : '' }));
      return;
    }
    if (n === current) return;
    saveMonth(month, n);
  };

  const handleClear = (month: string) => {
    setDrafts(d => ({ ...d, [month]: '' }));
    saveMonth(month, 0);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      <div className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-white/30 dark:border-slate-700/40 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="text-lg font-bold">Historia Recuperada</h2>
          <p className="text-[10px] text-slate-400">Promedio mensual de gasto para meses anteriores</p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto p-6 space-y-6 pb-24">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-amber-600">restore</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-amber-900 dark:text-amber-100">Cargá el promedio total de gasto que recordás por mes</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                Estos promedios alimentan tu runway, healthScore y proyecciones — pero quedan separados de las
                transacciones reales para que sepas qué es qué.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Meses cargados</p>
            <p className="text-2xl font-black mt-1">{estimates.length}</p>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Total estimado</p>
            <p className={`text-2xl font-black mt-1 ${blur}`}>{formatMoney(totalEstimated)}</p>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Últimos 24 meses</h3>
          {monthOptions.map(month => {
            const est = getEstimate(month);
            const hasValue = !!est && sumEstimate(est) > 0;
            return (
              <div
                key={month}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors ${
                  hasValue
                    ? 'bg-emerald-50/40 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
                    : 'bg-surface-light dark:bg-surface-dark border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                  hasValue ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>
                  <span className="material-symbols-outlined text-base">{hasValue ? 'check' : 'edit_calendar'}</span>
                </div>
                <p className="font-bold text-sm capitalize flex-1 truncate">{monthLabel(month)}</p>
                <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg px-2 py-1.5 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-bold mr-1">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    className={`w-28 text-right font-bold text-sm outline-none bg-transparent ${blur}`}
                    placeholder="0"
                    value={drafts[month] ?? ''}
                    onChange={e => setDrafts(d => ({ ...d, [month]: e.target.value }))}
                    onBlur={() => handleBlur(month)}
                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                  />
                </div>
                {hasValue && (
                  <button
                    onClick={() => handleClear(month)}
                    className="size-8 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Eliminar estimación"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HistoricalEstimates;
