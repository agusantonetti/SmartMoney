
export enum ViewState {
  LANDING = 'LANDING', // Nueva vista inicial
  DASHBOARD = 'DASHBOARD',
  TRANSACTION = 'TRANSACTION',
  ACTIVITY = 'ACTIVITY', 
  BUDGET_CONTROL = 'BUDGET_CONTROL',
  BUDGET_ADJUST = 'BUDGET_ADJUST', // Nueva vista para mover dinero
  SALARY_CALCULATOR = 'SALARY_CALCULATOR', // Nueva calculadora de sueldo/ahorro
  CURRENCY_CONVERTER = 'CURRENCY_CONVERTER', // Nueva herramienta de conversión
  SUCCESS = 'SUCCESS',
  PROFILE = 'PROFILE',
  INCOME_MANAGER = 'INCOME_MANAGER',
  SAVINGS_BUCKETS = 'SAVINGS_BUCKETS',
  SUBSCRIPTIONS = 'SUBSCRIPTIONS',
  DEBTS = 'DEBTS',
  ANALYTICS = 'ANALYTICS',
  EVENTS = 'EVENTS',
  FUTURE_SIMULATOR = 'FUTURE_SIMULATOR',
  ASSISTANT = 'ASSISTANT', // Nuevo Asistente IA
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  type: 'income' | 'expense';
  date: string;
  originalCurrency?: string; // Ej: 'USD'
  originalAmount?: number;   // Ej: 15.50
  exchangeRate?: number;     // Ej: 18.50
  eventId?: string;          // ID del evento asociado
  eventName?: string;        // Nombre snapshot del evento
}

export interface IncomePayment {
  month: string; // Formato "YYYY-MM"
  realAmount: number;
  isPaid: boolean;
  isInvoiceSent?: boolean; // NUEVO: Para saber si ya enviamos la factura
  notes?: string; // NUEVO: Nota opcional (ej: Nro Factura)
}

export type MediaType = 'TV' | 'RADIO' | 'STREAM' | 'REDACCION' | 'EVENTO' | 'OTRO';
export type IncomeType = 'FIXED' | 'MEDIA' | 'SPORADIC'; // NUEVO: Tipos de ingreso

export interface IncomeSource {
  id: string;
  name: string;
  amount: number; // Monto base estimado (Sueldo Mensual) o 0 si es eventual
  payments: IncomePayment[]; // Historial de cobros
  type?: IncomeType; // Clasificación del ingreso
  
  // ESPECIFICO PARA MEDIOS
  medium?: MediaType;
  hoursPerDay?: number;
  daysPerWeek?: number;
}

export interface SubscriptionPayment {
  month: string; // Formato "YYYY-MM"
  realAmount: number;
  isPaid: boolean;
  datePaid?: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  billingDay: number; // Día del mes (1-31)
  category: string; // streaming, services, gym, etc.
  history?: SubscriptionPayment[]; // Historial de pagos
}

export interface Debt {
  id: string;
  name: string;
  totalAmount: number; // Monto total de la deuda/impuesto
  currentAmount: number; // Monto pagado o reservado hasta ahora
  dueDate?: string; // Fecha límite opcional
}

export interface SavingsBucket {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  icon?: string;
}

// NUEVO: Definición de Evento/Viaje
export interface TravelEvent {
  id: string;
  name: string; // Ej: "Taiwán 2025"
  budget?: number; // Presupuesto total del viaje
  startDate: string;
  status: 'active' | 'completed';
  coverImage?: string; // Opcional para estética
}

// NUEVO: Atajos personalizados
export interface QuickAction {
  id: string;
  label: string; // Ej: "Uber"
  amount?: number; // Opcional. Si es 0 o null, el usuario ingresa el monto
  icon: string; // Icono de Material Symbols
}

export interface FinancialProfile {
  initialBalance: number; // Ahorros totales al inicio
  incomeSources: IncomeSource[]; // Lista de sueldos fijos
  savingsBuckets: SavingsBucket[]; // Apartados/Sobres de ahorro
  subscriptions: Subscription[]; // Gastos fijos recurrentes
  debts: Debt[]; // Deudas o Impuestos pendientes
  budgetLimits?: Record<string, number>; // Límites por categoría
  quickActions?: QuickAction[]; // Lista de atajos personalizados
  name?: string;
  avatar?: string; // URL del avatar seleccionado
  monthlySalary?: number; 
  hourlyWage?: number; // Valor de la hora de trabajo
  events?: TravelEvent[]; // Lista de viajes/eventos
  customDollarRate?: number; // NUEVO: Valor del dólar manual preferido
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