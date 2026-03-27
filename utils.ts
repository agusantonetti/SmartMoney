
import { FinancialProfile } from './types';

// ============================================================
// CONSTANTES
// ============================================================

export const DEFAULT_DOLLAR_RATE = 1130;

// ============================================================
// FORMATEO DE MONEDA
// ============================================================

/** Formatea un número como moneda ARS (ej: $1.500.000) */
export const formatMoney = (amount: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
};

/** Formatea un número como moneda USD (ej: $1,500) */
export const formatMoneyUSD = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};

/** Alias de formatMoneyUSD para compatibilidad con componentes que usan "formatUSD" */
export const formatUSD = formatMoneyUSD;

/** Formatea dinámicamente según el código de moneda (ARS o USD) */
export const formatCurrency = (amount: number, currencyCode: string = 'ARS'): string => {
  return new Intl.NumberFormat(currencyCode === 'ARS' ? 'es-AR' : 'en-US', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
};

// ============================================================
// UTILIDADES NUMÉRICAS
// ============================================================

/** Retorna 0 si el valor es NaN, Infinity, o undefined */
export const safeNum = (n: number): number => {
  return isNaN(n) || !isFinite(n) ? 0 : n;
};

/** Obtiene el tipo de cambio del dólar desde el perfil, con fallback al default */
export const getDollarRate = (profile: FinancialProfile): number => {
  return profile.customDollarRate || DEFAULT_DOLLAR_RATE;
};

// ============================================================
// MANEJO DE ERRORES FIREBASE
// ============================================================

/** Traduce códigos de error de Firebase a mensajes amigables en español */
export const getFriendlyErrorMessage = (error: any): string => {
  const code = error?.code || '';
  const message = error?.message || '';

  if (code.includes('unavailable') || message.includes('offline')) {
    return 'Sin conexión. Los cambios se guardarán al recuperar internet.';
  }
  if (code.includes('permission-denied')) {
    return 'No tienes permisos para realizar esta acción.';
  }
  if (code.includes('resource-exhausted')) {
    return 'Límite de cuota excedido. Intenta más tarde.';
  }
  if (code.includes('cancelled')) {
    return 'La operación fue cancelada.';
  }
  if (code.includes('unauthenticated')) {
    return 'Tu sesión ha expirado. Por favor ingresa nuevamente.';
  }
  if (code.includes('network-request-failed')) {
    return 'Error de red. Verifica tu conexión.';
  }

  return 'Ocurrió un error inesperado. Intenta nuevamente.';
};

// ============================================================
// SANITIZACIÓN DE DATOS PARA FIRESTORE
// ============================================================

/** Elimina valores 'undefined' que causan error en Firestore */
export const sanitizeForFirestore = (data: any): any => {
  return JSON.parse(JSON.stringify(data));
};
