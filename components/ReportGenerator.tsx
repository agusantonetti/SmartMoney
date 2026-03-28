
import React, { useState, useMemo } from 'react';
import { FinancialProfile, Transaction } from '../types';
import { formatMoney, formatMoneyUSD, getDollarRate, getCurrentMonthKey, getPrevMonthKey, formatMonthKey, getSalaryForMonth, getCategoryIcon } from '../utils';

interface Props {
  profile: FinancialProfile;
  transactions: Transaction[];
  balance: number;
  onBack: () => void;
}

const ReportGenerator: React.FC<Props> = ({ profile, transactions, balance, onBack }) => {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [generating, setGenerating] = useState(false);
  const dollarRate = getDollarRate(profile);

  // Calcular datos del mes seleccionado
  const reportData = useMemo(() => {
    const monthTxs = transactions.filter(t => t.date.startsWith(selectedMonth));
    const prevMonth = getPrevMonthKey(selectedMonth);

    // Ingresos (sueldos)
    const totalIncome = getSalaryForMonth(profile, selectedMonth, dollarRate);
    const prevIncome = getSalaryForMonth(profile, prevMonth, dollarRate);

    // Fuentes de ingreso
    const sources = (profile.incomeSources || []).filter(s => s.isActive !== false).map(src => {
      let val = src.amount;
      if (src.frequency === 'BIWEEKLY') val *= 2;
      if (src.frequency === 'ONE_TIME') val = 0;
      if (src.isCreatorSource) {
        val = (src.payments?.filter(p => p.month.startsWith(selectedMonth)) || []).reduce((a, p) => a + p.realAmount, 0);
      }
      const arsVal = src.currency === 'USD' ? val * dollarRate : val;
      return { name: src.name, amount: val, arsAmount: arsVal, currency: src.currency || 'ARS' };
    }).filter(s => s.amount > 0).sort((a, b) => b.arsAmount - a.arsAmount);

    // Gastos
    const expenses = monthTxs.filter(t => t.type === 'expense');
    const totalExpense = expenses.reduce((a, t) => a + t.amount, 0);
    const prevExpense = transactions.filter(t => t.type === 'expense' && t.date.startsWith(prevMonth)).reduce((a, t) => a + t.amount, 0);

    // Por categoría
    const byCat: Record<string, number> = {};
    expenses.forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
    const categories = Object.entries(byCat)
      .map(([name, amount]) => ({ name, amount, pct: totalExpense > 0 ? (amount / totalExpense) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);

    // Ahorro
    const saving = totalIncome - totalExpense;
    const savingRate = totalIncome > 0 ? (saving / totalIncome) * 100 : 0;

    // Top 5 gastos individuales
    const topExpenses = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5);

    const txCount = expenses.length;

    return {
      totalIncome, prevIncome, sources,
      totalExpense, prevExpense, categories,
      saving, savingRate, topExpenses, txCount,
    };
  }, [transactions, profile, selectedMonth, dollarRate]);

  // Generar meses disponibles (últimos 12)
  const availableMonths = useMemo(() => {
    const months: { key: string, label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key, label: formatMonthKey(key) });
    }
    return months;
  }, []);

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'mm', 'a4');
      const w = 210;
      const margin = 20;
      const contentW = w - margin * 2;
      let y = 20;

      const addText = (text: string, x: number, yPos: number, size: number, style: string = 'normal', color: number[] = [30, 30, 30]) => {
        doc.setFontSize(size);
        doc.setFont('helvetica', style);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(text, x, yPos);
      };

      const addLine = (yPos: number) => {
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.3);
        doc.line(margin, yPos, w - margin, yPos);
      };

      const fmtMoney = (n: number) => `$ ${Math.round(n).toLocaleString('es-AR')}`;
      const fmtPct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
      const calcPct = (c: number, p: number) => p === 0 ? (c === 0 ? 0 : 100) : ((c - p) / p) * 100;

      // === HEADER ===
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, w, 45, 'F');
      addText('SmartMoney', margin, 18, 22, 'bold', [255, 255, 255]);
      addText('Reporte Financiero Mensual', margin, 28, 11, 'normal', [148, 163, 184]);
      addText(formatMonthKey(selectedMonth), margin, 38, 14, 'bold', [96, 165, 250]);

      y = 55;

      // === RESUMEN EJECUTIVO ===
      addText('RESUMEN', margin, y, 10, 'bold', [100, 116, 139]);
      y += 8;

      // 3 boxes
      const boxW = (contentW - 10) / 3;

      // Income box
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(margin, y, boxW, 22, 2, 2, 'F');
      addText('Ingreso', margin + 4, y + 8, 8, 'normal', [100, 116, 139]);
      addText(fmtMoney(reportData.totalIncome), margin + 4, y + 17, 11, 'bold', [22, 101, 52]);

      // Expense box
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(margin + boxW + 5, y, boxW, 22, 2, 2, 'F');
      addText('Gasto', margin + boxW + 9, y + 8, 8, 'normal', [100, 116, 139]);
      addText(fmtMoney(reportData.totalExpense), margin + boxW + 9, y + 17, 11, 'bold', [153, 27, 27]);

      // Saving box
      const savingColor = reportData.saving >= 0 ? [240, 253, 244] : [254, 242, 242];
      const savingTextColor = reportData.saving >= 0 ? [22, 101, 52] : [153, 27, 27];
      doc.setFillColor(savingColor[0], savingColor[1], savingColor[2]);
      doc.roundedRect(margin + (boxW + 5) * 2, y, boxW, 22, 2, 2, 'F');
      addText('Ahorro', margin + (boxW + 5) * 2 + 4, y + 8, 8, 'normal', [100, 116, 139]);
      addText(fmtMoney(reportData.saving), margin + (boxW + 5) * 2 + 4, y + 17, 11, 'bold', savingTextColor);

      y += 30;

      // Saving rate
      if (reportData.totalIncome > 0) {
        addText(`Tasa de ahorro: ${reportData.savingRate.toFixed(1)}% del ingreso`, margin, y, 9, 'normal', [100, 116, 139]);
        y += 5;
        addText(`Transacciones registradas: ${reportData.txCount}`, margin, y, 9, 'normal', [100, 116, 139]);
        y += 5;
        addText(`Patrimonio actual: ${fmtMoney(balance)} (${formatMoneyUSD(balance / dollarRate)})`, margin, y, 9, 'normal', [100, 116, 139]);
      }

      y += 12;
      addLine(y);
      y += 8;

      // === FUENTES DE INGRESO ===
      addText('FUENTES DE INGRESO', margin, y, 10, 'bold', [100, 116, 139]);
      y += 8;

      reportData.sources.forEach(src => {
        addText(src.name, margin + 2, y, 9, 'normal', [51, 65, 85]);
        const amountText = src.currency === 'USD'
          ? `US$ ${src.amount.toLocaleString()} (${fmtMoney(src.arsAmount)})`
          : fmtMoney(src.arsAmount);
        addText(amountText, w - margin, y, 9, 'bold', [30, 30, 30]);
        doc.text(amountText, w - margin, y, { align: 'right' });
        // Fix: rewrite right-aligned
        const tw = doc.getTextWidth(amountText);
        doc.setFillColor(255, 255, 255);
        doc.rect(margin + 100, y - 4, contentW - 100, 6, 'F');
        addText(amountText, w - margin - tw, y, 9, 'bold', [30, 30, 30]);
        y += 6;
      });

      y += 6;
      addLine(y);
      y += 8;

      // === GASTOS POR CATEGORÍA ===
      addText('GASTOS POR CATEGORÍA', margin, y, 10, 'bold', [100, 116, 139]);
      y += 3;

      // Table header
      y += 6;
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 4, contentW, 7, 'F');
      addText('Categoría', margin + 2, y, 8, 'bold', [100, 116, 139]);
      addText('Monto', margin + 100, y, 8, 'bold', [100, 116, 139]);
      addText('%', margin + 145, y, 8, 'bold', [100, 116, 139]);
      y += 8;

      reportData.categories.forEach(cat => {
        if (y > 265) {
          doc.addPage();
          y = 20;
        }
        addText(cat.name, margin + 2, y, 9, 'normal', [51, 65, 85]);
        addText(fmtMoney(cat.amount), margin + 100, y, 9, 'bold', [30, 30, 30]);
        addText(`${cat.pct.toFixed(1)}%`, margin + 145, y, 9, 'normal', [100, 116, 139]);

        // Mini bar
        const barW = Math.min(cat.pct * 0.2, 20);
        doc.setFillColor(96, 165, 250);
        doc.roundedRect(margin + 155, y - 3, barW, 3, 1, 1, 'F');

        y += 7;
      });

      y += 6;

      if (y > 230) { doc.addPage(); y = 20; }

      addLine(y);
      y += 8;

      // === TOP 5 GASTOS ===
      addText('TOP 5 GASTOS MÁS GRANDES', margin, y, 10, 'bold', [100, 116, 139]);
      y += 8;

      reportData.topExpenses.forEach((tx, i) => {
        addText(`${i + 1}. ${tx.description}`, margin + 2, y, 9, 'normal', [51, 65, 85]);
        addText(fmtMoney(tx.amount), margin + 130, y, 9, 'bold', [30, 30, 30]);
        addText(tx.category, margin + 155, y, 7, 'normal', [148, 163, 184]);
        y += 7;
      });

      y += 8;

      // === VS MES ANTERIOR ===
      if (y > 240) { doc.addPage(); y = 20; }
      addLine(y);
      y += 8;
      addText('COMPARACIÓN VS MES ANTERIOR', margin, y, 10, 'bold', [100, 116, 139]);
      y += 8;

      const incomePct = calcPct(reportData.totalIncome, reportData.prevIncome);
      const expensePct = calcPct(reportData.totalExpense, reportData.prevExpense);
      addText(`Ingresos: ${fmtPct(incomePct)}`, margin + 2, y, 9, 'normal', incomePct >= 0 ? [22, 101, 52] : [153, 27, 27]);
      y += 6;
      addText(`Gastos: ${fmtPct(expensePct)}`, margin + 2, y, 9, 'normal', expensePct <= 0 ? [22, 101, 52] : [153, 27, 27]);

      // === FOOTER ===
      y += 15;
      addLine(y);
      y += 6;
      addText(`Generado por SmartMoney · ${new Date().toLocaleDateString('es-AR')}`, margin, y, 7, 'normal', [180, 180, 180]);

      // Download
      doc.save(`SmartMoney_${formatMonthKey(selectedMonth).replace(/ /g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
    setGenerating(false);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      <div className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-white/30 dark:border-slate-700/40 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold">Reporte Mensual</h2>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto p-6 space-y-5 pb-24">

        {/* SELECTOR DE MES */}
        <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-3">Seleccioná el mes</h3>
          <div className="grid grid-cols-3 gap-2">
            {availableMonths.slice(0, 6).map(m => (
              <button
                key={m.key}
                onClick={() => setSelectedMonth(m.key)}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  selectedMonth === m.key
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <button 
            onClick={() => {
              const el = document.getElementById('more-months');
              if (el) el.classList.toggle('hidden');
            }}
            className="text-[10px] text-primary font-bold mt-2 w-full text-center"
          >
            Ver más meses
          </button>
          <div id="more-months" className="hidden grid grid-cols-3 gap-2 mt-2">
            {availableMonths.slice(6).map(m => (
              <button
                key={m.key}
                onClick={() => setSelectedMonth(m.key)}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  selectedMonth === m.key
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* PREVIEW DEL REPORTE */}
        <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-4 space-y-4">
          <h3 className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">preview</span>
            Vista previa — {formatMonthKey(selectedMonth)}
          </h3>

          {/* Summary row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Ingreso</p>
              <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">{formatMoney(reportData.totalIncome)}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase">Gasto</p>
              <p className="text-sm font-black text-red-700 dark:text-red-300">{formatMoney(reportData.totalExpense)}</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${reportData.saving >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              <p className={`text-[10px] font-bold uppercase ${reportData.saving >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>Ahorro</p>
              <p className={`text-sm font-black ${reportData.saving >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300'}`}>{formatMoney(reportData.saving)}</p>
            </div>
          </div>

          {/* Categories preview */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Categorías ({reportData.categories.length})</p>
            {reportData.categories.slice(0, 4).map(cat => (
              <div key={cat.name} className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-300">{cat.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">{cat.pct.toFixed(0)}%</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{formatMoney(cat.amount)}</span>
                </div>
              </div>
            ))}
            {reportData.categories.length > 4 && (
              <p className="text-[10px] text-slate-400 text-center">+ {reportData.categories.length - 4} categorías más en el PDF</p>
            )}
          </div>

          {/* Info */}
          <div className="text-[10px] text-slate-400 space-y-0.5">
            <p>{reportData.txCount} transacciones · {reportData.sources.length} fuentes de ingreso</p>
            <p>Tasa de ahorro: {reportData.savingRate.toFixed(1)}%</p>
          </div>
        </div>

        {/* EL PDF INCLUYE */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">El PDF incluye</h3>
          <div className="grid grid-cols-2 gap-2">
            {['Resumen ejecutivo', 'Fuentes de ingreso', 'Gastos por categoría', 'Porcentajes y barras', 'Top 5 gastos', 'Comparación vs anterior'].map(item => (
              <div key={item} className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-emerald-500 text-[14px]">check_circle</span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* BOTÓN DESCARGAR */}
        <button
          onClick={generatePDF}
          disabled={generating}
          className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-blue-600 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
        >
          {generating ? (
            <>
              <span className="material-symbols-outlined animate-spin">refresh</span>
              Generando PDF...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">picture_as_pdf</span>
              Descargar PDF — {formatMonthKey(selectedMonth)}
            </>
          )}
        </button>

      </div>
    </div>
  );
};

export default ReportGenerator;
