
import React, { useState, useMemo } from 'react';
import { FinancialProfile, IncomeSource, IncomePayment, Transaction } from '../types';
import { formatMoney, formatUSD, getDollarRate, getCurrentMonthKey, formatMonthKey, getSalaryForMonth, isOneTimePurchase } from '../utils';

interface Props {
  profile: FinancialProfile;
  transactions: Transaction[];
  onUpdateProfile: (profile: FinancialProfile) => void;
  onBack: () => void;
  onAddTransaction: () => void;
  privacyMode?: boolean;
}

const getMode = (src: IncomeSource) => src.incomeMode || (src.isCreatorSource ? 'VARIABLE' : 'FIXED');

const MonthlyClose: React.FC<Props> = ({ profile, transactions, onUpdateProfile, onBack, onAddTransaction, privacyMode }) => {
  const dollarRate = getDollarRate(profile);
  const [step, setStep] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const blur = privacyMode ? 'blur-sm' : '';
  const sources = (profile.incomeSources || []).filter(s => s.isActive !== false);

  const months = useMemo(() => {
    const result: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      result.push({ key, label: formatMonthKey(key) });
    }
    return result;
  }, []);

  const incomeData = useMemo(() => {
    return sources.map(src => {
      const mode = getMode(src);
      const isUSD = src.currency === 'USD';
      const payment = src.payments?.find(p => p.month.startsWith(selectedMonth));
      const isPaid = payment?.isPaid || false;
      const realAmount = payment?.realAmount || (mode === 'FIXED' ? src.amount : 0);
      const postsCompleted = payment?.postsCompleted || 0;
      const targetPosts = src.targetPosts || 0;
      let monthlyArs = 0;
      if (mode === 'PER_DELIVERY') {
        const paidPosts = (src.posts || []).filter(p => p.isPaid && p.date.startsWith(selectedMonth));
        monthlyArs = paidPosts.reduce((a, p) => a + p.amount, 0);
        if (isUSD) monthlyArs *= dollarRate;
      } else {
        monthlyArs = isUSD ? realAmount * dollarRate : realAmount;
      }
      return { src, mode, isUSD, isPaid, realAmount, monthlyArs, postsCompleted, targetPosts };
    });
  }, [sources, selectedMonth, dollarRate, profile.incomeSources]);

  const paidCount = incomeData.filter(d => d.isPaid || (d.mode === 'PER_DELIVERY' && d.monthlyArs > 0)).length;
  const totalIncome = getSalaryForMonth(profile, selectedMonth, dollarRate);

  const expenseData = useMemo(() => {
    const monthTxs = transactions.filter(t => t.type === 'expense' && t.date.startsWith(selectedMonth));
    const total = monthTxs.reduce((a, t) => a + t.amount, 0);
    const recurring = monthTxs.filter(t => !isOneTimePurchase(t)).reduce((a, t) => a + t.amount, 0);
    const oneTime = total - recurring;
    const byCat: Record<string, number> = {};
    monthTxs.forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
    const categories = Object.entries(byCat).sort(([, a], [, b]) => b - a);
    const uncategorized = monthTxs.filter(t => t.category === 'Otros').length;
    return { total, recurring, oneTime, count: monthTxs.length, categories, uncategorized };
  }, [transactions, selectedMonth]);

  const handleTogglePaid = (sourceId: string) => {
    const srcIdx = (profile.incomeSources || []).findIndex(s => s.id === sourceId);
    if (srcIdx === -1) return;
    const src = profile.incomeSources![srcIdx];
    const mode = getMode(src);
    const payment = src.payments?.find(p => p.month.startsWith(selectedMonth));
    const expected = mode === 'FIXED' ? src.amount : 0;
    const newPayment: IncomePayment = { month: selectedMonth, realAmount: payment?.realAmount || expected, isPaid: !(payment?.isPaid || false), postsCompleted: payment?.postsCompleted, postsPaid: payment?.postsPaid };
    const newPayments = [...(src.payments || [])];
    const existIdx = newPayments.findIndex(p => p.month === selectedMonth);
    if (existIdx >= 0) newPayments[existIdx] = { ...newPayments[existIdx], ...newPayment }; else newPayments.push(newPayment);
    const updatedSources = [...(profile.incomeSources || [])]; updatedSources[srcIdx] = { ...src, payments: newPayments };
    onUpdateProfile({ ...profile, incomeSources: updatedSources });
  };

  const handleUpdateAmount = (sourceId: string, amount: number) => {
    const srcIdx = (profile.incomeSources || []).findIndex(s => s.id === sourceId);
    if (srcIdx === -1) return;
    const src = profile.incomeSources![srcIdx];
    const payment = src.payments?.find(p => p.month.startsWith(selectedMonth));
    const newPayment: IncomePayment = { month: selectedMonth, realAmount: amount, isPaid: payment?.isPaid || false, postsCompleted: payment?.postsCompleted, postsPaid: payment?.postsPaid };
    const newPayments = [...(src.payments || [])];
    const existIdx = newPayments.findIndex(p => p.month === selectedMonth);
    if (existIdx >= 0) newPayments[existIdx] = { ...newPayments[existIdx], ...newPayment }; else newPayments.push(newPayment);
    const updatedSources = [...(profile.incomeSources || [])]; updatedSources[srcIdx] = { ...src, payments: newPayments };
    onUpdateProfile({ ...profile, incomeSources: updatedSources });
  };

  const net = totalIncome - expenseData.total;
  const savingsRate = totalIncome > 0 ? (net / totalIncome) * 100 : 0;

  const STEPS = [
    { title: 'Mes', icon: 'calendar_month' },
    { title: 'Cobros', icon: 'payments' },
    { title: 'Gastos', icon: 'receipt_long' },
    { title: 'Resumen', icon: 'check_circle' },
  ];

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      <div className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-white/30 dark:border-slate-700/40 px-6 py-4">
        <div className="flex items-center gap-4 mb-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><span className="material-symbols-outlined">arrow_back</span></button>
          <div><h2 className="text-lg font-bold">Cierre Mensual</h2><p className="text-[10px] text-slate-400 font-bold uppercase">{formatMonthKey(selectedMonth)}</p></div>
        </div>
        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <button key={i} onClick={() => setStep(i)} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-all ${i === step ? 'bg-primary text-white shadow-md' : i < step ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
              {i < step && <span className="material-symbols-outlined text-[12px]">check</span>}
              <span className="material-symbols-outlined text-[14px]">{s.icon}</span>
              <span className="hidden sm:inline">{s.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-6 space-y-6 pb-24">
        {step === 0 && (
          <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
            <div className="text-center py-4">
              <span className="material-symbols-outlined text-5xl text-primary mb-3 block">calendar_month</span>
              <h3 className="text-xl font-black mb-1">¿Qué mes querés cerrar?</h3>
              <p className="text-sm text-slate-400">Seleccioná el mes para revisar ingresos y gastos</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {months.map(m => (
                <button key={m.key} onClick={() => { setSelectedMonth(m.key); setStep(1); }} className={`p-5 rounded-2xl border-2 text-left transition-all hover:shadow-md ${selectedMonth === m.key ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700'}`}>
                  <p className="font-bold text-sm">{m.label}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{transactions.filter(t => t.date.startsWith(m.key)).length} transacciones</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="text-center py-2">
              <h3 className="text-lg font-black mb-1">Marcá qué sueldos cobraste</h3>
              <p className="text-sm text-slate-400">{paidCount} de {sources.length} cobrados</p>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3 max-w-xs mx-auto">
                <div className={`h-full rounded-full transition-all ${paidCount === sources.length ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${sources.length > 0 ? (paidCount / sources.length) * 100 : 0}%` }} />
              </div>
            </div>
            {incomeData.map(d => (
              <div key={d.src.id} className={`p-5 rounded-2xl border-2 transition-all ${d.isPaid || (d.mode === 'PER_DELIVERY' && d.monthlyArs > 0) ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-700 bg-surface-light dark:bg-surface-dark'}`}>
                <div className="flex items-center gap-4">
                  {d.mode !== 'PER_DELIVERY' ? (
                    <button onClick={() => handleTogglePaid(d.src.id)} className={`size-10 rounded-full flex items-center justify-center shrink-0 transition-all ${d.isPaid ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                      <span className="material-symbols-outlined">{d.isPaid ? 'check' : 'radio_button_unchecked'}</span>
                    </button>
                  ) : (
                    <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${d.monthlyArs > 0 ? 'bg-emerald-500 text-white' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500'}`}>
                      <span className="material-symbols-outlined">{d.monthlyArs > 0 ? 'check' : 'task_alt'}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{d.src.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{d.mode === 'FIXED' ? 'Fijo' : d.mode === 'VARIABLE' ? 'Variable' : 'Por Entrega'}{d.isUSD && ' • USD'}{d.targetPosts > 0 && ` • ${d.postsCompleted}/${d.targetPosts} entregas`}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {d.mode === 'VARIABLE' ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400">{d.isUSD ? 'USD' : 'ARS'}</span>
                        <input type="number" className={`w-24 bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1 text-right text-sm font-bold outline-none ${blur}`} placeholder="0" value={d.realAmount || ''} onChange={e => handleUpdateAmount(d.src.id, parseFloat(e.target.value) || 0)} />
                      </div>
                    ) : (
                      <p className={`text-sm font-black ${blur}`}>{d.mode === 'PER_DELIVERY' ? formatMoney(d.monthlyArs) : d.isUSD ? formatUSD(d.realAmount) : formatMoney(d.realAmount)}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <button onClick={() => setStep(2)} className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2">Siguiente: Revisar Gastos <span className="material-symbols-outlined text-sm">arrow_forward</span></button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="text-center py-2">
              <h3 className="text-lg font-black mb-1">Revisá tus gastos</h3>
              <p className="text-sm text-slate-400">{expenseData.count} gastos registrados</p>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-orange-600 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
              <div className="relative z-10">
                <p className="text-xs text-white/70 font-bold uppercase">Total Gastado</p>
                <p className={`text-4xl font-black ${blur}`}>{formatMoney(expenseData.total)}</p>
                {expenseData.oneTime > 0 && (
                  <p className={`text-xs text-white/70 mt-1 flex items-center gap-1 ${blur}`}>
                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                    {formatMoney(expenseData.oneTime)} en compras únicas (no afectan promedio)
                  </p>
                )}
              </div>
            </div>
            {expenseData.count === 0 && (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2 block">edit_note</span>
                <p className="text-sm text-slate-400 mb-4">No hay gastos cargados para este mes</p>
                <button onClick={onAddTransaction} className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm">Cargar Gastos</button>
              </div>
            )}
            {expenseData.categories.length > 0 && (
              <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Por Categoría</h4>
                <div className="space-y-3">
                  {expenseData.categories.map(([cat, amount]) => {
                    const pct = expenseData.total > 0 ? (amount / expenseData.total) * 100 : 0;
                    return (
                      <div key={cat} className="flex items-center gap-3">
                        <span className="text-xs font-bold w-24 truncate text-slate-500">{cat}</span>
                        <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-red-400 rounded-full opacity-70" style={{ width: `${pct}%` }} /></div>
                        <span className={`text-xs font-bold w-20 text-right ${blur}`}>{formatMoney(amount)}</span>
                        <span className="text-[10px] text-slate-400 w-10 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {expenseData.uncategorized > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <span className="material-symbols-outlined text-amber-500">info</span>
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">Tenés {expenseData.uncategorized} gasto{expenseData.uncategorized > 1 ? 's' : ''} sin categoría</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-6 bg-slate-100 dark:bg-slate-800 text-slate-500 py-4 rounded-2xl font-bold text-sm">Atrás</button>
              <button onClick={() => setStep(3)} className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2">Ver Resumen <span className="material-symbols-outlined text-sm">arrow_forward</span></button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
            <div className="text-center py-2">
              <span className="material-symbols-outlined text-4xl text-emerald-500 mb-2 block">verified</span>
              <h3 className="text-lg font-black">Cierre de {formatMonthKey(selectedMonth)}</h3>
            </div>
            <div className={`rounded-3xl p-6 text-white shadow-xl relative overflow-hidden ${net >= 0 ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-red-600 to-orange-700'}`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
              <div className="relative z-10">
                <p className="text-xs text-white/70 font-bold uppercase mb-1">Resultado del Mes</p>
                <p className={`text-4xl font-black ${blur}`}>{net >= 0 ? '+' : ''}{formatMoney(net)}</p>
                <p className="text-sm text-white/80 mt-2">{net >= 0 ? `Ahorraste el ${savingsRate.toFixed(1)}% de tu ingreso` : `Gastaste ${formatMoney(Math.abs(net))} más de lo que ingresaste`}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800"><p className="text-[9px] text-emerald-600 font-bold uppercase">Ingresó</p><p className={`text-xl font-black text-emerald-600 ${blur}`}>{formatMoney(totalIncome)}</p><p className="text-[10px] text-emerald-500">{paidCount}/{sources.length} cobrados</p></div>
              <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-4 border border-red-200 dark:border-red-800"><p className="text-[9px] text-red-600 font-bold uppercase">Gastó</p><p className={`text-xl font-black text-red-600 ${blur}`}>{formatMoney(expenseData.total)}</p><p className="text-[10px] text-red-500">{expenseData.count} movimientos</p></div>
            </div>
            {expenseData.categories.length > 0 && (
              <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-[9px] text-slate-400 font-bold uppercase mb-3">Top Categorías</p>
                {expenseData.categories.slice(0, 3).map(([cat, amount], i) => (
                  <div key={cat} className="flex items-center justify-between py-1.5"><div className="flex items-center gap-2"><span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span><span className="text-sm font-bold">{cat}</span></div><span className={`text-sm font-black ${blur}`}>{formatMoney(amount)}</span></div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center"><p className="text-[9px] text-slate-400 font-bold uppercase">Prom/Gasto</p><p className={`text-sm font-black ${blur}`}>{expenseData.count > 0 ? formatMoney(expenseData.total / expenseData.count) : '$0'}</p></div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center"><p className="text-[9px] text-slate-400 font-bold uppercase">Por Día</p><p className={`text-sm font-black ${blur}`}>{formatMoney(expenseData.total / 30)}</p></div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center"><p className="text-[9px] text-slate-400 font-bold uppercase">Ahorro</p><p className={`text-sm font-black ${savingsRate >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{savingsRate.toFixed(1)}%</p></div>
            </div>
            <button onClick={onBack} className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2"><span className="material-symbols-outlined text-sm">check_circle</span>Volver al Dashboard</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyClose;
