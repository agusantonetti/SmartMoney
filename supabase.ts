// ===================================================================
// Cliente Supabase + capa de datos
// ===================================================================
// Reemplaza firebase.ts. Mantiene el shape (FinancialProfile + Transaction[])
// que esperan los componentes, pero internamente persiste en tablas
// relacionales separadas. Esto vuelve estructuralmente imposible "vaciar
// todo" con un solo write — cada entidad es su tabla y cada fila es
// independiente.

import { createClient, RealtimeChannel, Session, User } from '@supabase/supabase-js';
import {
  FinancialProfile, Transaction, IncomeSource, IncomePayment, PostEntry,
  SavingsBucket, Subscription, Debt, TravelEvent, FinancialGoal,
  PatrimonioSnapshot, HistoricalMonthEstimate, QuickAction,
} from './types';

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// ===================================================================
// AUTH HELPERS
// ===================================================================
export type AuthChangeCallback = (user: User | null) => void;

export const onAuthChange = (cb: AuthChangeCallback): (() => void) => {
  // Estado inicial
  supabase.auth.getSession().then(({ data }) => cb(data.session?.user ?? null));
  const { data } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
    cb(session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
};

export const signUp = (email: string, password: string) =>
  supabase.auth.signUp({ email, password });

export const signIn = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password });

export const signOut = () => supabase.auth.signOut();

// ===================================================================
// HELPERS DE FORMA: convertir entre snake_case (DB) y camelCase (TS)
// ===================================================================
type DBRow = Record<string, any>;

const rowToTransaction = (r: DBRow): Transaction => ({
  id: r.id,
  type: r.type,
  amount: Number(r.amount),
  description: r.description ?? '',
  category: r.category ?? 'Otros',
  date: r.date,
  isOneTime: !!r.is_one_time,
  eventId: r.event_id ?? undefined,
});

const txToRow = (uid: string, t: Transaction): DBRow => ({
  id: t.id || undefined,
  user_id: uid,
  type: t.type,
  amount: t.amount,
  description: t.description || null,
  category: t.category || null,
  date: t.date,
  is_one_time: !!t.isOneTime,
  event_id: (t as any).eventId || null,
});

const rowToPost = (r: DBRow): PostEntry => ({
  id: r.id,
  date: r.date,
  description: r.description ?? '',
  amount: Number(r.amount),
  isPaid: !!r.is_paid,
  paidDate: r.paid_date ?? undefined,
});

const postToRow = (uid: string, sourceId: string, p: PostEntry): DBRow => ({
  id: p.id || undefined,
  user_id: uid,
  income_source_id: sourceId,
  date: p.date,
  description: p.description || null,
  amount: p.amount || 0,
  is_paid: !!p.isPaid,
  paid_date: p.paidDate || null,
});

const rowToPayment = (r: DBRow): IncomePayment => ({
  month: r.month,
  realAmount: Number(r.real_amount || 0),
  isPaid: !!r.is_paid,
  isInvoiceSent: r.is_invoice_sent ?? undefined,
  postsCompleted: r.posts_completed ?? undefined,
  postsPaid: r.posts_paid ?? undefined,
  ...(r.impressions != null || r.rpm != null ? { metrics: {
    impressions: r.impressions ?? undefined,
    rpm: r.rpm ?? undefined,
  } } : {}),
});

const paymentToRow = (uid: string, sourceId: string, p: IncomePayment): DBRow => ({
  user_id: uid,
  income_source_id: sourceId,
  month: p.month,
  real_amount: p.realAmount ?? 0,
  is_paid: !!p.isPaid,
  is_invoice_sent: p.isInvoiceSent ?? false,
  posts_completed: p.postsCompleted ?? null,
  posts_paid: p.postsPaid ?? null,
  impressions: (p as any).metrics?.impressions ?? null,
  rpm: (p as any).metrics?.rpm ?? null,
});

const rowToIncomeSource = (r: DBRow, payments: IncomePayment[], posts: PostEntry[]): IncomeSource => ({
  id: r.id,
  name: r.name,
  amount: Number(r.amount || 0),
  currency: r.currency || 'ARS',
  frequency: r.frequency || 'MONTHLY',
  startDate: r.start_date ?? undefined,
  endDate: r.end_date ?? undefined,
  isActive: r.is_active,
  isCreatorSource: !!r.is_creator_source,
  incomeMode: r.income_mode ?? undefined,
  medium: r.medium ?? undefined,
  hoursPerDay: r.hours_per_day ?? undefined,
  daysPerWeek: r.days_per_week ?? undefined,
  targetPosts: r.target_posts ?? undefined,
  requiresInvoice: !!r.requires_invoice,
  countDeliveredInSalary: !!r.count_delivered_in_salary,
  payments,
  posts,
  type: 'FIXED' as any, // legacy field
});

const incomeSourceToRow = (uid: string, s: IncomeSource): DBRow => ({
  id: s.id || undefined,
  user_id: uid,
  name: s.name,
  amount: s.amount ?? 0,
  currency: s.currency || 'ARS',
  frequency: s.frequency || 'MONTHLY',
  start_date: s.startDate || null,
  end_date: s.endDate || null,
  is_active: s.isActive !== false,
  is_creator_source: !!s.isCreatorSource,
  income_mode: s.incomeMode || null,
  medium: s.medium || null,
  hours_per_day: s.hoursPerDay ?? null,
  days_per_week: s.daysPerWeek ?? null,
  target_posts: s.targetPosts ?? null,
  requires_invoice: !!s.requiresInvoice,
  count_delivered_in_salary: !!s.countDeliveredInSalary,
});

const rowToSavingsBucket = (r: DBRow): SavingsBucket => ({
  id: r.id, name: r.name,
  currentAmount: Number(r.current_amount || 0),
  targetAmount: Number(r.target_amount || 0),
  icon: r.icon ?? undefined,
});

const savingsBucketToRow = (uid: string, b: SavingsBucket): DBRow => ({
  id: b.id || undefined, user_id: uid, name: b.name,
  current_amount: b.currentAmount ?? 0,
  target_amount: b.targetAmount ?? 0,
  icon: b.icon || null,
});

const rowToSubscription = (r: DBRow): Subscription => ({
  id: r.id, name: r.name,
  amount: Number(r.amount || 0),
  currency: r.currency || 'ARS',
  billingDay: Number(r.billing_day || 1),
  category: r.category || 'Otros',
  frequency: r.frequency || 'MONTHLY',
  nextPaymentDate: r.next_payment_date ?? undefined,
  history: r.history || [],
});

const subscriptionToRow = (uid: string, s: Subscription): DBRow => ({
  id: s.id || undefined, user_id: uid, name: s.name,
  amount: s.amount ?? 0, currency: s.currency || 'ARS',
  billing_day: s.billingDay ?? 1,
  category: s.category || 'Otros',
  frequency: s.frequency || 'MONTHLY',
  next_payment_date: s.nextPaymentDate || null,
  history: s.history || [],
});

const rowToDebt = (r: DBRow): Debt => ({
  id: r.id, name: r.name,
  totalAmount: Number(r.total_amount || 0),
  currentAmount: Number(r.current_amount || 0),
  dueDate: r.due_date ?? undefined,
});

const debtToRow = (uid: string, d: Debt): DBRow => ({
  id: d.id || undefined, user_id: uid, name: d.name,
  total_amount: d.totalAmount ?? 0, current_amount: d.currentAmount ?? 0,
  due_date: d.dueDate || null,
});

const rowToEvent = (r: DBRow): TravelEvent => ({
  id: r.id, name: r.name,
  status: r.status,
  startDate: r.start_date,
  budget: r.budget != null ? Number(r.budget) : undefined,
  coverImage: r.cover_image ?? undefined,
});

const eventToRow = (uid: string, e: TravelEvent): DBRow => ({
  id: e.id || undefined, user_id: uid, name: e.name,
  status: e.status || 'active',
  start_date: e.startDate,
  budget: e.budget ?? null,
  cover_image: e.coverImage || null,
});

const rowToGoal = (r: DBRow): FinancialGoal => ({
  id: r.id, name: r.name,
  targetAmount: Number(r.target_amount || 0),
  currency: r.currency || 'ARS',
  currentAmount: Number(r.current_amount || 0),
  deadline: r.deadline ?? undefined,
  createdAt: r.created_at,
  icon: r.icon ?? '', color: r.color ?? '',
});

const goalToRow = (uid: string, g: FinancialGoal): DBRow => ({
  id: g.id || undefined, user_id: uid, name: g.name,
  target_amount: g.targetAmount ?? 0, currency: g.currency || 'ARS',
  current_amount: g.currentAmount ?? 0,
  deadline: g.deadline || null,
  icon: g.icon || null, color: g.color || null,
});

const rowToPatrimonio = (r: DBRow): PatrimonioSnapshot => ({
  month: r.month, balance: Number(r.balance),
  dollarRate: Number(r.dollar_rate || 0),
  date: r.date,
});

const rowToInflation = (r: DBRow): { month: string; rate: number } => ({
  month: r.month, rate: Number(r.rate),
});

const rowToHistoricalEstimate = (r: DBRow): HistoricalMonthEstimate => ({
  month: r.month, byCategory: r.by_category || {}, note: r.note ?? undefined,
});

const rowToQuickAction = (r: DBRow): QuickAction => ({
  id: r.id, label: r.label, amount: r.amount != null ? Number(r.amount) : undefined,
  icon: r.icon ?? '',
});

const quickActionToRow = (uid: string, q: QuickAction, idx: number): DBRow => ({
  id: q.id || undefined, user_id: uid, label: q.label,
  amount: q.amount ?? null, icon: q.icon || null, display_order: idx,
});

// ===================================================================
// LOAD ALL DATA: query todas las tablas, ensambla {profile, transactions}
// ===================================================================
export const loadAllData = async (uid: string): Promise<{
  profile: FinancialProfile;
  transactions: Transaction[];
}> => {
  // Query en paralelo
  const [
    profileRes, txRes, srcRes, payRes, postsRes,
    bucketsRes, subsRes, debtsRes, evRes, goalsRes,
    patrRes, inflRes, estRes, qaRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', uid).maybeSingle(),
    supabase.from('transactions').select('*').eq('user_id', uid).order('date', { ascending: false }),
    supabase.from('income_sources').select('*').eq('user_id', uid),
    supabase.from('income_payments').select('*').eq('user_id', uid),
    supabase.from('posts').select('*').eq('user_id', uid),
    supabase.from('savings_buckets').select('*').eq('user_id', uid),
    supabase.from('subscriptions').select('*').eq('user_id', uid),
    supabase.from('debts').select('*').eq('user_id', uid),
    supabase.from('events').select('*').eq('user_id', uid),
    supabase.from('goals').select('*').eq('user_id', uid),
    supabase.from('patrimonio_history').select('*').eq('user_id', uid),
    supabase.from('inflation_history').select('*').eq('user_id', uid),
    supabase.from('historical_estimates').select('*').eq('user_id', uid),
    supabase.from('quick_actions').select('*').eq('user_id', uid).order('display_order'),
  ]);

  const pr = profileRes.data;
  const sources = (srcRes.data || []).map(s => {
    const sourcePayments = (payRes.data || []).filter(p => p.income_source_id === s.id).map(rowToPayment);
    const sourcePosts = (postsRes.data || []).filter(p => p.income_source_id === s.id).map(rowToPost);
    return rowToIncomeSource(s, sourcePayments, sourcePosts);
  });

  const profile: FinancialProfile = {
    initialBalance: Number(pr?.initial_balance || 0),
    incomeSources: sources,
    savingsBuckets: (bucketsRes.data || []).map(rowToSavingsBucket),
    subscriptions: (subsRes.data || []).map(rowToSubscription),
    debts: (debtsRes.data || []).map(rowToDebt),
    budgetLimits: pr?.budget_limits || {},
    quickActions: (qaRes.data || []).map(rowToQuickAction),
    monthlySalary: Number(pr?.monthly_salary || 0),
    hourlyWage: Number(pr?.hourly_wage || 0),
    events: (evRes.data || []).map(rowToEvent),
    name: pr?.name || 'Viajero',
    avatar: pr?.avatar || undefined,
    customDollarRate: pr?.custom_dollar_rate != null ? Number(pr.custom_dollar_rate) : undefined,
    customCategories: pr?.custom_categories || [],
    appOrder: pr?.app_order || undefined,
    goals: (goalsRes.data || []).map(rowToGoal),
    patrimonioHistory: (patrRes.data || []).map(rowToPatrimonio),
    inflationHistory: (inflRes.data || []).map(rowToInflation),
    historicalEstimates: (estRes.data || []).map(rowToHistoricalEstimate),
  };

  const transactions: Transaction[] = (txRes.data || []).map(rowToTransaction);
  return { profile, transactions };
};

// ===================================================================
// SAVE PROFILE: actualiza fila principal + sincroniza sub-tablas
// ===================================================================
// Estrategia: diff vs DB actual. Para cada sub-array (savings_buckets,
// income_sources, etc.) detecta INSERT/UPDATE/DELETE individual.
// Esto significa que un cambio en "name del usuario" NUNCA toca otras tablas.

const sanitizeArray = <T extends { id?: string }>(arr: T[] | undefined): T[] =>
  (arr || []).filter(x => x && typeof x === 'object');

const syncTable = async <T extends { id?: string }>(
  table: string,
  uid: string,
  newItems: T[],
  rowMapper: (uid: string, item: T, idx: number) => DBRow,
): Promise<void> => {
  // Leer ids actuales
  const { data: existing } = await supabase.from(table).select('id').eq('user_id', uid);
  const existingIds = new Set((existing || []).map(r => r.id));
  const newIds = new Set(newItems.filter(i => i.id).map(i => i.id as string));
  // Ids a borrar
  const toDelete = [...existingIds].filter(id => !newIds.has(id));
  // Upsert de todos los nuevos/actualizados
  if (newItems.length > 0) {
    const rows = newItems.map((item, idx) => {
      const row = rowMapper(uid, item, idx);
      // Si no tiene id, dejamos que Postgres genere uno con gen_random_uuid()
      if (!row.id) delete row.id;
      return row;
    });
    const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  }
  // Delete los que ya no están
  if (toDelete.length > 0) {
    const { error } = await supabase.from(table).delete().in('id', toDelete).eq('user_id', uid);
    if (error) throw error;
  }
};

export const saveProfile = async (uid: string, profile: FinancialProfile): Promise<void> => {
  // 1. Upsert profile row (campos top-level)
  const { error: profileErr } = await supabase.from('profiles').upsert({
    user_id: uid,
    name: profile.name || 'Viajero',
    avatar: profile.avatar || null,
    initial_balance: profile.initialBalance ?? 0,
    monthly_salary: profile.monthlySalary ?? 0,
    hourly_wage: profile.hourlyWage ?? 0,
    custom_dollar_rate: profile.customDollarRate ?? null,
    custom_categories: profile.customCategories ?? null,
    app_order: profile.appOrder ?? null,
    budget_limits: profile.budgetLimits ?? {},
  }, { onConflict: 'user_id' });
  if (profileErr) throw profileErr;

  // 2. Sub-tablas en paralelo
  await Promise.all([
    syncTable('savings_buckets', uid, sanitizeArray(profile.savingsBuckets), savingsBucketToRow),
    syncTable('subscriptions', uid, sanitizeArray(profile.subscriptions), subscriptionToRow),
    syncTable('debts', uid, sanitizeArray(profile.debts), debtToRow),
    syncTable('events', uid, sanitizeArray(profile.events), eventToRow),
    syncTable('goals', uid, sanitizeArray(profile.goals), goalToRow),
    syncTable('quick_actions', uid, sanitizeArray(profile.quickActions), quickActionToRow),
    syncIncomeSources(uid, sanitizeArray(profile.incomeSources)),
    syncPatrimonioHistory(uid, profile.patrimonioHistory || []),
    syncInflationHistory(uid, profile.inflationHistory || []),
    syncHistoricalEstimates(uid, profile.historicalEstimates || []),
  ]);
};

const syncIncomeSources = async (uid: string, sources: IncomeSource[]): Promise<void> => {
  await syncTable('income_sources', uid, sources, incomeSourceToRow);
  // Para cada source, sincronizar sus payments y posts
  for (const src of sources) {
    if (!src.id) continue; // skip si no tiene id todavía
    // Payments
    const payRows = (src.payments || []).map(p => paymentToRow(uid, src.id, p));
    if (payRows.length > 0) {
      const { error } = await supabase.from('income_payments').upsert(payRows, {
        onConflict: 'income_source_id,month',
      });
      if (error) throw error;
    }
    // Posts: usar el mismo helper de syncTable
    await syncTable('posts', uid,
      (src.posts || []).map(p => ({ ...p })),
      (uid, p) => postToRow(uid, src.id, p),
    );
  }
};

const syncPatrimonioHistory = async (uid: string, items: PatrimonioSnapshot[]) => {
  if (items.length === 0) return;
  const rows = items.map(i => ({
    user_id: uid, month: i.month, balance: i.balance,
    dollar_rate: i.dollarRate || null, date: i.date || new Date().toISOString(),
  }));
  const { error } = await supabase.from('patrimonio_history').upsert(rows, {
    onConflict: 'user_id,month',
  });
  if (error) throw error;
};

const syncInflationHistory = async (uid: string, items: { month: string; rate: number }[]) => {
  if (items.length === 0) return;
  const rows = items.map(i => ({ user_id: uid, month: i.month, rate: i.rate }));
  const { error } = await supabase.from('inflation_history').upsert(rows, {
    onConflict: 'user_id,month',
  });
  if (error) throw error;
};

const syncHistoricalEstimates = async (uid: string, items: HistoricalMonthEstimate[]) => {
  // Sync: insert/update lo que viene, delete los meses que ya no están
  const { data: existing } = await supabase.from('historical_estimates').select('id, month').eq('user_id', uid);
  const newMonths = new Set(items.map(i => i.month));
  const toDelete = (existing || []).filter(r => !newMonths.has(r.month)).map(r => r.id);
  if (items.length > 0) {
    const rows = items.map(i => ({
      user_id: uid, month: i.month, by_category: i.byCategory, note: i.note || null,
    }));
    const { error } = await supabase.from('historical_estimates').upsert(rows, {
      onConflict: 'user_id,month',
    });
    if (error) throw error;
  }
  if (toDelete.length > 0) {
    await supabase.from('historical_estimates').delete().in('id', toDelete).eq('user_id', uid);
  }
};

// ===================================================================
// SAVE TRANSACTIONS: sincroniza el array de transacciones a la tabla
// ===================================================================
export const saveTransactions = async (uid: string, transactions: Transaction[]): Promise<void> => {
  const cleaned = sanitizeArray(transactions);
  await syncTable('transactions', uid, cleaned, txToRow);
};

// ===================================================================
// REALTIME: suscripción a cambios para actualizar el estado React
// ===================================================================
// Cuando cualquier tabla del usuario cambia (desde otro dispositivo, edición
// externa, etc), recargamos todo y disparamos el callback.
export const subscribeToUserData = (
  uid: string,
  onUpdate: () => void,
): RealtimeChannel => {
  const channel = supabase
    .channel(`user-data-${uid}`)
    .on('postgres_changes', { event: '*', schema: 'public', filter: `user_id=eq.${uid}` }, () => {
      onUpdate();
    })
    .subscribe();
  return channel;
};

export const unsubscribe = (channel: RealtimeChannel) => {
  supabase.removeChannel(channel);
};
