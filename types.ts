
export enum ViewState {
  LANDING = 'LANDING',
  DASHBOARD = 'DASHBOARD',
  TRANSACTION = 'TRANSACTION',
  ACTIVITY = 'ACTIVITY', 
  BUDGET_CONTROL = 'BUDGET_CONTROL',
  BUDGET_ADJUST = 'BUDGET_ADJUST',
  SALARY_CALCULATOR = 'SALARY_CALCULATOR',
  CURRENCY_CONVERTER = 'CURRENCY_CONVERTER',
  WEALTH_LEVELS = 'WEALTH_LEVELS',
  ACHIEVEMENTS = 'ACHIEVEMENTS',
  SUCCESS = 'SUCCESS',
  PROFILE = 'PROFILE',
  INCOME_MANAGER = 'INCOME_MANAGER',
  SAVINGS_BUCKETS = 'SAVINGS_BUCKETS',
  SUBSCRIPTIONS = 'SUBSCRIPTIONS',
  DEBTS = 'DEBTS',
  ANALYTICS = 'ANALYTICS',
  EVENTS = 'EVENTS',
  FUTURE_SIMULATOR = 'FUTURE_SIMULATOR',
  ASSISTANT = 'ASSISTANT',
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  type: 'income' | 'expense';
  date: string;
  originalCurrency?: string;
  originalAmount?: number;
  exchangeRate?: number;
  eventId?: string;
  eventName?: string;
}

export interface IncomePayment {
  month: string; // Formato "YYYY-MM" o "YYYY-MM-Q1" para quincenas
  realAmount: number;
  isPaid: boolean;
  isInvoiceSent?: boolean;
  notes?: string;
  metrics?: {
    impressions?: number; 
    rpm?: number; 
  };
}

export type MediaType = 'TV' | 'RADIO' | 'STREAM' | 'REDACCION' | 'EVENTO' | 'OTRO';
export type IncomeType = 'FIXED' | 'MEDIA' | 'SPORADIC'; 

export type PaymentFrequency = 'MONTHLY' | 'BIWEEKLY' | 'ONE_TIME';

export interface IncomeSource {
  id: string;
  name: string;
  amount: number; 
  payments: IncomePayment[];
  type?: IncomeType;
  frequency?: PaymentFrequency; 
  startDate?: string; 
  endDate?: string; 
  isActive?: boolean; 
  isCreatorSource?: boolean;
  medium?: MediaType;
  hoursPerDay?: number;
  daysPerWeek?: number;
}

export interface SubscriptionPayment {
  month: string;
  realAmount: number;
  isPaid: boolean;
  datePaid?: string;
  transactionId?: string; // NUEVO: ID de la transacción generada automáticamente
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  billingDay: number;
  category: string;
  history?: SubscriptionPayment[];
  frequency?: 'MONTHLY' | 'YEARLY'; 
  nextPaymentDate?: string;
}

export interface Debt {
  id: string;
  name: string;
  totalAmount: number;
  currentAmount: number;
  dueDate?: string;
}

export interface SavingsBucket {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  icon?: string;
}

export interface TravelEvent {
  id: string;
  name: string;
  budget?: number;
  startDate: string;
  status: 'active' | 'completed';
  coverImage?: string;
}

export interface QuickAction {
  id: string;
  label: string;
  amount?: number;
  icon: string;
}

export interface FinancialProfile {
  initialBalance: number;
  incomeSources: IncomeSource[];
  savingsBuckets: SavingsBucket[];
  subscriptions: Subscription[];
  debts: Debt[];
  budgetLimits?: Record<string, number>;
  quickActions?: QuickAction[];
  name?: string;
  avatar?: string;
  monthlySalary?: number; 
  hourlyWage?: number;
  events?: TravelEvent[];
  customDollarRate?: number;
}

export interface FinancialMetrics {
  income: number;
  expense: number;
  balance: number;
  salaryPaid: number;
  runway: number;
  healthScore: number;
  totalReserved: number;
  fixedExpenses: number;
  totalDebt: number;
}

export interface NavItemProps {
  label: string;
  view: ViewState;
  isActive: boolean;
  onClick: (view: ViewState) => void;
  icon: string;
}
