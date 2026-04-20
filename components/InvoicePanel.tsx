
import React, { useState, useMemo } from 'react';
import { FinancialProfile, IncomePayment } from '../types';
import { getCurrentMonthKey, formatMonthKey, getDollarRate, formatMoney, formatUSD } from '../utils';

interface Props {
  profile: FinancialProfile;
  onUpdateProfile: (p: FinancialProfile) => void;
  onBack: () => void;
  privacyMode?: boolean;
}

const InvoicePanel: React.FC<Props> = ({ profile, onUpdateProfile, onBack, privacyMode }) => {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const dollarRate = getDollarRate(profile);
  const blur = privacyMode ? 'blur-sm' : '';

  const months = useMemo(() => {
    const result: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 4; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      result.push({ key, label: formatMonthKey(key) });
    }
    return result;
  }, []);

  const contractsWithInvoice = useMemo(
    () => (profile.incomeSources || []).filter(s => s.isActive !== false && s.requiresInvoice),
    [profile.incomeSources]
  );

  const invoiceData = useMemo(() => {
    return contractsWithInvoice.map(src => {
      const payment = src.payments?.find(p => p.month.startsWith(selectedMonth));
      const isUSD = src.currency === 'USD';
      const displayAmount = isUSD ? src.amount * dollarRate : src.amount;
      return {
        src,
        isPaid: payment?.isPaid || false,
        isInvoiceSent: payment?.isInvoiceSent || false,
        displayAmount,
        isUSD,
      };
    });
  }, [contractsWithInvoice, selectedMonth, dollarRate]);

  const sentCount = invoiceData.filter(d => d.isInvoiceSent).length;
  const total = invoiceData.length;

  const handleToggleInvoice = (sourceId: string) => {
    const srcIdx = (profile.incomeSources || []).findIndex(s => s.id === sourceId);
    if (srcIdx === -1) return;
    const src = profile.incomeSources![srcIdx];
    const payment = src.payments?.find(p => p.month.startsWith(selectedMonth));
    const newPayment: IncomePayment = {
      month: selectedMonth,
      realAmount: payment?.realAmount || src.amount || 0,
      isPaid: payment?.isPaid || false,
      isInvoiceSent: !(payment?.isInvoiceSent || false),
      postsCompleted: payment?.postsCompleted,
      postsPaid: payment?.postsPaid,
    };
    const newPayments = [...(src.payments || [])];
    const existIdx = newPayments.findIndex(p => p.month === selectedMonth);
    if (existIdx >= 0) newPayments[existIdx] = { ...newPayments[existIdx], ...newPayment };
    else newPayments.push(newPayment);
    const updatedSources = [...(profile.incomeSources || [])];
    updatedSources[srcIdx] = { ...src, payments: newPayments };
    onUpdateProfile({ ...profile, incomeSources: updatedSources });
  };

  if (contractsWithInvoice.length === 0) {
    return (
      <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
        <div className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-white/30 dark:border-slate-700/40 px-6 py-4 flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-lg font-bold">Panel de Facturas</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
          <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">description</span>
          <p className="font-bold text-slate-500">Ningún contrato requiere factura</p>
          <p className="text-sm text-slate-400 max-w-xs">Activá "Requiere factura para cobrar" en tus contratos desde Gestión de Contratos</p>
          <button onClick={onBack} className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm">Volver</button>
        </div>
      </div>
    );
  }

  const pending = invoiceData.filter(d => !d.isInvoiceSent);
  const sent = invoiceData.filter(d => d.isInvoiceSent);
  const allDone = sentCount === total;

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      <div className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-white/30 dark:border-slate-700/40 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="text-lg font-bold">Panel de Facturas</h2>
          <p className="text-xs text-slate-500">{sentCount} de {total} enviadas · {formatMonthKey(selectedMonth)}</p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto p-4 md:p-6 space-y-5 pb-24">

        {/* Month selector */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {months.map(m => (
            <button
              key={m.key}
              onClick={() => setSelectedMonth(m.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                selectedMonth === m.key
                  ? 'bg-primary text-white shadow'
                  : 'bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-700 text-slate-500'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Status hero */}
        <div className={`rounded-3xl p-6 text-white shadow-xl relative overflow-hidden ${
          allDone ? 'bg-gradient-to-br from-emerald-600 to-teal-700' :
          sentCount > 0 ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
          'bg-gradient-to-br from-slate-600 to-slate-800'
        }`}>
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10">
            <p className="text-xs text-white/70 font-bold uppercase mb-2">Estado {formatMonthKey(selectedMonth)}</p>
            <div className="flex items-end gap-3 mb-4">
              <p className="text-5xl font-black">{sentCount}<span className="text-2xl text-white/70">/{total}</span></p>
              <p className="text-white/80 pb-1 text-sm">
                {allDone ? '¡Todas las facturas enviadas!' : sentCount > 0 ? 'facturas enviadas' : 'Ninguna enviada aún'}
              </p>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-white transition-all duration-500"
                style={{ width: `${total > 0 ? (sentCount / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Pending */}
        {pending.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase text-slate-400 ml-1 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-amber-500">pending_actions</span>
              Pendientes de envío ({pending.length})
            </h3>
            {pending.map(d => (
              <div key={d.src.id} className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
                <div className="flex items-center gap-4">
                  <div className="size-11 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-amber-600">description</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{d.src.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs text-slate-500 ${blur}`}>
                        {d.isUSD ? formatUSD(d.src.amount) : formatMoney(d.displayAmount)}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${d.isPaid ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                        {d.isPaid ? '✓ Cobrado' : 'Sin cobrar'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleInvoice(d.src.id)}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0"
                  >
                    Marcar enviada
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sent */}
        {sent.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase text-slate-400 ml-1 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-emerald-500">check_circle</span>
              Enviadas ({sent.length})
            </h3>
            {sent.map(d => (
              <div key={d.src.id} className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
                <div className="flex items-center gap-4">
                  <div className="size-11 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-emerald-600">task_alt</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{d.src.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs text-slate-500 ${blur}`}>
                        {d.isUSD ? formatUSD(d.src.amount) : formatMoney(d.displayAmount)}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${d.isPaid ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'}`}>
                        {d.isPaid ? '✓ Cobrado' : 'Esperando pago'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleInvoice(d.src.id)}
                    className="text-xs text-slate-400 hover:text-red-500 font-bold px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                  >
                    Deshacer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* History heatmap */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">history</span>
            Historial de facturas
          </h3>
          <div className="space-y-3">
            {months.map(m => {
              const mData = contractsWithInvoice.map(src => {
                const payment = src.payments?.find(p => p.month.startsWith(m.key));
                return {
                  name: src.name,
                  isInvoiceSent: payment?.isInvoiceSent || false,
                  isPaid: payment?.isPaid || false,
                };
              });
              const mSent = mData.filter(d => d.isInvoiceSent).length;
              const isCurrent = m.key === selectedMonth;
              return (
                <button
                  key={m.key}
                  onClick={() => setSelectedMonth(m.key)}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors ${isCurrent ? 'bg-primary/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                  <span className={`text-xs font-bold w-24 text-left truncate capitalize ${isCurrent ? 'text-primary' : 'text-slate-400'}`}>
                    {m.label}
                  </span>
                  <div className="flex-1 flex gap-1">
                    {mData.map((d, i) => (
                      <div
                        key={i}
                        title={d.name}
                        className={`flex-1 h-5 rounded ${
                          d.isInvoiceSent
                            ? d.isPaid ? 'bg-emerald-500' : 'bg-blue-400'
                            : isCurrent ? 'bg-amber-400' : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 w-8 text-right">{mSent}/{contractsWithInvoice.length}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-[9px] text-slate-400"><div className="w-3 h-3 rounded bg-emerald-500" /> Enviada y cobrada</div>
            <div className="flex items-center gap-1.5 text-[9px] text-slate-400"><div className="w-3 h-3 rounded bg-blue-400" /> Enviada, sin cobrar</div>
            <div className="flex items-center gap-1.5 text-[9px] text-slate-400"><div className="w-3 h-3 rounded bg-amber-400" /> Pendiente</div>
            <div className="flex items-center gap-1.5 text-[9px] text-slate-400"><div className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-700" /> Sin datos</div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default InvoicePanel;
