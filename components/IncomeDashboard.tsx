
import React, { useMemo, useState } from 'react';
import { FinancialProfile, IncomeSource } from '../types';
import { formatMoney, formatUSD, getDollarRate, getSalaryForMonth, isSourceActiveInMonth } from '../utils';

interface Props {
  profile: FinancialProfile;
  transactions: any[];
  onBack: () => void;
  onOpenIncomeManager: () => void;
  privacyMode?: boolean;
}

const MONTH_NAMES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const PALETTE = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444',
  '#06B6D4', '#F97316', '#6366F1', '#14B8A6', '#E879F9', '#84CC16'
];

const IncomeDashboard: React.FC<Props> = ({ profile, transactions, onBack, onOpenIncomeManager, privacyMode }) => {
  const dollarRate = getDollarRate(profile);
  const sources = profile.incomeSources || [];
  const activeSources = sources.filter(s => s.isActive !== false);
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'6m' | '12m'>('6m');
  const [timelineMode, setTimelineMode] = useState<'amounts' | 'composition'>('amounts');

  // --- HELPERS ---
  const getMode = (src: IncomeSource) => src.incomeMode || (src.isCreatorSource ? 'VARIABLE' : 'FIXED');

  // --- CURRENT MONTH INCOME PER SOURCE ---
  const sourceBreakdown = useMemo(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return activeSources.map((src, idx) => {
      let monthlyArs = 0;
      const mode = getMode(src);
      if (mode === 'VARIABLE') {
        const payments = src.payments?.filter(p => p.month.startsWith(currentMonthKey)) || [];
        monthlyArs = payments.reduce((acc, p) => acc + p.realAmount, 0);
        if (src.currency === 'USD') monthlyArs *= dollarRate;
      } else if (mode === 'PER_DELIVERY') {
        const paidPosts = (src.posts || []).filter(p => p.isPaid);
        monthlyArs = paidPosts.reduce((acc, p) => acc + p.amount, 0);
        if (src.currency === 'USD') monthlyArs *= dollarRate;
      } else {
        if (!isSourceActiveInMonth(src, currentMonthKey)) {
          monthlyArs = 0;
        } else {
          monthlyArs = src.currency === 'USD' ? src.amount * dollarRate : src.amount;
          if (src.frequency === 'BIWEEKLY') monthlyArs *= 2;
        }
      }

      return {
        source: src,
        amount: monthlyArs,
        color: PALETTE[idx % PALETTE.length],
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [activeSources, dollarRate]);

  const totalMonthly = sourceBreakdown.reduce((s, b) => s + b.amount, 0);

  // --- MONTHLY EVOLUTION (last 6 or 12 months) ---
  const monthlyEvolution = useMemo(() => {
    const months = viewMode === '6m' ? 6 : 12;
    const result: { key: string; label: string; total: number; perSource: { name: string; amount: number; color: string }[] }[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = MONTH_NAMES_SHORT[d.getMonth()];

      const perSource = activeSources.map((src, idx) => {
        let val = 0;
        const mode = getMode(src);
        if (mode === 'VARIABLE') {
          const payments = src.payments?.filter(p => p.month.startsWith(key)) || [];
          val = payments.reduce((acc, p) => acc + p.realAmount, 0);
        } else if (mode === 'PER_DELIVERY') {
          const monthPosts = (src.posts || []).filter(p => p.isPaid && p.date.startsWith(key));
          val = monthPosts.reduce((acc, p) => acc + p.amount, 0);
        } else {
          if (!isSourceActiveInMonth(src, key)) val = 0;
          else {
            val = src.amount;
            if (src.frequency === 'BIWEEKLY') val *= 2;
          }
        }
        if (src.currency === 'USD') val *= dollarRate;
        return { name: src.name, amount: val, color: PALETTE[idx % PALETTE.length] };
      });

      result.push({
        key,
        label,
        total: perSource.reduce((s, p) => s + p.amount, 0),
        perSource,
      });
    }
    return result;
  }, [activeSources, dollarRate, viewMode]);

  const maxMonthlyVal = Math.max(...monthlyEvolution.map(m => m.total), 1);

  // --- 24-MONTH TIMELINE ---
  const timelineData = useMemo(() => {
    const result: { key: string; label: string; year: number; total: number; perSource: { name: string; amount: number; color: string }[] }[] = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = MONTH_NAMES_SHORT[d.getMonth()];
      const perSource = activeSources.map((src, idx) => {
        let val = 0;
        const mode = getMode(src);
        if (mode === 'VARIABLE') {
          val = (src.payments?.filter(p => p.month.startsWith(key)) || []).reduce((acc, p) => acc + p.realAmount, 0);
        } else if (mode === 'PER_DELIVERY') {
          val = (src.posts || []).filter(p => p.isPaid && p.date.startsWith(key)).reduce((acc, p) => acc + p.amount, 0);
        } else {
          if (!isSourceActiveInMonth(src, key)) val = 0;
          else {
            val = src.amount;
            if (src.frequency === 'BIWEEKLY') val *= 2;
          }
        }
        if (src.currency === 'USD') val *= dollarRate;
        return { name: src.name, amount: val, color: PALETTE[idx % PALETTE.length] };
      });
      result.push({ key, label, year: d.getFullYear(), total: perSource.reduce((s, p) => s + p.amount, 0), perSource });
    }
    return result;
  }, [activeSources, dollarRate]);

  const maxTimelineVal = Math.max(...timelineData.map(m => m.total), 1);

  // --- STATS ---
  const stats = useMemo(() => {
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const currentTotal = getSalaryForMonth(profile, currentKey, dollarRate);
    const prevTotal = getSalaryForMonth(profile, prevKey, dollarRate);
    const variation = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;

    const last6 = monthlyEvolution.slice(-6);
    const avg = last6.length > 0 ? last6.reduce((s, m) => s + m.total, 0) / last6.length : 0;

    const topSource = sourceBreakdown.length > 0 ? sourceBreakdown[0] : null;

    const usdSources = activeSources.filter(s => s.currency === 'USD');
    const totalUsd = usdSources.reduce((sum, src) => {
      const mode = getMode(src);
      let val = src.amount;
      if (mode === 'VARIABLE') {
        const payments = src.payments?.filter(p => p.month.startsWith(currentKey)) || [];
        val = payments.reduce((acc, p) => acc + p.realAmount, 0);
      } else if (mode === 'PER_DELIVERY') {
        val = (src.posts || []).filter(p => p.isPaid).reduce((acc, p) => acc + p.amount, 0);
      } else {
        if (!isSourceActiveInMonth(src, currentKey)) val = 0;
        else if (src.frequency === 'BIWEEKLY') val *= 2;
      }
      return sum + val;
    }, 0);

    // Paid vs unpaid for current month
    let paidCount = 0;
    let unpaidCount = 0;
    activeSources.forEach(src => {
      const payment = src.payments?.find(p => p.month.startsWith(currentKey));
      if (payment?.isPaid) paidCount++;
      else unpaidCount++;
    });

    return { currentTotal, prevTotal, variation, avg, topSource, totalUsd, paidCount, unpaidCount };
  }, [profile, dollarRate, monthlyEvolution, sourceBreakdown, activeSources]);

  // --- DONUT CHART SVG ---
  const donutSegments = useMemo(() => {
    if (totalMonthly === 0) return [];
    const segments: { startAngle: number; endAngle: number; color: string; percent: number; name: string; amount: number }[] = [];
    let current = -90; // Start from top

    sourceBreakdown.forEach((b) => {
      if (b.amount <= 0) return;
      const pct = (b.amount / totalMonthly) * 100;
      const angle = (pct / 100) * 360;
      segments.push({
        startAngle: current,
        endAngle: current + angle,
        color: b.color,
        percent: pct,
        name: b.source.name,
        amount: b.amount,
      });
      current += angle;
    });
    return segments;
  }, [sourceBreakdown, totalMonthly]);

  const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
    const rad = (a: number) => (a * Math.PI) / 180;
    const x1 = cx + r * Math.cos(rad(startAngle));
    const y1 = cy + r * Math.sin(rad(startAngle));
    const x2 = cx + r * Math.cos(rad(endAngle));
    const y2 = cy + r * Math.sin(rad(endAngle));
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      {/* HEADER */}
      <div className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-white/30 dark:border-slate-700/40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h2 className="text-lg font-bold">Dashboard de Ingresos</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Análisis completo</p>
          </div>
        </div>
        <button onClick={onOpenIncomeManager} className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors">
          <span className="material-symbols-outlined text-sm">edit</span>
          Gestionar
        </button>
      </div>

      <div className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 space-y-6 pb-24">

        {/* HERO CARD */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white rounded-3xl p-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
          <div className="relative z-10">
            <p className="text-xs text-blue-200 font-bold uppercase tracking-widest mb-1">Ingreso Total Este Mes</p>
            <h1 className={`text-4xl font-black tracking-tight mb-1 ${privacyMode ? 'blur-md select-none' : ''}`}>
              {formatMoney(stats.currentTotal)}
            </h1>
            {stats.totalUsd > 0 && (
              <p className={`text-sm text-blue-200 ${privacyMode ? 'blur-sm' : ''}`}>
                Incluye {formatUSD(stats.totalUsd)} en dólares
              </p>
            )}
            <div className="flex items-center gap-4 mt-4">
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${
                stats.variation >= 0 ? 'bg-emerald-500/20 text-emerald-200' : 'bg-red-500/20 text-red-200'
              }`}>
                <span className="material-symbols-outlined text-sm">
                  {stats.variation >= 0 ? 'trending_up' : 'trending_down'}
                </span>
                {stats.variation >= 0 ? '+' : ''}{stats.variation.toFixed(1)}% vs mes anterior
              </div>
            </div>
          </div>
        </div>

        {/* QUICK STATS ROW */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Promedio 6M</p>
            <p className={`text-lg font-black ${privacyMode ? 'blur-sm' : ''}`}>{formatMoney(stats.avg)}</p>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Fuentes Activas</p>
            <p className="text-lg font-black">{activeSources.length}</p>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Cobrados</p>
            <p className="text-lg font-black">
              <span className="text-emerald-500">{stats.paidCount}</span>
              <span className="text-slate-300 dark:text-slate-600 mx-1">/</span>
              <span className="text-slate-400">{stats.paidCount + stats.unpaidCount}</span>
            </p>
          </div>
        </div>

        {/* DONUT CHART + LEGEND */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Distribución de Ingresos</h3>
          
          {totalMonthly === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2 block">pie_chart</span>
              <p className="text-sm font-bold">Sin datos de ingresos este mes</p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* SVG Donut */}
              <div className="relative w-52 h-52 shrink-0">
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  {donutSegments.map((seg, i) => {
                    const isHovered = hoveredSlice === i;
                    const r = isHovered ? 78 : 75;
                    return (
                      <path
                        key={i}
                        d={describeArc(100, 100, r, seg.startAngle, seg.endAngle - 0.5)}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={isHovered ? 26 : 22}
                        strokeLinecap="round"
                        className="transition-all duration-200 cursor-pointer"
                        onMouseEnter={() => setHoveredSlice(i)}
                        onMouseLeave={() => setHoveredSlice(null)}
                        opacity={hoveredSlice !== null && hoveredSlice !== i ? 0.4 : 1}
                      />
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {hoveredSlice !== null ? (
                    <>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{donutSegments[hoveredSlice]?.name}</p>
                      <p className={`text-xl font-black ${privacyMode ? 'blur-sm' : ''}`}>
                        {donutSegments[hoveredSlice]?.percent.toFixed(1)}%
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] text-slate-400 font-bold">TOTAL</p>
                      <p className={`text-xl font-black ${privacyMode ? 'blur-sm' : ''}`}>
                        {formatMoney(totalMonthly)}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 w-full space-y-2">
                {sourceBreakdown.filter(b => b.amount > 0).map((b, i) => {
                  const pct = (b.amount / totalMonthly) * 100;
                  return (
                    <div
                      key={b.source.id}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      onMouseEnter={() => setHoveredSlice(i)}
                      onMouseLeave={() => setHoveredSlice(null)}
                    >
                      <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{b.source.name}</p>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-1">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: b.color }} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-black ${privacyMode ? 'blur-sm' : ''}`}>{formatMoney(b.amount)}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{pct.toFixed(1)}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* EVOLUTION CHART */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Evolución Mensual</h3>
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex">
              <button
                onClick={() => setViewMode('6m')}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-colors ${viewMode === '6m' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-400'}`}
              >
                6 Meses
              </button>
              <button
                onClick={() => setViewMode('12m')}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-colors ${viewMode === '12m' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-400'}`}
              >
                12 Meses
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {monthlyEvolution.map((m) => {
              const pct = (m.total / maxMonthlyVal) * 100;
              return (
                <div key={m.key} className="group">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-400 w-8 text-right">{m.label}</span>
                    <div className="flex-1 h-7 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden relative flex">
                      {/* Stacked bars per source */}
                      {m.perSource.filter(s => s.amount > 0).map((s, si) => {
                        const w = m.total > 0 ? (s.amount / maxMonthlyVal) * 100 : 0;
                        return (
                          <div
                            key={si}
                            className="h-full transition-all duration-300 relative group/bar"
                            style={{ width: `${w}%`, backgroundColor: s.color }}
                            title={`${s.name}: ${formatMoney(s.amount)}`}
                          />
                        );
                      })}
                    </div>
                    <span className={`text-xs font-bold w-24 text-right ${privacyMode ? 'blur-sm' : ''}`}>
                      {formatMoney(m.total)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Source color legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            {activeSources.map((src, i) => (
              <div key={src.id} className="flex items-center gap-1.5">
                <div className="size-2 rounded-full" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                <span className="text-[10px] text-slate-500 font-bold">{src.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 24-MONTH TIMELINE */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Línea de Tiempo · 24 Meses</h3>
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex">
              <button
                onClick={() => setTimelineMode('amounts')}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-colors ${timelineMode === 'amounts' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-400'}`}
              >
                Montos
              </button>
              <button
                onClick={() => setTimelineMode('composition')}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-colors ${timelineMode === 'composition' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-400'}`}
              >
                Composición %
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            {timelineData.map((m, idx) => {
              const showYear = idx === 0 || m.year !== timelineData[idx - 1].year;
              return (
                <React.Fragment key={m.key}>
                  {showYear && (
                    <p className="text-[9px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest pt-2 pb-0.5">{m.year}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-slate-400 w-7 text-right shrink-0">{m.label}</span>
                    <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden flex">
                      {timelineMode === 'amounts' ? (
                        m.perSource.filter(s => s.amount > 0).map((s, si) => (
                          <div
                            key={si}
                            className="h-full transition-all duration-300"
                            style={{ width: `${(s.amount / maxTimelineVal) * 100}%`, backgroundColor: s.color }}
                            title={`${s.name}: ${s.amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}`}
                          />
                        ))
                      ) : (
                        m.total > 0 ? m.perSource.filter(s => s.amount > 0).map((s, si) => (
                          <div
                            key={si}
                            className="h-full transition-all duration-300"
                            style={{ width: `${(s.amount / m.total) * 100}%`, backgroundColor: s.color }}
                            title={`${s.name}: ${((s.amount / m.total) * 100).toFixed(1)}%`}
                          />
                        )) : <div className="h-full w-full bg-slate-200 dark:bg-slate-700 opacity-30" />
                      )}
                    </div>
                    {timelineMode === 'amounts' ? (
                      <span className={`text-[9px] font-bold w-20 text-right shrink-0 ${privacyMode ? 'blur-sm' : ''}`}>
                        {m.total > 0 ? formatMoney(m.total) : '—'}
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-400 w-20 text-right shrink-0">
                        {m.total > 0 ? `${activeSources.length} fuentes` : '—'}
                      </span>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            {activeSources.map((src, i) => (
              <div key={src.id} className="flex items-center gap-1.5">
                <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                <span className="text-[10px] text-slate-500 font-bold">{src.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* TOP SOURCE CARD */}
        {stats.topSource && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-100 font-bold uppercase tracking-widest mb-1">Mayor Fuente de Ingreso</p>
                <p className="text-2xl font-black">{stats.topSource.source.name}</p>
                <p className={`text-lg font-bold text-amber-100 ${privacyMode ? 'blur-sm' : ''}`}>
                  {formatMoney(stats.topSource.amount)} 
                  <span className="text-sm ml-2">
                    ({totalMonthly > 0 ? ((stats.topSource.amount / totalMonthly) * 100).toFixed(1) : 0}%)
                  </span>
                </p>
              </div>
              <span className="material-symbols-outlined text-5xl opacity-30">trophy</span>
            </div>
          </div>
        )}

        {/* SOURCE DETAILS TABLE */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Detalle por Fuente</h3>
          <div className="space-y-3">
            {sourceBreakdown.map((b) => {
              const src = b.source;
              const isUSD = src.currency === 'USD';
              const mode = getMode(src);
              const rawAmount = (mode === 'VARIABLE' || mode === 'PER_DELIVERY') ? (b.amount / (isUSD ? dollarRate : 1)) : src.amount;
              const paidPayments = src.payments?.filter(p => p.isPaid) || [];

              return (
                <div key={src.id} className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="size-10 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: b.color }}>
                    {src.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{src.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                        mode === 'VARIABLE' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                        mode === 'PER_DELIVERY' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' :
                        src.frequency === 'BIWEEKLY' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' :
                        'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}>
                        {mode === 'VARIABLE' ? 'Variable' : mode === 'PER_DELIVERY' ? 'Por Entrega' : src.frequency === 'BIWEEKLY' ? 'Quincenal' : 'Mensual'}
                      </span>
                      {isUSD && <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold">USD</span>}
                      {src.targetPosts && src.targetPosts > 0 && (
                        <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold">
                          {src.targetPosts} posts/mes
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${privacyMode ? 'blur-sm' : ''}`}>{formatMoney(b.amount)}</p>
                    {isUSD && <p className={`text-[10px] text-slate-400 ${privacyMode ? 'blur-sm' : ''}`}>{formatUSD(rawAmount)}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CURRENCY EXPOSURE */}
        {(() => {
          const usdIncome = sourceBreakdown.filter(b => b.source.currency === 'USD').reduce((s, b) => s + b.amount, 0);
          const arsIncome = sourceBreakdown.filter(b => b.source.currency !== 'USD').reduce((s, b) => s + b.amount, 0);
          const total = usdIncome + arsIncome;
          if (total === 0) return null;
          const usdPct = (usdIncome / total) * 100;
          const arsPct = (arsIncome / total) * 100;
          const usdRaw = sourceBreakdown.filter(b => b.source.currency === 'USD').reduce((s, b) => {
            const mode = getMode(b.source);
            if (mode === 'PER_DELIVERY') return s + (b.source.posts || []).filter(p => p.isPaid).reduce((a, p) => a + p.amount, 0);
            if (mode === 'VARIABLE') return s + (b.source.payments?.filter(p => p.month.startsWith(`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`)).reduce((a, p) => a + p.realAmount, 0) || 0);
            let v = b.source.amount; if (b.source.frequency === 'BIWEEKLY') v *= 2; return s + v;
          }, 0);

          return (
            <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">currency_exchange</span>
                Exposición Cambiaria
              </h3>
              <div className="flex gap-3 mb-4">
                <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl p-4 text-center border border-emerald-200 dark:border-emerald-800">
                  <p className="text-[9px] text-emerald-600 font-bold uppercase">Dólares</p>
                  <p className={`text-xl font-black text-emerald-600 ${privacyMode ? 'blur-sm' : ''}`}>{usdPct.toFixed(0)}%</p>
                  {usdRaw > 0 && <p className={`text-[10px] text-emerald-500 ${privacyMode ? 'blur-sm' : ''}`}>~USD {Math.round(usdRaw)}</p>}
                </div>
                <div className="flex-1 bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 text-center border border-blue-200 dark:border-blue-800">
                  <p className="text-[9px] text-blue-600 font-bold uppercase">Pesos</p>
                  <p className={`text-xl font-black text-blue-600 ${privacyMode ? 'blur-sm' : ''}`}>{arsPct.toFixed(0)}%</p>
                  <p className={`text-[10px] text-blue-500 ${privacyMode ? 'blur-sm' : ''}`}>{formatMoney(arsIncome)}</p>
                </div>
              </div>
              <div className="w-full h-3 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${usdPct}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="text-center">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Si USD sube 10%</p>
                  <p className={`text-sm font-black text-emerald-500 ${privacyMode ? 'blur-sm' : ''}`}>+{formatMoney(usdIncome * 0.1)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Si USD baja 10%</p>
                  <p className={`text-sm font-black text-red-500 ${privacyMode ? 'blur-sm' : ''}`}>-{formatMoney(usdIncome * 0.1)}</p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* PAYMENT CALENDAR */}
        {(() => {
          const now = new Date();
          const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
          const today = now.getDate();
          const entries: { day: number; name: string; amount: number; currency: string; isPaid: boolean }[] = [];
          
          activeSources.forEach(src => {
            const mode = getMode(src);
            if (mode === 'PER_DELIVERY') return;
            // Estimate payment day (use billingDay-like logic, default to 1st or 5th)
            const payDay = src.startDate ? parseInt(src.startDate.split('-')[2]) || 5 : 5;
            const pfx = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
            const isPaid = src.payments?.some(p => p.month.startsWith(pfx) && p.isPaid) || false;
            let val = src.amount;
            if (mode === 'VARIABLE') {
              val = src.payments?.filter(p => p.month.startsWith(pfx)).reduce((a, p) => a + p.realAmount, 0) || 0;
            }
            entries.push({ day: payDay > daysInMonth ? daysInMonth : payDay, name: src.name, amount: val, currency: src.currency || 'ARS', isPaid });
          });

          entries.sort((a, b) => a.day - b.day);
          if (entries.length === 0) return null;

          return (
            <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">calendar_month</span>
                Calendario de Cobros
              </h3>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
                <div className="space-y-3">
                  {entries.map((e, i) => {
                    const isPast = e.day < today;
                    const isToday = e.day === today;
                    return (
                      <div key={i} className="flex items-center gap-4 pl-1">
                        <div className={`size-7 rounded-full flex items-center justify-center text-[10px] font-black z-10 shrink-0 ${
                          e.isPaid ? 'bg-emerald-500 text-white' : isToday ? 'bg-primary text-white ring-2 ring-primary/30' : isPast ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                        }`}>{e.day}</div>
                        <div className="flex-1 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold">{e.name}</p>
                            <p className={`text-[10px] ${e.isPaid ? 'text-emerald-500' : isPast ? 'text-amber-500' : 'text-slate-400'} font-bold`}>
                              {e.isPaid ? 'Cobrado' : isPast ? 'Pendiente' : 'Próximo'}
                            </p>
                          </div>
                          <p className={`text-sm font-black ${privacyMode ? 'blur-sm' : ''}`}>
                            {e.currency === 'USD' ? `USD ${e.amount}` : formatMoney(e.amount)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default IncomeDashboard;
