
import React, { useState, useMemo } from 'react';
import { FinancialProfile } from '../types';
import { formatMoney } from '../utils';

const BASE_INFLATION_RATES: { month: string; rate: number }[] = [
  { month: '2022-01', rate: 3.9 }, { month: '2022-02', rate: 4.7 }, { month: '2022-03', rate: 6.7 },
  { month: '2022-04', rate: 6.0 }, { month: '2022-05', rate: 5.1 }, { month: '2022-06', rate: 5.3 },
  { month: '2022-07', rate: 7.4 }, { month: '2022-08', rate: 7.0 }, { month: '2022-09', rate: 6.2 },
  { month: '2022-10', rate: 6.3 }, { month: '2022-11', rate: 4.9 }, { month: '2022-12', rate: 5.1 },
  { month: '2023-01', rate: 6.0 }, { month: '2023-02', rate: 6.6 }, { month: '2023-03', rate: 7.7 },
  { month: '2023-04', rate: 8.4 }, { month: '2023-05', rate: 7.8 }, { month: '2023-06', rate: 6.0 },
  { month: '2023-07', rate: 6.3 }, { month: '2023-08', rate: 12.4 }, { month: '2023-09', rate: 12.7 },
  { month: '2023-10', rate: 8.3 }, { month: '2023-11', rate: 12.8 }, { month: '2023-12', rate: 25.5 },
  { month: '2024-01', rate: 20.6 }, { month: '2024-02', rate: 13.2 }, { month: '2024-03', rate: 11.0 },
  { month: '2024-04', rate: 8.8 }, { month: '2024-05', rate: 4.2 }, { month: '2024-06', rate: 4.6 },
  { month: '2024-07', rate: 4.0 }, { month: '2024-08', rate: 4.2 }, { month: '2024-09', rate: 3.5 },
  { month: '2024-10', rate: 2.4 }, { month: '2024-11', rate: 2.4 }, { month: '2024-12', rate: 2.7 },
  { month: '2025-01', rate: 2.3 }, { month: '2025-02', rate: 2.4 }, { month: '2025-03', rate: 3.7 },
  { month: '2025-04', rate: 2.8 }, { month: '2025-05', rate: 1.5 }, { month: '2025-06', rate: 1.6 },
  { month: '2025-07', rate: 1.9 }, { month: '2025-08', rate: 1.9 }, { month: '2025-09', rate: 2.1 },
  { month: '2025-10', rate: 2.3 }, { month: '2025-11', rate: 2.5 }, { month: '2025-12', rate: 2.8 },
  { month: '2026-01', rate: 2.9 }, { month: '2026-02', rate: 2.9 },
];

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function formatMonthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

interface Props {
  profile: FinancialProfile;
  onUpdateProfile: (p: FinancialProfile) => void;
  onBack: () => void;
  privacyMode?: boolean;
}

const InflationAdjuster: React.FC<Props> = ({ profile, onUpdateProfile, onBack, privacyMode }) => {
  const [newMonth, setNewMonth] = useState('');
  const [newRate, setNewRate] = useState('');
  const [showRateHistory, setShowRateHistory] = useState(false);
  const blur = privacyMode ? 'blur-sm' : '';

  const allRatesMap = useMemo(() => {
    const map = new Map<string, { rate: number; isUser: boolean }>();
    BASE_INFLATION_RATES.forEach(r => map.set(r.month, { rate: r.rate, isUser: false }));
    (profile.inflationHistory || []).forEach(r => map.set(r.month, { rate: r.rate, isUser: true }));
    return map;
  }, [profile.inflationHistory]);

  const computeCumulative = (startMonth: string): number => {
    const now = new Date();
    const endYear = now.getFullYear();
    const endMon = now.getMonth() + 1;
    const [sYear, sMon] = startMonth.split('-').map(Number);
    let multiplier = 1;
    let y = sYear, m = sMon;
    while (y < endYear || (y === endYear && m <= endMon)) {
      const key = `${y}-${String(m).padStart(2, '0')}`;
      const entry = allRatesMap.get(key);
      multiplier *= (1 + (entry?.rate || 0) / 100);
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return multiplier - 1;
  };

  const contracts = useMemo(() => {
    return (profile.incomeSources || [])
      .filter(s => s.isActive !== false && s.currency !== 'USD' && s.startDate)
      .map(s => {
        const startMonth = s.startDate!.substring(0, 7);
        const cumInflation = computeCumulative(startMonth);
        const adjustedAmount = Math.round(s.amount * (1 + cumInflation));
        const gap = adjustedAmount - s.amount;
        return { src: s, startMonth, cumInflation, adjustedAmount, gap };
      })
      .sort((a, b) => b.gap - a.gap);
  }, [profile.incomeSources, allRatesMap]);

  const sortedRateHistory = useMemo(() => {
    return Array.from(allRatesMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 18);
  }, [allRatesMap]);

  const lastKnownMonth = useMemo(() => {
    const keys = Array.from(allRatesMap.keys()).sort();
    return keys.length > 0 ? keys[keys.length - 1] : '';
  }, [allRatesMap]);

  const handleAddRate = () => {
    if (!newMonth || !newRate) return;
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate < 0) return;
    const newHistory = [
      ...(profile.inflationHistory || []).filter(r => r.month !== newMonth),
      { month: newMonth, rate },
    ];
    onUpdateProfile({ ...profile, inflationHistory: newHistory });
    setNewMonth('');
    setNewRate('');
  };

  const handleDeleteUserRate = (month: string) => {
    onUpdateProfile({
      ...profile,
      inflationHistory: (profile.inflationHistory || []).filter(r => r.month !== month),
    });
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-white/30 dark:border-slate-700/40 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="text-lg font-bold">Ajuste por Inflación</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">INDEC IPC · Contratos ARS</p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto p-4 md:p-6 space-y-5 pb-24">

        {/* Info banner */}
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex gap-3">
          <span className="material-symbols-outlined text-amber-500 shrink-0 mt-0.5">info</span>
          <div className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
            <p className="font-bold">¿Cómo funciona?</p>
            <p>Muestra cuánto debería cobrar hoy si tu contrato hubiera seguido el ritmo de la inflación desde su inicio. Los datos usan el IPC INDEC. Actualizá el último reporte cada mes.</p>
          </div>
        </div>

        {/* Last known month */}
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>Último dato cargado:</span>
          <span className={`font-bold ${lastKnownMonth ? 'text-emerald-500' : 'text-amber-500'}`}>
            {lastKnownMonth ? formatMonthLabel(lastKnownMonth) : 'Sin datos'}
          </span>
        </div>

        {/* Contracts */}
        {contracts.length === 0 ? (
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2 block">contract</span>
            <p className="font-bold text-slate-500 text-sm">Sin contratos en ARS con fecha de inicio</p>
            <p className="text-xs text-slate-400 mt-1">Agregá una fecha de inicio en tus contratos ARS para ver el ajuste</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Tus contratos en pesos</h3>
            {contracts.map(c => {
              const cumulPct = (c.cumInflation * 100).toFixed(1);
              const lossPct = c.adjustedAmount > 0 ? ((c.src.amount / c.adjustedAmount) * 100).toFixed(0) : '100';
              return (
                <div key={c.src.id} className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-sm">{c.src.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Desde {formatMonthLabel(c.startMonth)}</p>
                    </div>
                    <div className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                      c.gap > 0 ? 'bg-red-100 dark:bg-red-900/20 text-red-600' : 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600'
                    }`}>
                      +{cumulPct}% acumulado
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                      <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Contrato actual</p>
                      <p className={`text-base font-black ${blur}`}>{formatMoney(c.src.amount)}</p>
                    </div>
                    <div className={`rounded-xl p-3 ${c.gap > 0 ? 'bg-red-50 dark:bg-red-900/10' : 'bg-emerald-50 dark:bg-emerald-900/10'}`}>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Ajustado a hoy</p>
                      <p className={`text-base font-black ${c.gap > 0 ? 'text-red-500' : 'text-emerald-500'} ${blur}`}>{formatMoney(c.adjustedAmount)}</p>
                    </div>
                  </div>

                  {c.gap > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-red-600 font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">trending_down</span>
                          Poder adquisitivo real
                        </span>
                        <span className="text-xs font-bold text-red-600">{lossPct}% del original</span>
                      </div>
                      <div className="w-full h-2 bg-red-200 dark:bg-red-900/30 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${lossPct}%` }} />
                      </div>
                      <p className={`text-xs text-red-600 font-bold mt-2 ${blur}`}>
                        Perdiste {formatMoney(c.gap)} en poder de compra desde el inicio
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add new INDEC report */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">add_chart</span>
            Cargar nuevo reporte INDEC
          </h3>
          <p className="text-xs text-slate-400 mb-4">INDEC publica el IPC del mes anterior. Agregá el dato cuando salga cada mes.</p>
          <div className="flex gap-2">
            <input
              type="month"
              value={newMonth}
              onChange={e => setNewMonth(e.target.value)}
              className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <div className="relative w-28">
              <input
                type="number"
                value={newRate}
                onChange={e => setNewRate(e.target.value)}
                placeholder="3.7"
                min="0"
                max="100"
                step="0.1"
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 pr-6"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">%</span>
            </div>
            <button
              onClick={handleAddRate}
              disabled={!newMonth || !newRate}
              className="bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              Guardar
            </button>
          </div>
        </div>

        {/* Rate history */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button
            onClick={() => setShowRateHistory(!showRateHistory)}
            className="w-full flex items-center justify-between p-5 text-left"
          >
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">history</span>
              Historial de tasas ({sortedRateHistory.length})
            </h3>
            <span className="material-symbols-outlined text-slate-400 text-sm transition-transform" style={{ transform: showRateHistory ? 'rotate(180deg)' : 'none' }}>
              expand_more
            </span>
          </button>

          {showRateHistory && (
            <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {sortedRateHistory.map(([month, entry]) => (
                <div key={month} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    {entry.isUser && (
                      <span className="text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">MANUAL</span>
                    )}
                    <span className="text-sm font-bold">{formatMonthLabel(month)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-black ${entry.rate >= 10 ? 'text-red-500' : entry.rate >= 5 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {entry.rate}%
                    </span>
                    {entry.isUser && (
                      <button
                        onClick={() => handleDeleteUserRate(month)}
                        className="text-slate-300 hover:text-red-400 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default InflationAdjuster;
