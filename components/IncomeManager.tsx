
import React, { useState, useMemo } from 'react';
import { FinancialProfile, IncomeSource, IncomePayment, PaymentFrequency, PostEntry } from '../types';
import { formatMoney, formatUSD, getDollarRate } from '../utils';

interface Props {
  profile: FinancialProfile;
  transactions: any[];
  onUpdateProfile: (profile: FinancialProfile) => void;
  onBack: () => void;
  privacyMode?: boolean;
}

const getEffectiveMode = (src: IncomeSource): 'FIXED' | 'VARIABLE' | 'PER_DELIVERY' => {
  if (src.incomeMode) return src.incomeMode;
  if (src.isCreatorSource) return 'VARIABLE';
  return 'FIXED';
};
const isVariableMode = (src: IncomeSource) => { const m = getEffectiveMode(src); return m === 'VARIABLE' || m === 'PER_DELIVERY'; };

const IncomeManager: React.FC<Props> = ({ profile, onUpdateProfile, onBack, privacyMode }) => {
  const [sources, setSources] = useState<IncomeSource[]>(profile.incomeSources || []);
  const dollarRate = getDollarRate(profile);
  const [sortOrder, setSortOrder] = useState<'AMOUNT' | 'DATE'>('AMOUNT');
  const [isAdding, setIsAdding] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [frequency, setFrequency] = useState<PaymentFrequency>('MONTHLY');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [isEndDateEnabled, setIsEndDateEnabled] = useState(false);
  const [incomeMode, setIncomeMode] = useState<'FIXED' | 'VARIABLE' | 'PER_DELIVERY'>('FIXED');
  const [targetPosts, setTargetPosts] = useState('');
  const [requiresInvoice, setRequiresInvoice] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [showPostTracker, setShowPostTracker] = useState(false);
  const [isAddingPost, setIsAddingPost] = useState(false);
  const [newPostDesc, setNewPostDesc] = useState('');
  const [newPostAmount, setNewPostAmount] = useState('');
  const [newPostDate, setNewPostDate] = useState(new Date().toISOString().split('T')[0]);

  // Check if a contract is active in a given month (YYYY-MM string).
  // Using string comparison avoids timezone bugs from new Date(YYYY-MM-DD).
  const isMonthActive = (src: IncomeSource, monthKey: string) => {
    if (src.isActive === false) return false;
    const startMonth = src.startDate ? src.startDate.substring(0, 7) : '';
    const endMonth = src.endDate ? src.endDate.substring(0, 7) : '';
    if (src.frequency === 'ONE_TIME') {
      return !startMonth || startMonth === monthKey;
    }
    if (startMonth && monthKey < startMonth) return false;
    if (endMonth && monthKey > endMonth) return false;
    return true;
  };

  const isContractActive = (src: IncomeSource, targetDate: Date = new Date()) => {
    const monthKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
    return isMonthActive(src, monthKey);
  };

  const getCurrentMonthRealAmount = (src: IncomeSource) => {
    const now = new Date();
    const pfx = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const total = src.payments.filter(p => p.month.startsWith(pfx)).reduce((a,p) => a + p.realAmount, 0);
    return src.currency === 'USD' ? total * dollarRate : total;
  };

  const getMonthlyProjection = (src: IncomeSource) => {
    if (!isContractActive(src)) return 0;
    const mode = getEffectiveMode(src);
    if (mode === 'VARIABLE') return getCurrentMonthRealAmount(src);
    if (mode === 'PER_DELIVERY') {
      const now = new Date();
      const pfx = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
      const monthPosts = (src.posts || []).filter(p => p.date.startsWith(pfx));
      const total = monthPosts.reduce((a,p) => a + p.amount, 0);
      return src.currency === 'USD' ? total * dollarRate : total;
    }
    let val = src.amount;
    if (src.currency === 'USD') val *= dollarRate;
    if (src.frequency === 'BIWEEKLY') return val * 2;
    // ONE_TIME: isContractActive ya filtró por mes, así que se cuenta entero
    return val;
  };

  const totalMonthlyProjected = useMemo(() => sources.reduce((a, s) => a + getMonthlyProjection(s), 0), [sources, dollarRate]);

  const sortedSources = useMemo(() => [...sources].sort((a, b) => {
    if (sortOrder === 'AMOUNT') {
      const vA = isVariableMode(a) ? getCurrentMonthRealAmount(a) : (a.currency === 'USD' ? a.amount * dollarRate : a.amount);
      const vB = isVariableMode(b) ? getCurrentMonthRealAmount(b) : (b.currency === 'USD' ? b.amount * dollarRate : b.amount);
      return vB - vA;
    }
    return b.id.localeCompare(a.id);
  }), [sources, sortOrder, dollarRate]);

  const handleSaveSource = () => {
    if (!name) return;
    if (incomeMode === 'FIXED' && !amount) return;
    if (incomeMode === 'PER_DELIVERY' && !amount) return;
    
    if (editingSourceId) {
      // UPDATE existing
      const srcIdx = sources.findIndex(s => s.id === editingSourceId);
      if (srcIdx === -1) return;
      const existing = sources[srcIdx];
      const updatedSrc: IncomeSource = {
        ...existing, name, amount: incomeMode === 'VARIABLE' ? (parseFloat(amount) || 0) : parseFloat(amount) || 0,
        currency, frequency, startDate: startDate || existing.startDate, endDate: isEndDateEnabled ? endDate : undefined,
        isCreatorSource: incomeMode === 'VARIABLE', incomeMode,
        targetPosts: (incomeMode === 'PER_DELIVERY' || incomeMode === 'FIXED') ? (parseFloat(targetPosts) || 0) : undefined,
        requiresInvoice: requiresInvoice || undefined,
      };
      const updated = [...sources]; updated[srcIdx] = updatedSrc;
      setSources(updated); onUpdateProfile({ ...profile, incomeSources: updated });
    } else {
      // CREATE new
      const newSrc: IncomeSource = {
        id: Date.now().toString(), name, amount: incomeMode === 'VARIABLE' ? (parseFloat(amount) || 0) : parseFloat(amount) || 0,
        currency, frequency, startDate, endDate: isEndDateEnabled ? endDate : undefined,
        isActive: true, isCreatorSource: incomeMode === 'VARIABLE', incomeMode, payments: [], type: 'FIXED',
        targetPosts: (incomeMode === 'PER_DELIVERY' || incomeMode === 'FIXED') ? (parseFloat(targetPosts) || 0) : undefined, posts: [],
        requiresInvoice: requiresInvoice || undefined,
      };
      const updated = [...sources, newSrc]; setSources(updated);
      onUpdateProfile({ ...profile, incomeSources: updated });
    }
    resetForm();
  };

  const resetForm = () => {
    setName(''); setAmount(''); setCurrency('ARS'); setFrequency('MONTHLY');
    setStartDate(new Date().toISOString().split('T')[0]); setEndDate('');
    setIsEndDateEnabled(false); setIncomeMode('FIXED'); setTargetPosts('');
    setRequiresInvoice(false);
    setIsAdding(false); setEditingSourceId(null);
  };

  const handleEditSource = (src: IncomeSource) => {
    setName(src.name);
    setAmount(src.amount > 0 ? src.amount.toString() : '');
    setCurrency(src.currency || 'ARS');
    setFrequency(src.frequency || 'MONTHLY');
    setStartDate(src.startDate || '');
    setEndDate(src.endDate || '');
    setIsEndDateEnabled(!!src.endDate);
    setIncomeMode(getEffectiveMode(src));
    setTargetPosts(src.targetPosts ? src.targetPosts.toString() : '');
    setRequiresInvoice(src.requiresInvoice || false);
    setEditingSourceId(src.id);
    setIsAdding(true);
    setSelectedSourceId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar este contrato?')) {
      const updated = sources.filter(s => s.id !== id); setSources(updated);
      onUpdateProfile({ ...profile, incomeSources: updated });
      if (selectedSourceId === id) setSelectedSourceId(null);
    }
  };

  const handleUpdatePayment = (sourceId: string, payment: IncomePayment) => {
    const i = sources.findIndex(s => s.id === sourceId); if (i === -1) return;
    const src = sources[i]; const np = [...src.payments];
    const ei = np.findIndex(p => p.month === payment.month);
    if (ei >= 0) np[ei] = { ...np[ei], ...payment }; else np.push(payment);
    const us = [...sources]; us[i] = { ...src, payments: np };
    setSources(us); onUpdateProfile({ ...profile, incomeSources: us });
  };

  const handleAddPost = (sid: string) => {
    if (!newPostDesc && !newPostAmount) return;
    const i = sources.findIndex(s => s.id === sid); if (i === -1) return;
    const post: PostEntry = { id: Date.now().toString(), date: newPostDate, description: newPostDesc || 'Entrega', amount: parseFloat(newPostAmount) || 0, isPaid: false };
    const us = [...sources]; us[i] = { ...us[i], posts: [...(us[i].posts || []), post] };
    setSources(us); onUpdateProfile({ ...profile, incomeSources: us });
    setNewPostDesc(''); setNewPostAmount(''); setNewPostDate(new Date().toISOString().split('T')[0]); setIsAddingPost(false);
  };

  const handleTogglePostPaid = (sid: string, pid: string) => {
    const i = sources.findIndex(s => s.id === sid); if (i === -1) return;
    const us = [...sources]; us[i] = { ...us[i], posts: (us[i].posts || []).map(p => p.id === pid ? { ...p, isPaid: !p.isPaid, paidDate: !p.isPaid ? new Date().toISOString().split('T')[0] : undefined } : p) };
    setSources(us); onUpdateProfile({ ...profile, incomeSources: us });
  };

  const handleDeletePost = (sid: string, pid: string) => {
    const i = sources.findIndex(s => s.id === sid); if (i === -1) return;
    const us = [...sources]; us[i] = { ...us[i], posts: (us[i].posts || []).filter(p => p.id !== pid) };
    setSources(us); onUpdateProfile({ ...profile, incomeSources: us });
  };

  const getModeLabel = (s: IncomeSource) => { const m = getEffectiveMode(s); return m === 'VARIABLE' ? 'Variable' : m === 'PER_DELIVERY' ? 'Por Entrega' : 'Fijo'; };
  const getModeColor = (s: IncomeSource) => { const m = getEffectiveMode(s); return m === 'VARIABLE' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : m === 'PER_DELIVERY' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'; };

  // ==================== DETAIL VIEW ====================
  const selectedSource = sources.find(s => s.id === selectedSourceId);
  if (selectedSource) {
    const monthsList = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const isUSD = selectedSource.currency === 'USD';
    const mode = getEffectiveMode(selectedSource);
    const paidPayments = selectedSource.payments.filter(p => p.isPaid);
    const posts = selectedSource.posts || [];
    const paidPosts = posts.filter(p => p.isPaid);
    const unpaidPosts = posts.filter(p => !p.isPaid);
    const totalPaidPosts = paidPosts.reduce((s,p) => s + p.amount, 0);
    const totalOwed = unpaidPosts.reduce((s,p) => s + p.amount, 0);
    // For PER_DELIVERY, earnings come from paid posts; for others, from monthly payments
    const totalEarnings = mode === 'PER_DELIVERY'
      ? (isUSD ? totalPaidPosts * dollarRate : totalPaidPosts)
      : paidPayments.reduce((a,p) => a + (isUSD ? p.realAmount * dollarRate : p.realAmount), 0);
    const paidCount = mode === 'PER_DELIVERY' ? paidPosts.length : paidPayments.length;

    return (
      <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
        <div className="sticky top-0 z-20 bg-surface-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedSourceId(null)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><span className="material-symbols-outlined">arrow_back</span></button>
            <div>
              <h2 className="text-lg font-bold leading-none">{selectedSource.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${getModeColor(selectedSource)}`}>{getModeLabel(selectedSource)}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${selectedSource.frequency === 'BIWEEKLY' ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>{selectedSource.frequency === 'BIWEEKLY' ? 'Quincenal' : selectedSource.frequency === 'ONE_TIME' ? 'Único' : 'Mensual'}</span>
                {isUSD && <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 rounded font-bold">USD</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleEditSource(selectedSource)} className="text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded-full"><span className="material-symbols-outlined">edit</span></button>
            <button onClick={() => handleDelete(selectedSource.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-full"><span className="material-symbols-outlined">delete</span></button>
          </div>
        </div>
        <div className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-6 space-y-6 pb-24">
          <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10 grid grid-cols-2 gap-4">
              <div><p className="text-xs text-slate-400 font-bold uppercase mb-1">Cobrado ({viewYear})</p><p className={`text-2xl font-black ${privacyMode?'blur-sm':''}`}>{formatMoney(totalEarnings)}</p></div>
              <div><p className="text-xs text-slate-400 font-bold uppercase mb-1">{mode === 'PER_DELIVERY' ? 'Entregas Cobradas' : 'Meses Cobrados'}</p><p className="text-2xl font-black text-emerald-400">{paidCount}</p></div>
              {mode === 'FIXED' && selectedSource.amount > 0 && <div className="col-span-2 pt-3 border-t border-white/10"><p className="text-xs text-slate-400 font-bold uppercase mb-1">Base Mensual</p><p className={`text-lg font-bold ${privacyMode?'blur-sm':''}`}>{isUSD ? formatUSD(selectedSource.amount) : formatMoney(selectedSource.amount)}{selectedSource.frequency === 'BIWEEKLY' && ' x quincena'}</p></div>}
            </div>
          </div>

          {mode === 'PER_DELIVERY' && (
            <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <button onClick={() => setShowPostTracker(!showPostTracker)} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white"><span className="material-symbols-outlined text-lg">task_alt</span></div>
                  <div className="text-left"><p className="font-bold text-sm">Tracker de Entregas</p><p className="text-[10px] text-slate-400 font-bold">{paidPosts.length} cobradas • {unpaidPosts.length} pendientes</p></div>
                </div>
                <div className="flex items-center gap-3">
                  {totalOwed > 0 && <span className={`text-xs font-black text-amber-500 ${privacyMode?'blur-sm':''}`}>Te deben: {isUSD ? formatUSD(totalOwed) : formatMoney(totalOwed)}</span>}
                  <span className={`material-symbols-outlined text-slate-400 transition-transform ${showPostTracker?'rotate-180':''}`}>expand_more</span>
                </div>
              </button>
              {showPostTracker && (
                <div className="border-t border-slate-200 dark:border-slate-700 p-5 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl p-3 text-center"><p className="text-[9px] text-emerald-600 font-bold uppercase">Cobrado</p><p className={`text-lg font-black text-emerald-600 ${privacyMode?'blur-sm':''}`}>{isUSD?formatUSD(totalPaidPosts):formatMoney(totalPaidPosts)}</p></div>
                    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-3 text-center"><p className="text-[9px] text-amber-600 font-bold uppercase">Pendiente</p><p className={`text-lg font-black text-amber-600 ${privacyMode?'blur-sm':''}`}>{isUSD?formatUSD(totalOwed):formatMoney(totalOwed)}</p></div>
                    <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-3 text-center"><p className="text-[9px] text-blue-600 font-bold uppercase">Total</p><p className="text-lg font-black text-blue-600">{posts.length}</p></div>
                  </div>
                  {!isAddingPost ? (
                    <button onClick={() => setIsAddingPost(true)} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined text-sm">add</span><span className="text-xs font-bold">Agregar Entrega</span></button>
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3 border border-slate-200 dark:border-slate-700">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2"><label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Descripción</label><input type="text" className="w-full bg-white dark:bg-slate-900 p-2.5 rounded-lg outline-none text-sm font-bold border border-slate-200 dark:border-slate-700 focus:border-primary" placeholder="Ej: Artículo sobre IA" value={newPostDesc} onChange={e => setNewPostDesc(e.target.value)} /></div>
                        <div><label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Monto ({isUSD?'USD':'ARS'})</label><input type="number" className="w-full bg-white dark:bg-slate-900 p-2.5 rounded-lg outline-none text-sm font-bold border border-slate-200 dark:border-slate-700" placeholder="0" value={newPostAmount} onChange={e => setNewPostAmount(e.target.value)} /></div>
                        <div><label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Fecha</label><input type="date" className="w-full bg-white dark:bg-slate-900 p-2.5 rounded-lg outline-none text-sm font-bold border border-slate-200 dark:border-slate-700" value={newPostDate} onChange={e => setNewPostDate(e.target.value)} /></div>
                      </div>
                      <div className="flex gap-2"><button onClick={() => handleAddPost(selectedSource.id)} className="flex-1 bg-primary text-white py-2.5 rounded-xl text-xs font-bold">Guardar</button><button onClick={() => { setIsAddingPost(false); setNewPostDesc(''); setNewPostAmount(''); }} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700">Cancelar</button></div>
                    </div>
                  )}
                  {posts.length > 0 && <div className="space-y-2"><p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Historial</p>
                    {[...posts].sort((a,b) => b.date.localeCompare(a.date)).map(post => (
                      <div key={post.id} className={`flex items-center gap-3 p-3 rounded-xl ${post.isPaid ? 'bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'}`}>
                        <button onClick={() => handleTogglePostPaid(selectedSource.id, post.id)} className={`size-8 rounded-full flex items-center justify-center shrink-0 ${post.isPaid ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}><span className="material-symbols-outlined text-sm">{post.isPaid?'check':'schedule'}</span></button>
                        <div className="flex-1 min-w-0"><p className={`text-sm font-bold truncate ${post.isPaid?'line-through text-slate-400':''}`}>{post.description||'Entrega'}</p><p className="text-[10px] text-slate-400">{new Date(post.date+'T00:00:00').toLocaleDateString('es-AR',{day:'numeric',month:'short'})}{post.isPaid&&post.paidDate&&<span className="text-emerald-500 ml-2">Cobrado {new Date(post.paidDate+'T00:00:00').toLocaleDateString('es-AR',{day:'numeric',month:'short'})}</span>}</p></div>
                        <div className="flex items-center gap-2 shrink-0"><p className={`text-sm font-black ${privacyMode?'blur-sm':''} ${post.isPaid?'text-emerald-500':''}`}>{isUSD?formatUSD(post.amount):formatMoney(post.amount)}</p><button onClick={() => {if(confirm('¿Eliminar?'))handleDeletePost(selectedSource.id,post.id);}} className="size-6 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500"><span className="material-symbols-outlined text-[14px]">close</span></button></div>
                      </div>
                    ))}
                  </div>}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-center gap-6 bg-surface-light dark:bg-surface-dark p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <button onClick={() => setViewYear(viewYear-1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><span className="material-symbols-outlined">chevron_left</span></button>
            <span className="text-xl font-black">{viewYear}</span>
            <button onClick={() => setViewYear(viewYear+1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><span className="material-symbols-outlined">chevron_right</span></button>
          </div>

          <div className="space-y-3">
            {monthsList.map((mName, idx) => {
              const renderSlot = (pKey: string, pLabel: string) => {
                const payment = selectedSource.payments.find(p => p.month === pKey);
                const isActive = isMonthActive(selectedSource, pKey.substring(0, 7));
                const currentVal = payment ? payment.realAmount : (mode === 'FIXED' ? selectedSource.amount : 0);
                const isPaid = payment?.isPaid || false;
                const isInvoiceSent = payment?.isInvoiceSent || false;
                const expected = mode === 'FIXED' ? selectedSource.amount : 0;
                const postsDone = payment?.postsCompleted || 0;
                const paidDone = payment?.postsPaid || 0;
                const requiredPosts = selectedSource.targetPosts || 0;

                const updatePosts = (increment: number) => {
                  const newVal = Math.max(0, postsDone + increment);
                  handleUpdatePayment(selectedSource.id, {
                    month: pKey, realAmount: currentVal || expected, isPaid, postsCompleted: newVal, postsPaid: paidDone
                  });
                };
                const updatePostsPaid = (increment: number) => {
                  const newVal = Math.max(0, Math.min(postsDone, paidDone + increment));
                  handleUpdatePayment(selectedSource.id, {
                    month: pKey, realAmount: currentVal || expected, isPaid, postsCompleted: postsDone, postsPaid: newVal
                  });
                };

                return (
                  <div key={pKey} className={`p-4 rounded-xl border flex flex-col gap-3 transition-colors ${!isActive?'opacity-40 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900':isPaid?'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800':'bg-surface-light dark:bg-surface-dark border-slate-200 dark:border-slate-700'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`size-8 rounded-full flex items-center justify-center font-bold text-[10px] uppercase ${isActive?'bg-slate-200 dark:bg-slate-700':'bg-slate-100 text-slate-300'}`}>{pLabel.substring(0,3)}</div>
                        <div>
                          <span className="font-bold text-sm block">{mName}{pLabel !== 'Mensual' ? ` - ${pLabel}` : ''}</span>
                          {isPaid && payment && payment.realAmount > 0 && <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">check_circle</span>Cobrado{mode==='FIXED'&&payment.realAmount!==expected&&expected>0&&<span className="text-amber-500 ml-1">({payment.realAmount>expected?'+':''}{isUSD?formatUSD(payment.realAmount-expected):formatMoney(payment.realAmount-expected)})</span>}</span>}
                          {!isPaid && isActive && mode === 'VARIABLE' && <span className="text-[10px] text-amber-500 font-bold">Pendiente de registro</span>}
                        </div>
                      </div>
                      {isActive && <button onClick={() => handleUpdatePayment(selectedSource.id, { month: pKey, realAmount: currentVal || expected, isPaid: !isPaid, postsCompleted: postsDone })} className={`size-8 rounded-full flex items-center justify-center transition-all ${isPaid?'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30':'bg-slate-200 dark:bg-slate-700 text-slate-400 hover:bg-slate-300'}`}><span className="material-symbols-outlined text-sm">{isPaid?'check':'attach_money'}</span></button>}
                    </div>
                    {/* Delivery counter for FIXED with targetPosts */}
                    {isActive && mode === 'FIXED' && requiredPosts > 0 && (
                      <div className="pl-11 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold uppercase text-slate-400 w-20">Entregados:</span>
                          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full px-1.5 py-0.5">
                            <button onClick={() => updatePosts(-1)} className="size-6 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500"><span className="material-symbols-outlined text-[16px]">remove</span></button>
                            <span className={`text-sm font-bold w-14 text-center ${postsDone >= requiredPosts ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>{postsDone}/{requiredPosts}</span>
                            <button onClick={() => updatePosts(1)} className="size-6 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500"><span className="material-symbols-outlined text-[16px]">add</span></button>
                          </div>
                          {postsDone >= requiredPosts && <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">check_circle</span>Completo</span>}
                        </div>
                        {postsDone > 0 && (
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold uppercase text-slate-400 w-20">Pagados:</span>
                            <div className="flex items-center bg-emerald-50 dark:bg-emerald-900/20 rounded-full px-1.5 py-0.5 border border-emerald-200 dark:border-emerald-800">
                              <button onClick={() => updatePostsPaid(-1)} className="size-6 flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-full text-emerald-500"><span className="material-symbols-outlined text-[16px]">remove</span></button>
                              <span className={`text-sm font-bold w-14 text-center ${paidDone >= postsDone ? 'text-emerald-500' : 'text-amber-500'}`}>{paidDone}/{postsDone}</span>
                              <button onClick={() => updatePostsPaid(1)} className="size-6 flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-full text-emerald-500"><span className="material-symbols-outlined text-[16px]">add</span></button>
                            </div>
                            {paidDone >= postsDone && paidDone > 0 && <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">paid</span>Todo pago</span>}
                            {paidDone < postsDone && <span className="text-[10px] text-amber-500 font-bold">{postsDone - paidDone} sin cobrar</span>}
                          </div>
                        )}
                      </div>
                    )}
                    {isActive && (
                      <div className="flex items-center justify-between gap-3 pl-11">
                        <p className="text-[10px] text-slate-400 uppercase font-bold shrink-0">{mode==='FIXED'?`Monto (${isUSD?'USD':'ARS'}):`:mode==='VARIABLE'?`Cobrado (${isUSD?'USD':'ARS'}):`:''}</p>
                        {mode !== 'PER_DELIVERY' && <input type="number" className={`w-28 bg-transparent text-right font-bold outline-none border-b border-dashed border-slate-300 focus:border-primary ${privacyMode?'blur-sm':''}`} placeholder={expected>0?expected.toString():'0'} value={currentVal||''} onChange={e => handleUpdatePayment(selectedSource.id, { month: pKey, realAmount: parseFloat(e.target.value), isPaid, postsCompleted: postsDone })} />}
                      </div>
                    )}
                    {isActive && selectedSource.requiresInvoice && (
                      <div className="flex items-center justify-between pl-11">
                        <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">description</span>Factura:
                        </span>
                        <button onClick={() => handleUpdatePayment(selectedSource.id, { month: pKey, realAmount: currentVal || expected, isPaid, isInvoiceSent: !isInvoiceSent, postsCompleted: postsDone })} className={`text-[10px] font-bold flex items-center gap-1 px-3 py-1.5 rounded-full transition-all ${isInvoiceSent ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'}`}>
                          <span className="material-symbols-outlined text-[13px]">{isInvoiceSent ? 'check_circle' : 'radio_button_unchecked'}</span>
                          {isInvoiceSent ? 'Enviada' : 'Pendiente'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              };
              if (selectedSource.frequency === 'BIWEEKLY') return <div key={mName} className="space-y-2">{renderSlot(`${viewYear}-${String(idx+1).padStart(2,'0')}-Q1`,'1ª Quincena')}{renderSlot(`${viewYear}-${String(idx+1).padStart(2,'0')}-Q2`,'2ª Quincena')}</div>;
              return renderSlot(`${viewYear}-${String(idx+1).padStart(2,'0')}`, 'Mensual');
            })}
          </div>
        </div>
      </div>
    );
  }

  // ==================== MAIN LIST ====================
  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen font-display flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      <div className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-white/30 dark:border-slate-700/40 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><span className="material-symbols-outlined">arrow_back</span></button>
        <h2 className="text-lg font-bold">Gestión de Contratos</h2>
      </div>
      <div className="flex-1 w-full max-w-4xl mx-auto p-6 space-y-8 pb-24">
        <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-1 opacity-80"><span className="material-symbols-outlined text-sm">calendar_today</span><span className="text-xs font-bold uppercase tracking-widest">Proyección Este Mes</span></div>
              <h1 className={`text-4xl font-black tracking-tight ${privacyMode?'blur-md select-none opacity-50':''}`}>{formatMoney(totalMonthlyProjected)}</h1>
              <p className="text-[10px] opacity-60 mt-1">Fijos + cobros registrados de variables</p>
            </div>
            <button onClick={() => setIsAdding(true)} className="bg-white/20 dark:bg-black/10 hover:bg-white/30 p-3 rounded-full backdrop-blur-md"><span className="material-symbols-outlined">add</span></button>
          </div>
        </div>

        {sortedSources.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Línea de Tiempo</h3>
            <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-700 p-4 overflow-x-auto scrollbar-hide shadow-sm">
              <div className="min-w-[600px]">
                <div className="flex mb-4"><div className="w-32 shrink-0"></div>{Array.from({length:6}).map((_,i) => { const d=new Date();d.setMonth(d.getMonth()+i); return <div key={i} className="flex-1 text-center text-[10px] font-bold text-slate-400 uppercase">{d.toLocaleDateString('es-ES',{month:'short'})}</div>; })}</div>
                <div className="space-y-3">{sortedSources.filter(s => isContractActive(s)).map(src => {
                  const mode = getEffectiveMode(src);
                  return (
                    <div key={src.id} className="flex items-center"><div className="w-32 shrink-0 pr-4"><p className="font-bold text-xs truncate">{src.name}</p><p className="text-[10px] text-slate-500">{getModeLabel(src)}</p></div>
                      <div className="flex-1 flex gap-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">{Array.from({length:6}).map((_,i) => { const d=new Date();d.setDate(15);d.setMonth(d.getMonth()+i); const active=isContractActive(src,d); let c='bg-slate-100 dark:bg-slate-800'; if(active){if(mode==='VARIABLE')c='bg-amber-400';else if(mode==='PER_DELIVERY')c='bg-indigo-500';else c='bg-blue-500';} return <div key={i} className={`flex-1 ${c} opacity-80`}></div>; })}</div>
                    </div>
                  );
                })}</div>
              </div>
            </div>
          </div>
        )}

        {isAdding && (
          <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl animate-[fadeIn_0.2s_ease-out]">
            <h3 className="font-bold text-lg mb-4">{editingSourceId ? 'Editar Contrato' : 'Nuevo Contrato / Ingreso'}</h3>
            <div className="grid gap-4">
              <div><label className="text-[10px] uppercase font-bold text-slate-400 mb-2 block">¿Cómo te pagan?</label>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setIncomeMode('FIXED')} className={`p-3 rounded-xl border-2 text-left transition-all ${incomeMode==='FIXED'?'border-blue-500 bg-blue-50 dark:bg-blue-900/20':'border-slate-200 dark:border-slate-700'}`}><span className="material-symbols-outlined text-blue-500 text-lg block mb-1">lock</span><p className="text-xs font-bold">Monto Fijo</p><p className="text-[9px] text-slate-400 mt-0.5">Mismo monto cada mes</p></button>
                  <button onClick={() => setIncomeMode('VARIABLE')} className={`p-3 rounded-xl border-2 text-left transition-all ${incomeMode==='VARIABLE'?'border-amber-500 bg-amber-50 dark:bg-amber-900/20':'border-slate-200 dark:border-slate-700'}`}><span className="material-symbols-outlined text-amber-500 text-lg block mb-1">swap_vert</span><p className="text-xs font-bold">Variable</p><p className="text-[9px] text-slate-400 mt-0.5">Diferente monto cada mes</p></button>
                  <button onClick={() => setIncomeMode('PER_DELIVERY')} className={`p-3 rounded-xl border-2 text-left transition-all ${incomeMode==='PER_DELIVERY'?'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20':'border-slate-200 dark:border-slate-700'}`}><span className="material-symbols-outlined text-indigo-500 text-lg block mb-1">task_alt</span><p className="text-xs font-bold">Por Entrega</p><p className="text-[9px] text-slate-400 mt-0.5">Cobrás por artículo / post</p></button>
                </div>
              </div>
              <div><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Nombre / Cliente</label><input type="text" className="w-full bg-slate-100 dark:bg-slate-900 p-3 rounded-xl outline-none font-bold text-sm" placeholder={incomeMode==='PER_DELIVERY'?'Ej. Polymarket':'Ej. Fundación, Canal TV'} value={name} onChange={e => setName(e.target.value)} /></div>
              <div><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">{incomeMode==='FIXED'?'Monto mensual':incomeMode==='VARIABLE'?'Monto estimado (referencia, opcional)':'Monto por entrega'}</label>
                <div className="flex gap-2"><div className="relative flex-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currency==='ARS'?'$':'U$'}</span><input type="number" className="w-full bg-slate-100 dark:bg-slate-900 p-3 pl-8 rounded-xl outline-none font-bold text-sm" placeholder={incomeMode==='VARIABLE'?'Opcional':'0'} value={amount} onChange={e => setAmount(e.target.value)} /></div>
                  <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl flex items-center"><button onClick={() => setCurrency('ARS')} className={`px-3 py-2 rounded-lg text-xs font-bold ${currency==='ARS'?'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white':'text-slate-400'}`}>ARS</button><button onClick={() => setCurrency('USD')} className={`px-3 py-2 rounded-lg text-xs font-bold ${currency==='USD'?'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white':'text-slate-400'}`}>USD</button></div></div>
                {incomeMode==='VARIABLE' && <p className="text-[9px] text-slate-400 mt-1 ml-1">Ideal para fundaciones, consultorías, o sueldos que varían. Registrás el monto real cada mes.</p>}
              </div>
              {incomeMode==='PER_DELIVERY' && <div><label className="text-[9px] uppercase font-bold text-slate-400 mb-1 block">Entregas esperadas por mes (opcional)</label><input type="number" className="w-full bg-slate-100 dark:bg-slate-900 p-3 rounded-xl outline-none font-bold text-sm" placeholder="Ej. 10" value={targetPosts} onChange={e => setTargetPosts(e.target.value)} /></div>}
              {incomeMode==='FIXED' && <div><label className="text-[9px] uppercase font-bold text-slate-400 mb-1 block">Entregas por mes (opcional, ej: posts, artículos)</label><input type="number" className="w-full bg-slate-100 dark:bg-slate-900 p-3 rounded-xl outline-none font-bold text-sm" placeholder="Ej. 12 — dejá vacío si no aplica" value={targetPosts} onChange={e => setTargetPosts(e.target.value)} /><p className="text-[9px] text-slate-400 mt-1 ml-1">Si tenés que entregar posts o artículos para cobrar, poné la cantidad acá para trackear tu avance.</p></div>}
              <div><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Frecuencia</label>
                <div className="flex gap-2">
                  <button onClick={() => setFrequency('MONTHLY')} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${frequency==='MONTHLY'?'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900/30':'border-slate-200 dark:border-slate-700 text-slate-500'}`}>Mensual</button>
                  <button onClick={() => setFrequency('BIWEEKLY')} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${frequency==='BIWEEKLY'?'bg-purple-50 border-purple-500 text-purple-600 dark:bg-purple-900/30':'border-slate-200 dark:border-slate-700 text-slate-500'}`}>Quincenal</button>
                  <button onClick={() => setFrequency('ONE_TIME')} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${frequency==='ONE_TIME'?'bg-orange-50 border-orange-500 text-orange-600 dark:bg-orange-900/30':'border-slate-200 dark:border-slate-700 text-slate-500'}`}>Único</button>
                </div>
              </div>
              {frequency === 'ONE_TIME' ? (
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Mes del pago</label>
                  <input
                    type="month"
                    className="w-full bg-slate-100 dark:bg-slate-900 p-3 rounded-xl outline-none font-bold text-sm"
                    value={startDate.substring(0, 7)}
                    onChange={e => setStartDate(e.target.value ? `${e.target.value}-01` : '')}
                  />
                  <p className="text-[9px] text-slate-400 mt-1 ml-1">Este contrato aparecerá únicamente en el mes seleccionado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Inicio</label><input type="date" className="w-full bg-slate-100 dark:bg-slate-900 p-3 rounded-xl outline-none font-bold text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                  <div><div className="flex justify-between mb-1"><label className="text-[10px] uppercase font-bold text-slate-400 block">Fin</label><div className="flex items-center gap-1"><input type="checkbox" checked={isEndDateEnabled} onChange={e => setIsEndDateEnabled(e.target.checked)} className="size-3 accent-primary" /><span className="text-[10px] text-slate-500">Definir</span></div></div><input type="date" disabled={!isEndDateEnabled} className={`w-full bg-slate-100 dark:bg-slate-900 p-3 rounded-xl outline-none font-bold text-sm ${!isEndDateEnabled?'opacity-30 cursor-not-allowed':''}`} value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
                </div>
              )}
              <button onClick={() => setRequiresInvoice(r => !r)} className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${requiresInvoice ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="flex items-center gap-3 text-left">
                  <span className={`material-symbols-outlined text-xl ${requiresInvoice ? 'text-violet-500' : 'text-slate-400'}`}>description</span>
                  <div>
                    <p className="text-xs font-bold">Requiere factura para cobrar</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Activá si necesitás enviar factura antes de que te paguen</p>
                  </div>
                </div>
                <div className={`size-6 rounded-full flex items-center justify-center shrink-0 ${requiresInvoice ? 'bg-violet-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                  <span className="material-symbols-outlined text-[14px]">{requiresInvoice ? 'check' : 'close'}</span>
                </div>
              </button>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSaveSource} disabled={!name||(incomeMode==='FIXED'&&!amount)||(incomeMode==='PER_DELIVERY'&&!amount)} className="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-lg disabled:opacity-50">{editingSourceId ? 'Guardar Cambios' : 'Guardar Contrato'}</button>
                <button onClick={resetForm} className="px-6 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold rounded-xl">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-2"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Listado</h3>
          <button onClick={() => setSortOrder(p => p==='AMOUNT'?'DATE':'AMOUNT')} className="flex items-center gap-1 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-slate-500"><span className="material-symbols-outlined text-[14px]">sort</span>{sortOrder==='AMOUNT'?'Mayor a Menor':'Recientes'}</button>
        </div>
        <div className="space-y-4">
          {sortedSources.map(src => {
            const isActive = isContractActive(src); const isUSD = src.currency === 'USD'; const mode = getEffectiveMode(src);
            const currentReal = getCurrentMonthRealAmount(src);
            const now = new Date(); const pfx = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
            
            // For PER_DELIVERY: sum posts in current month; for others: use payments
            let displayArs = 0;
            let hasPaid = false;
            if (mode === 'PER_DELIVERY') {
              const monthPosts = (src.posts || []).filter(p => p.date.startsWith(pfx));
              const paidMonthPosts = (src.posts || []).filter(p => p.isPaid);
              const totalPostsArs = paidMonthPosts.reduce((a, p) => a + p.amount, 0);
              displayArs = isUSD ? totalPostsArs * dollarRate : totalPostsArs;
              hasPaid = paidMonthPosts.length > 0;
            } else if (mode === 'VARIABLE') {
              displayArs = currentReal;
              hasPaid = src.payments.some(p => p.month.startsWith(pfx) && p.isPaid);
            } else {
              displayArs = isUSD ? src.amount * dollarRate : src.amount;
              hasPaid = src.payments.some(p => p.month.startsWith(pfx) && p.isPaid);
            }

            const currentMonthPayment = src.payments.find(p => p.month.startsWith(pfx));
            const postsDone = currentMonthPayment?.postsCompleted || 0;
            const requiredPosts = src.targetPosts || 0;
            return (
              <div key={src.id} onClick={() => setSelectedSourceId(src.id)} className={`bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border transition-all cursor-pointer hover:shadow-md ${!isActive?'opacity-50 border-slate-200 dark:border-slate-800':hasPaid?'border-emerald-200 dark:border-emerald-800':'border-slate-200 dark:border-slate-700'}`}>
                <div className="flex items-center gap-4">
                  <div className={`size-12 rounded-2xl flex items-center justify-center font-bold text-white text-sm shrink-0 ${mode==='VARIABLE'?'bg-gradient-to-br from-amber-400 to-orange-500':mode==='PER_DELIVERY'?'bg-gradient-to-br from-indigo-500 to-purple-600':'bg-gradient-to-br from-blue-500 to-cyan-500'}`}>
                    <span className="material-symbols-outlined text-lg">{mode==='VARIABLE'?'swap_vert':mode==='PER_DELIVERY'?'task_alt':'payments'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{src.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${getModeColor(src)}`}>{getModeLabel(src)}</span>
                      {src.frequency==='BIWEEKLY'&&<span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 font-bold">Quincenal</span>}
                      {isUSD&&<span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold">USD</span>}
                      {hasPaid&&<span className="text-[9px] text-emerald-500 font-bold flex items-center gap-0.5"><span className="material-symbols-outlined text-[10px]">check_circle</span>Cobrado</span>}
                      {!hasPaid&&isActive&&mode!=='PER_DELIVERY'&&<span className="text-[9px] text-slate-400 font-bold">Pendiente</span>}
                      {mode==='FIXED'&&requiredPosts>0&&isActive&&<span className={`text-[9px] font-bold ${postsDone>=requiredPosts?'text-emerald-500':'text-indigo-500'}`}>{postsDone}/{requiredPosts} entregas</span>}
                      {src.requiresInvoice&&<span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 font-bold flex items-center gap-0.5"><span className="material-symbols-outlined text-[10px]">description</span>Factura</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-black text-sm ${privacyMode?'blur-sm':''}`}>{formatMoney(displayArs)}</p>
                    {mode==='VARIABLE'&&currentReal===0&&isActive&&<p className="text-[9px] text-amber-500 font-bold">Sin registrar</p>}
                    {mode==='PER_DELIVERY'&&displayArs===0&&isActive&&<p className="text-[9px] text-indigo-500 font-bold">Sin entregas</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {sources.length===0&&!isAdding&&<div className="text-center py-16"><span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3 block">payments</span><p className="text-slate-400 font-bold mb-4">No tenés contratos registrados</p><button onClick={() => setIsAdding(true)} className="bg-primary text-white px-6 py-3 rounded-xl font-bold">Agregar Ingreso</button></div>}
      </div>
    </div>
  );
};

export default IncomeManager;
