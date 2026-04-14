
import React, { useMemo, useState } from 'react';
import { FinancialProfile, Subscription, Transaction } from '../types';
import { formatMoney, formatCurrency, getDollarRate } from '../utils';

interface Props {
  profile: FinancialProfile;
  transactions: Transaction[];
  onBack: () => void;
  onOpenSubscriptions: () => void;
  privacyMode?: boolean;
}

const CATEGORY_MAP: Record<string, { label: string; icon: string; color: string }> = {
  streaming: { label: 'Streaming', icon: 'smart_display', color: '#6366F1' },
  tools: { label: 'Herramientas', icon: 'build', color: '#06B6D4' },
  services: { label: 'Servicios', icon: 'bolt', color: '#EAB308' },
  education: { label: 'Educación', icon: 'school', color: '#3B82F6' },
  gaming: { label: 'Gaming', icon: 'sports_esports', color: '#8B5CF6' },
  storage: { label: 'Almacenamiento', icon: 'cloud', color: '#10B981' },
  // Legacy compat
  housing: { label: 'Vivienda', icon: 'home', color: '#F97316' },
  digital: { label: 'Digital', icon: 'smart_display', color: '#6366F1' },
};

const PALETTE = ['#6366F1', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4', '#F97316', '#14B8A6'];

const SubscriptionDashboard: React.FC<Props> = ({ profile, transactions, onBack, onOpenSubscriptions, privacyMode }) => {
  const dollarRate = getDollarRate(profile);
  const subs = profile.subscriptions || [];
  const [hoveredSub, setHoveredSub] = useState<string | null>(null);

  // --- CALCULATIONS ---
  const analysis = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Monthly cost per sub (normalized to monthly)
    const subCosts = subs.map((sub, idx) => {
      let monthlyArs = sub.currency === 'USD' ? sub.amount * dollarRate : sub.amount;
      if (sub.frequency === 'YEARLY') monthlyArs /= 12;
      
      // Days until next payment
      let daysUntil = 0;
      if (sub.nextPaymentDate) {
        const next = new Date(sub.nextPaymentDate + 'T00:00:00');
        next.setHours(0, 0, 0, 0);
        daysUntil = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        const target = new Date();
        target.setDate(sub.billingDay);
        target.setHours(0, 0, 0, 0);
        if (target <= now) target.setMonth(target.getMonth() + 1);
        daysUntil = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        sub,
        monthlyArs,
        yearlyArs: sub.frequency === 'YEARLY' ? (sub.currency === 'USD' ? sub.amount * dollarRate : sub.amount) : monthlyArs * 12,
        daysUntil,
        color: PALETTE[idx % PALETTE.length],
      };
    }).sort((a, b) => b.monthlyArs - a.monthlyArs);

    const totalMonthly = subCosts.reduce((s, c) => s + c.monthlyArs, 0);
    const totalYearly = subCosts.reduce((s, c) => s + c.yearlyArs, 0);

    // Category breakdown
    const categories: Record<string, { total: number; count: number }> = {};
    subCosts.forEach(c => {
      const cat = c.sub.category || 'digital';
      if (!categories[cat]) categories[cat] = { total: 0, count: 0 };
      categories[cat].total += c.monthlyArs;
      categories[cat].count++;
    });

    // % of total expenses this month
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthExpenses = transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(currentMonthKey))
      .reduce((s, t) => s + t.amount, 0);
    const pctOfExpenses = monthExpenses > 0 ? (totalMonthly / (monthExpenses + totalMonthly)) * 100 : 0;

    // Next 3 renewals
    const upcoming = [...subCosts]
      .filter(c => c.daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);

    // USD vs ARS breakdown
    const usdTotal = subs.filter(s => s.currency === 'USD').reduce((sum, s) => {
      let val = s.amount;
      if (s.frequency === 'YEARLY') val /= 12;
      return sum + val;
    }, 0);

    return { subCosts, totalMonthly, totalYearly, categories, pctOfExpenses, upcoming, usdTotal, monthExpenses };
  }, [subs, dollarRate, transactions]);

  // Donut for categories
  const catSegments = useMemo(() => {
    if (analysis.totalMonthly === 0) return [];
    const segments: { key: string; label: string; icon: string; color: string; pct: number; amount: number; startAngle: number; endAngle: number }[] = [];
    let current = -90;

    Object.entries(analysis.categories)
      .sort(([, a], [, b]) => b.total - a.total)
      .forEach(([key, val]) => {
        const pct = (val.total / analysis.totalMonthly) * 100;
        const angle = (pct / 100) * 360;
        const meta = CATEGORY_MAP[key] || { label: key, icon: 'category', color: '#94A3B8' };
        segments.push({
          key,
          label: meta.label,
          icon: meta.icon,
          color: meta.color,
          pct,
          amount: val.total,
          startAngle: current,
          endAngle: current + angle,
        });
        current += angle;
      });
    return segments;
  }, [analysis]);

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
            <h2 className="text-lg font-bold">Mis Suscripciones</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{subs.length} suscripciones activas</p>
          </div>
        </div>
        <button onClick={onOpenSubscriptions} className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors">
          <span className="material-symbols-outlined text-sm">edit</span>
          Gestionar
        </button>
      </div>

      <div className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 space-y-6 pb-24">

        {/* HERO CARD */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white rounded-3xl p-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10 grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-purple-200 font-bold uppercase tracking-widest mb-1">Costo Mensual</p>
              <h1 className={`text-3xl font-black tracking-tight ${privacyMode ? 'blur-md select-none' : ''}`}>
                {formatMoney(analysis.totalMonthly)}
              </h1>
              {analysis.usdTotal > 0 && (
                <p className={`text-xs text-purple-200 mt-1 ${privacyMode ? 'blur-sm' : ''}`}>
                  Incluye ~{formatCurrency(analysis.usdTotal, 'USD')}/mes en USD
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-purple-200 font-bold uppercase tracking-widest mb-1">Costo Anual</p>
              <h2 className={`text-3xl font-black tracking-tight ${privacyMode ? 'blur-md select-none' : ''}`}>
                {formatMoney(analysis.totalYearly)}
              </h2>
            </div>
          </div>
          <div className="relative z-10 mt-4 pt-4 border-t border-white/20 flex items-center gap-3">
            <div className="bg-white/20 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm">
              {analysis.pctOfExpenses.toFixed(1)}% de tus gastos mensuales
            </div>
            <div className="bg-white/20 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">per_day</span>
              {formatMoney(analysis.totalMonthly / 30)}/día
            </div>
          </div>
        </div>

        {/* UPCOMING RENEWALS */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">schedule</span>
            Próximas Renovaciones
          </h3>
          <div className="space-y-3">
            {analysis.upcoming.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No hay renovaciones próximas configuradas</p>
            ) : (
              analysis.upcoming.map((item) => {
                const isUrgent = item.daysUntil <= 3;
                const isSoon = item.daysUntil <= 7;
                return (
                  <div key={item.sub.id} className={`flex items-center gap-4 p-3 rounded-2xl transition-colors ${
                    isUrgent ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800' :
                    isSoon ? 'bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800' :
                    'bg-slate-50 dark:bg-slate-800/50'
                  }`}>
                    <div className={`size-10 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0`} style={{ backgroundColor: item.color }}>
                      <span className="material-symbols-outlined text-sm">
                        {CATEGORY_MAP[item.sub.category]?.icon || 'subscriptions'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{item.sub.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold">
                        {item.sub.frequency === 'YEARLY' ? 'Anual' : 'Mensual'} • Día {item.sub.billingDay}
                        {item.sub.currency === 'USD' && ' • USD'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-black ${privacyMode ? 'blur-sm' : ''}`}>
                        {formatCurrency(item.sub.amount, item.sub.currency || 'ARS')}
                      </p>
                      <p className={`text-[10px] font-bold ${
                        isUrgent ? 'text-red-500' : isSoon ? 'text-amber-500' : 'text-slate-400'
                      }`}>
                        {item.daysUntil === 0 ? '¡Hoy!' :
                         item.daysUntil === 1 ? 'Mañana' :
                         `En ${item.daysUntil} días`}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CATEGORY BREAKDOWN */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Por Categoría</h3>
          
          {catSegments.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <span className="material-symbols-outlined text-3xl mb-2 block">donut_large</span>
              <p className="text-sm font-bold">Sin suscripciones registradas</p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Mini donut */}
              <div className="relative w-40 h-40 shrink-0">
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  {catSegments.map((seg, i) => (
                    <path
                      key={seg.key}
                      d={describeArc(100, 100, 75, seg.startAngle, seg.endAngle - 0.5)}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={22}
                      strokeLinecap="round"
                      className="transition-all duration-200"
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-slate-300 dark:text-slate-600">subscriptions</span>
                  <p className="text-xs font-bold text-slate-400">{subs.length}</p>
                </div>
              </div>

              <div className="flex-1 w-full space-y-3">
                {catSegments.map(seg => (
                  <div key={seg.key} className="flex items-center gap-3">
                    <div className="size-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: seg.color }}>
                      <span className="material-symbols-outlined text-sm">{seg.icon}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold">{seg.label}</p>
                        <p className={`text-sm font-black ${privacyMode ? 'blur-sm' : ''}`}>{formatMoney(seg.amount)}</p>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-1">
                        <div className="h-full rounded-full transition-all" style={{ width: `${seg.pct}%`, backgroundColor: seg.color }} />
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{seg.pct.toFixed(1)}% del total</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ALL SUBSCRIPTIONS LIST */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Todas las Suscripciones</h3>
          <div className="space-y-2">
            {analysis.subCosts.map((item) => {
              const isHovered = hoveredSub === item.sub.id;
              return (
                <div
                  key={item.sub.id}
                  className={`flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer ${
                    isHovered ? 'bg-slate-100 dark:bg-slate-800 scale-[1.01]' : 'bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  onMouseEnter={() => setHoveredSub(item.sub.id)}
                  onMouseLeave={() => setHoveredSub(null)}
                >
                  <div className="size-11 rounded-2xl flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ backgroundColor: item.color }}>
                    {item.sub.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{item.sub.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-slate-400 font-bold">
                        {CATEGORY_MAP[item.sub.category]?.label || item.sub.category}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="text-[9px] text-slate-400 font-bold">
                        {item.sub.frequency === 'YEARLY' ? 'Anual' : 'Mensual'}
                      </span>
                      {item.sub.currency === 'USD' && (
                        <>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold">USD</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-black ${privacyMode ? 'blur-sm' : ''}`}>
                      {formatCurrency(item.sub.amount, item.sub.currency || 'ARS')}
                      {item.sub.frequency === 'YEARLY' && <span className="text-[9px] text-slate-400 font-bold ml-1">/año</span>}
                    </p>
                    <p className={`text-[10px] text-slate-400 ${privacyMode ? 'blur-sm' : ''}`}>
                      ~{formatMoney(item.monthlyArs)}/mes
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FUN FACTS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2" />
            <p className="text-[9px] text-emerald-100 font-bold uppercase mb-1">Por Hora</p>
            <p className={`text-xl font-black ${privacyMode ? 'blur-sm' : ''}`}>{formatMoney(analysis.totalMonthly / 720)}</p>
            <p className="text-[10px] text-emerald-200">Costo por hora de tu vida</p>
          </div>
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2" />
            <p className="text-[9px] text-violet-100 font-bold uppercase mb-1">Más Cara</p>
            <p className="text-xl font-black truncate">
              {analysis.subCosts.length > 0 ? analysis.subCosts[0].sub.name : '-'}
            </p>
            <p className={`text-[10px] text-violet-200 ${privacyMode ? 'blur-sm' : ''}`}>
              {analysis.subCosts.length > 0 ? formatMoney(analysis.subCosts[0].monthlyArs) + '/mes' : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionDashboard;
