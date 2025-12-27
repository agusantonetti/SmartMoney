
import React, { useMemo, useState } from 'react';
import { Transaction, FinancialProfile } from '../types';

interface Props {
  transactions: Transaction[];
  profile: FinancialProfile;
  onBack: () => void;
}

const AnalyticsCenter: React.FC<Props> = ({ transactions, profile, onBack }) => {
  const [timeRange, setTimeRange] = useState<'ALL' | 'MONTH' | 'YEAR'>('ALL');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'FLOW'>('OVERVIEW');

  // --- LOGIC: CATEGORY BREAKDOWN (DONUT CHART) ---
  const categoryData = useMemo(() => {
    // Filtro por tiempo si es necesario
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    let filteredTransactions = transactions;
    if (timeRange === 'MONTH') {
        filteredTransactions = transactions.filter(t => t.date.startsWith(currentMonthKey));
    }

    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    const totalsByCategory: Record<string, number> = {};
    let totalExpense = 0;

    expenses.forEach(t => {
      totalsByCategory[t.category] = (totalsByCategory[t.category] || 0) + t.amount;
      totalExpense += t.amount;
    });

    const data = Object.keys(totalsByCategory).map(cat => ({
      name: cat,
      value: totalsByCategory[cat],
      percentage: totalExpense > 0 ? (totalsByCategory[cat] / totalExpense) * 100 : 0,
      color: getColorForCategory(cat)
    })).sort((a, b) => b.value - a.value); // Sort highest first

    return { data, totalExpense };
  }, [transactions, timeRange]);

  // --- LOGIC: FLOW CHART (SANKEY-LIKE) ---
  const flowData = useMemo(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Filtrar transacciones según el rango de tiempo seleccionado
    let relevantTxs = transactions;
    if (timeRange === 'MONTH') {
      relevantTxs = transactions.filter(t => t.date.startsWith(currentMonthKey));
    }

    // 1. Fuentes de Ingreso (Izquierda)
    const incomes = relevantTxs.filter(t => t.type === 'income');
    const incomeGroups: Record<string, number> = {};
    
    incomes.forEach(t => {
       // Agrupar por descripción simplificada o categoría si es 'Otros'
       // Para hacerlo más limpio en el gráfico:
       const key = t.category === 'Ingreso' ? (t.description.split(' ')[0]) : t.category;
       incomeGroups[key] = (incomeGroups[key] || 0) + t.amount;
    });

    const incomeNodes = Object.keys(incomeGroups).map(k => ({
        name: k,
        amount: incomeGroups[k],
        color: '#10b981' // emerald
    })).sort((a,b) => b.amount - a.amount);

    const totalIncome = incomeNodes.reduce((acc, n) => acc + n.amount, 0);

    // 2. Destinos de Gasto (Derecha)
    const expenses = relevantTxs.filter(t => t.type === 'expense');
    const expenseGroups: Record<string, number> = {};
    
    expenses.forEach(t => {
        expenseGroups[t.category] = (expenseGroups[t.category] || 0) + t.amount;
    });

    const expenseNodes = Object.keys(expenseGroups).map(k => ({
        name: k,
        amount: expenseGroups[k],
        color: getColorForCategory(k)
    })).sort((a,b) => b.amount - a.amount);

    const totalExpense = expenseNodes.reduce((acc, n) => acc + n.amount, 0);

    // 3. Resultado (Superávit o Déficit)
    const balance = totalIncome - totalExpense;
    const surplusNode = balance > 0 ? { name: 'Ahorro / Libre', amount: balance, color: '#3b82f6' } : null;
    
    // Si hay déficit, lo mostramos en el lado izquierdo como "Fuente: Ahorros/Deuda" para balancear
    const deficitNode = balance < 0 ? { name: 'Déficit (Ahorros)', amount: Math.abs(balance), color: '#ef4444' } : null;

    // Normalizar alturas para el SVG
    const maxFlow = Math.max(totalIncome + (deficitNode?.amount || 0), totalExpense + (surplusNode?.amount || 0));

    return { 
        incomeNodes, 
        expenseNodes, 
        surplusNode, 
        deficitNode, 
        totalIncome, 
        totalExpense,
        maxFlow 
    };
  }, [transactions, timeRange]);


  // --- LOGIC: MONTHLY HISTORY (BAR CHART) ---
  const historyData = useMemo(() => {
    const monthsMap: Record<string, { income: number; expense: number }> = {};
    
    // Generar últimos 6 meses
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsMap[key] = { income: 0, expense: 0 };
    }

    transactions.forEach(t => {
      const key = t.date.substring(0, 7); // YYYY-MM
      if (monthsMap[key]) {
        if (t.type === 'income') monthsMap[key].income += t.amount;
        else monthsMap[key].expense += t.amount;
      }
    });

    return Object.keys(monthsMap).map(key => {
      const [year, month] = key.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      const label = date.toLocaleDateString('es-ES', { month: 'short' });
      return {
        label,
        income: monthsMap[key].income,
        expense: monthsMap[key].expense
      };
    });
  }, [transactions]);

  // --- LOGIC: HEATMAP ---
  const heatmapData = useMemo(() => {
    const dailyTotals: Record<string, number> = {};
    let maxDaily = 0;
    
    transactions.filter(t => t.type === 'expense').forEach(t => {
        dailyTotals[t.date] = (dailyTotals[t.date] || 0) + t.amount;
        if (dailyTotals[t.date] > maxDaily) maxDaily = dailyTotals[t.date];
    });

    const days = [];
    const today = new Date();
    const totalDaysToShow = 14 * 7; 
    
    for (let i = totalDaysToShow - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const isoDate = d.toISOString().split('T')[0];
        const amount = dailyTotals[isoDate] || 0;
        let intensity = 0;
        if (amount > 0) {
            if (maxDaily === 0) intensity = 1;
            else {
                const ratio = amount / maxDaily;
                if (ratio > 0.75) intensity = 4;
                else if (ratio > 0.50) intensity = 3;
                else if (ratio > 0.25) intensity = 2;
                else intensity = 1;
            }
        }
        days.push({ date: d, isoDate, amount, intensity });
    }
    return { days, maxDaily };
  }, [transactions]);

  const maxBarValue = Math.max(
    ...historyData.map(d => Math.max(d.income, d.expense)),
    100
  );

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { 
      style: 'currency', 
      currency: 'MXN',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-lg font-bold">Analíticas</h2>
        </div>
        
        {/* Time Filter */}
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-1 flex text-xs font-bold">
          <button 
            onClick={() => setTimeRange('MONTH')} 
            className={`px-3 py-1.5 rounded-md transition-all ${timeRange === 'MONTH' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-500'}`}
          >
            Mes
          </button>
          <button 
            onClick={() => setTimeRange('ALL')} 
            className={`px-3 py-1.5 rounded-md transition-all ${timeRange === 'ALL' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-500'}`}
          >
            Todo
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="w-full max-w-4xl mx-auto px-6 pt-6">
        <div className="flex bg-surface-light dark:bg-surface-dark p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button 
                onClick={() => setActiveTab('OVERVIEW')}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'OVERVIEW' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
            >
                <span className="material-symbols-outlined">pie_chart</span>
                Resumen
            </button>
            <button 
                onClick={() => setActiveTab('FLOW')}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'FLOW' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
            >
                <span className="material-symbols-outlined">hub</span>
                Flujo de Dinero
            </button>
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl mx-auto p-6 space-y-8 pb-24">
        
        {/* === FLOW CHART TAB === */}
        {activeTab === 'FLOW' && (
            <div className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-[fadeIn_0.3s_ease-out]">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-500">account_tree</span>
                    Diagrama de Flujo
                </h3>
                <p className="text-xs text-slate-500 mb-6">Visualiza cómo tus ingresos se transforman en gastos y ahorros.</p>

                {flowData.maxFlow === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <span className="material-symbols-outlined text-4xl mb-2">data_loss_prevention</span>
                        <p>No hay datos suficientes en este periodo.</p>
                    </div>
                ) : (
                    <div className="w-full aspect-[16/10] min-h-[400px]">
                        <svg viewBox="0 0 800 500" className="w-full h-full">
                            <defs>
                                <linearGradient id="flowGradientLeft" x1="0" x2="1" y1="0" y2="0">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
                                </linearGradient>
                                <linearGradient id="flowGradientRight" x1="0" x2="1" y1="0" y2="0">
                                    <stop offset="0%" stopColor="#64748b" stopOpacity="0.1" />
                                    <stop offset="100%" stopColor="#64748b" stopOpacity="0.4" />
                                </linearGradient>
                            </defs>

                            {/* LOGIC FOR DRAWING FLOWS */}
                            {(() => {
                                const HEIGHT = 500;
                                const WIDTH = 800;
                                const PADDING_Y = 20;
                                const USABLE_HEIGHT = HEIGHT - (PADDING_Y * 2);
                                const NODE_WIDTH = 120;
                                const CENTER_X = WIDTH / 2;
                                const GAP = 10;
                                
                                // Scale factor
                                const scale = USABLE_HEIGHT / flowData.maxFlow;

                                // --- LEFT SIDE (SOURCES) ---
                                let currentY = PADDING_Y;
                                const leftElements: React.ReactElement[] = [];
                                const leftConnectors: React.ReactElement[] = [];

                                // 1. Deficit Node (if any) - top priority visually
                                if (flowData.deficitNode) {
                                    const h = flowData.deficitNode.amount * scale;
                                    leftElements.push(
                                        <g key="deficit">
                                            <rect x="0" y={currentY} width={NODE_WIDTH} height={h} rx="4" fill={flowData.deficitNode.color} opacity="0.8" />
                                            <text x="10" y={currentY + h/2 + 5} fontSize="12" fill="white" fontWeight="bold">Déficit</text>
                                            <text x="10" y={currentY + h/2 + 20} fontSize="10" fill="white" opacity="0.8">{formatMoney(flowData.deficitNode.amount)}</text>
                                        </g>
                                    );
                                    // Path to center
                                    const path = `M ${NODE_WIDTH} ${currentY + h/2} C ${CENTER_X/2} ${currentY + h/2}, ${CENTER_X/2} ${HEIGHT/2}, ${CENTER_X} ${HEIGHT/2}`;
                                    leftConnectors.push(<path key="path-deficit" d={path} fill="none" stroke={flowData.deficitNode.color} strokeWidth={h} opacity="0.2" />);
                                    currentY += h + GAP;
                                }

                                // 2. Income Nodes
                                flowData.incomeNodes.forEach(node => {
                                    const h = Math.max(2, node.amount * scale); // min height 2px
                                    leftElements.push(
                                        <g key={node.name}>
                                            <rect x="0" y={currentY} width={NODE_WIDTH} height={h} rx="4" fill={node.color} />
                                            <text x="10" y={currentY + Math.min(h/2 + 5, h-5)} fontSize="12" fill="white" fontWeight="bold" className="truncate">{node.name.substring(0, 15)}</text>
                                            {h > 20 && <text x="10" y={currentY + h/2 + 20} fontSize="10" fill="white" opacity="0.8">{formatMoney(node.amount)}</text>}
                                        </g>
                                    );
                                    
                                    // Path to Center (Merged Flow)
                                    // We connect from the middle of this node to the vertical center of the chart (as a funnel)
                                    // A nicer visualization is Source -> Center Bar -> Destination
                                    // Let's assume a "Center of Gravity" at HEIGHT/2 for the wallet.
                                    const startY = currentY + h/2;
                                    const endY = HEIGHT / 2; // Funnel everything to center
                                    
                                    // Bezier Curve
                                    const controlX1 = NODE_WIDTH + 100;
                                    const controlX2 = CENTER_X - 100;
                                    
                                    // We need to distribute the "Center" height to match. 
                                    // Actually, let's draw paths from specific Left block to specific Right block "stacked". 
                                    // But since money is fungible, we just draw visual connectors to a conceptual "Pool".
                                    
                                    const path = `M ${NODE_WIDTH} ${startY} C ${controlX1} ${startY}, ${controlX2} ${endY}, ${CENTER_X} ${endY}`;
                                    leftConnectors.push(
                                        <path key={`path-${node.name}`} d={path} fill="none" stroke={node.color} strokeWidth={h} opacity="0.2" />
                                    );

                                    currentY += h + GAP;
                                });

                                // --- RIGHT SIDE (USES) ---
                                let rightY = PADDING_Y;
                                const rightElements: React.ReactElement[] = [];
                                const rightConnectors: React.ReactElement[] = [];

                                // 1. Expenses
                                flowData.expenseNodes.forEach(node => {
                                    const h = Math.max(2, node.amount * scale);
                                    rightElements.push(
                                        <g key={node.name}>
                                            <rect x={WIDTH - NODE_WIDTH} y={rightY} width={NODE_WIDTH} height={h} rx="4" fill={node.color} />
                                            <text x={WIDTH - NODE_WIDTH + 10} y={rightY + Math.min(h/2 + 5, h-5)} fontSize="12" fill="white" fontWeight="bold" className="truncate">{node.name.substring(0, 15)}</text>
                                            {h > 20 && <text x={WIDTH - NODE_WIDTH + 10} y={rightY + h/2 + 20} fontSize="10" fill="white" opacity="0.8">{formatMoney(node.amount)}</text>}
                                        </g>
                                    );

                                    // Path from Center
                                    const startY = HEIGHT / 2; 
                                    const endY = rightY + h/2;
                                    const controlX1 = CENTER_X + 100;
                                    const controlX2 = (WIDTH - NODE_WIDTH) - 100;
                                    
                                    const path = `M ${CENTER_X} ${startY} C ${controlX1} ${startY}, ${controlX2} ${endY}, ${WIDTH - NODE_WIDTH} ${endY}`;
                                    rightConnectors.push(
                                        <path key={`path-${node.name}`} d={path} fill="none" stroke={node.color} strokeWidth={h} opacity="0.2" />
                                    );

                                    rightY += h + GAP;
                                });

                                // 2. Surplus (Savings)
                                if (flowData.surplusNode) {
                                    const h = flowData.surplusNode.amount * scale;
                                    rightElements.push(
                                        <g key="surplus">
                                            <rect x={WIDTH - NODE_WIDTH} y={rightY} width={NODE_WIDTH} height={h} rx="4" fill={flowData.surplusNode.color} opacity="0.9" />
                                            <text x={WIDTH - NODE_WIDTH + 10} y={rightY + h/2 + 5} fontSize="12" fill="white" fontWeight="bold">Ahorro / Libre</text>
                                            <text x={WIDTH - NODE_WIDTH + 10} y={rightY + h/2 + 20} fontSize="10" fill="white" opacity="0.8">{formatMoney(flowData.surplusNode.amount)}</text>
                                        </g>
                                    );
                                     const startY = HEIGHT / 2; 
                                    const endY = rightY + h/2;
                                    const controlX1 = CENTER_X + 100;
                                    const controlX2 = (WIDTH - NODE_WIDTH) - 100;
                                    const path = `M ${CENTER_X} ${startY} C ${controlX1} ${startY}, ${controlX2} ${endY}, ${WIDTH - NODE_WIDTH} ${endY}`;
                                    rightConnectors.push(
                                        <path key="path-surplus" d={path} fill="none" stroke={flowData.surplusNode.color} strokeWidth={h} opacity="0.2" />
                                    );
                                }

                                // --- CENTER PILLAR (THE WALLET) ---
                                // Just a visual anchor
                                const centerHeight = 200; // Arbitrary visual anchor height
                                const centerElement = (
                                    <g key="center">
                                        <rect x={CENTER_X - 5} y={HEIGHT/2 - centerHeight/2} width={10} height={centerHeight} rx="5" fill="#94a3b8" opacity="0.3" />
                                    </g>
                                );

                                return [
                                    ...leftConnectors,
                                    ...rightConnectors,
                                    centerElement,
                                    ...leftElements,
                                    ...rightElements
                                ];
                            })()}
                        </svg>
                    </div>
                )}
            </div>
        )}

        {/* === OVERVIEW TAB (Original Content) === */}
        {activeTab === 'OVERVIEW' && (
            <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
                {/* CHART: EXPENSE BREAKDOWN (DONUT) */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-500">pie_chart</span>
                    Distribución de Gastos
                </h3>
                
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="relative size-48 shrink-0">
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xs text-slate-400 font-bold uppercase">Total</span>
                            <span className="text-xl font-black text-slate-900 dark:text-white">{formatMoney(categoryData.totalExpense)}</span>
                        </div>
                        
                        <svg viewBox="0 0 100 100" className="rotate-[-90deg]">
                            {categoryData.data.length === 0 ? (
                            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e2e8f0" strokeWidth="20" />
                            ) : null}
                        </svg>
                        
                        <div 
                            className="absolute inset-0 rounded-full"
                            style={{
                            background: categoryData.data.length > 0 
                                ? `conic-gradient(${generateConicGradientString(categoryData.data)})`
                                : '#e2e8f0',
                            maskImage: 'radial-gradient(transparent 55%, black 56%)',
                            WebkitMaskImage: 'radial-gradient(transparent 55%, black 56%)'
                            }}
                        ></div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 w-full">
                        {categoryData.data.map((cat) => (
                            <div key={cat.name} className="flex items-center justify-between group">
                            <div className="flex items-center gap-2">
                                <div className="size-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{cat.name}</span>
                            </div>
                            <div className="text-right">
                                <span className="block text-sm font-bold text-slate-900 dark:text-white">{formatMoney(cat.value)}</span>
                                <span className="block text-[10px] text-slate-400">{cat.percentage.toFixed(1)}%</span>
                            </div>
                            </div>
                        ))}
                        {categoryData.data.length === 0 && (
                            <p className="text-slate-400 italic text-sm col-span-2">No hay gastos registrados aún.</p>
                        )}
                    </div>
                </div>
                </div>

                {/* CHART: EXPENSE HEATMAP */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-orange-500">calendar_month</span>
                    Intensidad de Gastos
                    </h3>
                    <p className="text-xs text-slate-500 mb-6">Mapa de calor de tus gastos diarios (últimos 3 meses).</p>

                    <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
                    {/* GitHub Style Grid: 7 rows (days), auto columns (weeks) */}
                    <div 
                        className="grid grid-rows-7 grid-flow-col gap-1 w-max"
                        style={{ gridTemplateRows: 'repeat(7, 1fr)' }}
                    >
                        {/* Generate cells */}
                        {heatmapData.days.map((day) => {
                            let bgClass = 'bg-slate-100 dark:bg-slate-800';
                            if (day.intensity === 1) bgClass = 'bg-emerald-200 dark:bg-emerald-900/40';
                            if (day.intensity === 2) bgClass = 'bg-emerald-300 dark:bg-emerald-800/60';
                            if (day.intensity === 3) bgClass = 'bg-emerald-400 dark:bg-emerald-600';
                            if (day.intensity === 4) bgClass = 'bg-emerald-600 dark:bg-emerald-500';

                            return (
                                <div 
                                key={day.isoDate}
                                className={`size-3 sm:size-4 rounded-sm ${bgClass} relative group`}
                                title={`${day.isoDate}: ${formatMoney(day.amount)}`}
                                >
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                    <span className="font-bold block">{day.isoDate}</span>
                                    {day.amount > 0 ? formatMoney(day.amount) : 'Sin gastos'}
                                </div>
                                </div>
                            );
                        })}
                    </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 justify-end">
                    <span>Menos</span>
                    <div className="size-3 bg-slate-100 dark:bg-slate-800 rounded-sm"></div>
                    <div className="size-3 bg-emerald-200 dark:bg-emerald-900/40 rounded-sm"></div>
                    <div className="size-3 bg-emerald-400 dark:bg-emerald-600 rounded-sm"></div>
                    <div className="size-3 bg-emerald-600 dark:bg-emerald-500 rounded-sm"></div>
                    <span>Más</span>
                    </div>
                </div>

                {/* CHART: INCOME VS EXPENSE (BAR CHART) */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-500">bar_chart</span>
                    Flujo de Caja (6 Meses)
                </h3>

                <div className="h-64 flex items-end justify-between gap-2 sm:gap-4">
                    {historyData.map((data, idx) => (
                        <div key={idx} className="flex-1 flex flex-col justify-end items-center gap-2 group h-full">
                            <div className="w-full flex justify-center gap-1 items-end h-full relative">
                            {/* Tooltip on hover */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap">
                                <div className="text-emerald-400">Ing: {formatMoney(data.income)}</div>
                                <div className="text-red-400">Gas: {formatMoney(data.expense)}</div>
                            </div>
                            
                            {/* Bars */}
                            <div 
                                className="w-3 sm:w-6 bg-emerald-400 rounded-t-sm transition-all duration-500 hover:bg-emerald-300"
                                style={{ height: `${(data.income / maxBarValue) * 100}%`, minHeight: data.income > 0 ? '4px' : '0' }}
                            ></div>
                            <div 
                                className="w-3 sm:w-6 bg-red-400 rounded-t-sm transition-all duration-500 hover:bg-red-300"
                                style={{ height: `${(data.expense / maxBarValue) * 100}%`, minHeight: data.expense > 0 ? '4px' : '0' }}
                            ></div>
                            </div>
                            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase">{data.label}</span>
                        </div>
                    ))}
                </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

// Helper for Colors
function getColorForCategory(category: string): string {
   const normalized = category.toLowerCase();
   if (normalized.includes('comida') || normalized.includes('restaurante')) return '#fbbf24'; // Amber
   if (normalized.includes('hogar') || normalized.includes('renta')) return '#818cf8'; // Indigo
   if (normalized.includes('transporte') || normalized.includes('uber') || normalized.includes('gasolina')) return '#34d399'; // Emerald
   if (normalized.includes('entretenimiento') || normalized.includes('cine')) return '#f472b6'; // Pink
   if (normalized.includes('salud') || normalized.includes('medico')) return '#f87171'; // Red
   if (normalized.includes('servicios') || normalized.includes('internet')) return '#60a5fa'; // Blue
   return '#94a3b8'; // Slate (Default)
}

// Helper for Conic Gradient
function generateConicGradientString(data: { percentage: number; color: string }[]) {
   let gradientString = '';
   let currentAngle = 0;
   
   data.forEach((item, index) => {
      const endAngle = currentAngle + item.percentage;
      gradientString += `${item.color} ${currentAngle}% ${endAngle}%`;
      if (index < data.length - 1) gradientString += ', ';
      currentAngle = endAngle;
   });
   
   return gradientString;
}

export default AnalyticsCenter;
