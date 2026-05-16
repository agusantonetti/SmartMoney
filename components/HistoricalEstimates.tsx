
import React, { useState, useMemo } from 'react';
import { FinancialProfile, HistoricalMonthEstimate } from '../types';
import { formatMoney, DEFAULT_CATEGORIES, getCategoryIcon } from '../utils';

interface Props {
  profile: FinancialProfile;
  onUpdateProfile: (profile: FinancialProfile) => void;
  onBack: () => void;
  privacyMode?: boolean;
}

const TOP_CATEGORIES = [
  'Comida', 'Supermercado', 'Transporte', 'Hogar', 'Salud',
  'Entretenimiento', 'Ropa', 'Servicios', 'Suscripciones', 'Otros',
];

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

const HistoricalEstimates: React.FC<Props> = ({ profile, onUpdateProfile, onBack, privacyMode }) => {
  const estimates = profile.historicalEstimates || [];
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const blur = privacyMode ? 'blur-sm' : '';

  const monthOptions = useMemo(() => buildMonthOptions(24), []);

  const getEstimate = (month: string): HistoricalMonthEstimate | undefined =>
    estimates.find(e => e.month === month);

  const totalEstimated = useMemo(
    () => estimates.reduce((sum, e) => sum + Object.values(e.byCategory).reduce((a, n) => a + (n || 0), 0), 0),
    [estimates],
  );

  const updateMonth = (month: string, byCategory: Record<string, number>, note?: string) => {
    const cleaned: Record<string, number> = {};
    Object.entries(byCategory).forEach(([k, v]) => { if (v && v > 0) cleaned[k] = v; });
    const others = estimates.filter(e => e.month !== month);
    const newList = Object.keys(cleaned).length > 0
      ? [...others, { month, byCategory: cleaned, note }].sort((a, b) => a.month.localeCompare(b.month))
      : others;
    onUpdateProfile({ ...profile, historicalEstimates: newList });
  };

  const deleteMonth = (month: string) => {
    if (!confirm(`¿Eliminar la estimación de ${monthLabel(month)}?`)) return;
    onUpdateProfile({ ...profile, historicalEstimates: estimates.filter(e => e.month !== month) });
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      <div className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-white/30 dark:border-slate-700/40 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="text-lg font-bold">Historia Recuperada</h2>
          <p className="text-[10px] text-slate-400">Estimaciones manuales para meses sin transacciones</p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-3xl mx-auto p-6 space-y-6 pb-24">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-amber-600">restore</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-amber-900 dark:text-amber-100">Para meses sin transacciones registradas</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                Cargá el promedio aproximado que recordás por mes y categoría. Estas estimaciones alimentan
                tus promedios, runway y comparativas — pero quedan separadas de las transacciones reales para que sepas qué es qué.
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
            const total = est ? Object.values(est.byCategory).reduce((a, n) => a + (n || 0), 0) : 0;
            const isExpanded = expandedMonth === month;
            return (
              <div key={month} className={`rounded-2xl border transition-colors ${est ? 'bg-emerald-50/40 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-surface-light dark:bg-surface-dark border-slate-200 dark:border-slate-700'}`}>
                <button
                  onClick={() => setExpandedMonth(isExpanded ? null : month)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded-2xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`size-10 rounded-xl flex items-center justify-center ${est ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                      <span className="material-symbols-outlined text-base">{est ? 'check' : 'edit_calendar'}</span>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm capitalize">{monthLabel(month)}</p>
                      {est
                        ? <p className={`text-[11px] text-emerald-600 font-bold ${blur}`}>{formatMoney(total)} estimado</p>
                        : <p className="text-[11px] text-slate-400">Sin estimación</p>}
                    </div>
                  </div>
                  <span className={`material-symbols-outlined text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                </button>

                {isExpanded && (
                  <MonthEditor
                    month={month}
                    existing={est}
                    onSave={(byCat, note) => updateMonth(month, byCat, note)}
                    onDelete={() => deleteMonth(month)}
                    privacyMode={privacyMode}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface EditorProps {
  month: string;
  existing?: HistoricalMonthEstimate;
  onSave: (byCategory: Record<string, number>, note?: string) => void;
  onDelete: () => void;
  privacyMode?: boolean;
}

const MonthEditor: React.FC<EditorProps> = ({ month, existing, onSave, onDelete, privacyMode }) => {
  const initialDraft: Record<string, string> = {};
  TOP_CATEGORIES.forEach(c => { initialDraft[c] = existing?.byCategory[c] ? String(existing.byCategory[c]) : ''; });
  const customCats = existing ? Object.keys(existing.byCategory).filter(k => !TOP_CATEGORIES.includes(k)) : [];
  customCats.forEach(c => { initialDraft[c] = String(existing!.byCategory[c]); });

  const [draft, setDraft] = useState<Record<string, string>>(initialDraft);
  const [note, setNote] = useState(existing?.note || '');

  const total = Object.values(draft).reduce((a, v) => a + (parseFloat(v) || 0), 0);

  const handleSave = () => {
    const byCategory: Record<string, number> = {};
    Object.entries(draft).forEach(([k, v]) => {
      const n = parseFloat(v);
      if (n > 0) byCategory[k] = n;
    });
    onSave(byCategory, note.trim() || undefined);
  };

  const applyAveragePreset = (perCategory: number) => {
    const next: Record<string, string> = { ...draft };
    TOP_CATEGORIES.forEach(c => { if (c !== 'Otros') next[c] = String(perCategory); });
    setDraft(next);
  };

  return (
    <div className="border-t border-slate-200 dark:border-slate-700 p-5 space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-blue-500 text-sm">tips_and_updates</span>
        <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-tight">
          Cargá montos aproximados por categoría. Solo lo que recuerdes; lo que dejés en blanco no se cuenta.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {TOP_CATEGORIES.map(cat => (
          <div key={cat} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5">
            <div className="size-8 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-sm text-slate-500">{getCategoryIcon(cat)}</span>
            </div>
            <span className="text-xs font-bold flex-1 truncate">{cat}</span>
            <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 font-bold mr-1">$</span>
              <input
                type="number"
                inputMode="decimal"
                className={`w-20 text-right font-bold text-xs outline-none bg-transparent ${privacyMode ? 'blur-sm' : ''}`}
                placeholder="0"
                value={draft[cat] || ''}
                onChange={e => setDraft({ ...draft, [cat]: e.target.value })}
              />
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Nota (opcional)</label>
        <input
          type="text"
          className="w-full bg-slate-100 dark:bg-slate-900 p-2.5 rounded-lg outline-none text-xs font-medium"
          placeholder="Ej: estimado, mes con vacaciones"
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2 text-[10px]">
        <span className="text-slate-400 font-bold uppercase self-center">Presets:</span>
        {[5000, 10000, 20000, 50000].map(v => (
          <button
            key={v}
            onClick={() => applyAveragePreset(v)}
            className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            ${v.toLocaleString()}/cat
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Total estimado del mes</p>
          <p className={`text-xl font-black ${privacyMode ? 'blur-sm' : ''}`}>{formatMoney(total)}</p>
        </div>
        <div className="flex gap-2">
          {existing && (
            <button
              onClick={onDelete}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 dark:hover:bg-red-900/50"
            >
              Eliminar
            </button>
          )}
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-blue-600"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoricalEstimates;
