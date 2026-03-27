
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

// ============================================================
// CATEGORÍAS
// ============================================================

export interface CategoryDef {
  name: string;
  icon: string;
  keywords: string[];
}

/** Categorías predefinidas con palabras clave para clasificación automática */
export const DEFAULT_CATEGORIES: CategoryDef[] = [
  { name: 'Comida', icon: 'restaurant', keywords: ['comida', 'cena', 'almuerzo', 'desayuno', 'burger', 'pizza', 'sushi', 'restaurant', 'restaurante', 'merienda', 'snack', 'delivery', 'rappi', 'pedidosya', 'empanada', 'milanesa', 'asado', 'parrilla', 'hamburgues', 'panchos', 'pancho', 'helado', 'heladería', 'heladeria', 'pollo', 'ensalada', 'sandwich', 'tostado', 'medialunas', 'facturas', 'rotisería', 'rotiseria', 'sándwich', 'lomito', 'morfi', 'guiso', 'pasta', 'ravioles', 'ñoquis', 'wok', 'poke', 'bowl', 'wrap', 'comedor', 'cantina', 'buffet', 'brunch', 'cenas', 'kiosco', 'golosina', 'galletitas', 'alfajor', 'chocolate'] },
  { name: 'Café', icon: 'coffee', keywords: ['cafe', 'café', 'starbucks', 'cafetería', 'cafeteria', 'cappuccino', 'latte', 'cortado', 'espresso', 'te ', 'té ', 'infusión', 'infusion', 'jugo', 'batido', 'smoothie'] },
  { name: 'Supermercado', icon: 'shopping_cart', keywords: ['super', 'supermercado', 'mercado', 'coto', 'carrefour', 'dia', 'jumbo', 'chango', 'despensa', 'verdulería', 'verduleria', 'carnicería', 'carniceria', 'fiambrería', 'fiambreria', 'almacén', 'almacen', 'vea', 'disco', 'walmart', 'changomas'] },
  { name: 'Transporte', icon: 'directions_car', keywords: ['uber', 'cabify', 'taxi', 'nafta', 'combustible', 'tren', 'sube', 'colectivo', 'bondi', 'subte', 'estacionamiento', 'peaje', 'gasolina', 'gnc', 'remis', 'didi', 'beat', 'pasaje', 'pasajes', 'micro', 'ómnibus', 'omnibus', 'avión', 'avion', 'vuelo', 'aerolínea', 'aerolinea', 'aeroparque', 'ezeiza', 'flybondi', 'jetsmart', 'aerolíneas', 'aerolineas', 'buquebus'] },
  { name: 'Hogar', icon: 'home', keywords: ['alquiler', 'luz', 'gas', 'internet', 'wifi', 'agua', 'expensas', 'ABL', 'abl', 'limpieza', 'mueble', 'deco', 'electrodoméstico', 'electrodomestico', 'renta', 'depto', 'departamento', 'casa', 'mudanza', 'pintura', 'arreglo', 'plomero', 'electricista', 'inmobiliaria', 'garantía', 'garantia', 'condominio'] },
  { name: 'Salud', icon: 'favorite', keywords: ['farmacia', 'médico', 'medico', 'doctor', 'hospital', 'clínica', 'clinica', 'dentista', 'óptica', 'optica', 'lentes', 'prepaga', 'obra social', 'turno', 'análisis', 'analisis', 'medicamento', 'remedio', 'psicólogo', 'psicologo', 'terapia', 'nutricionista', 'traumatólogo', 'traumatologo', 'dermatólogo', 'dermatologo', 'oftalmólogo', 'oftalmologo', 'kinesiología', 'kinesiologia', 'vacuna', 'cirugía', 'cirugia', 'guardia', 'emergencia', 'ambulancia'] },
  { name: 'Entretenimiento', icon: 'movie', keywords: ['cine', 'netflix', 'spotify', 'disney', 'hbo', 'youtube', 'juego', 'gaming', 'play', 'steam', 'ps', 'xbox', 'salida', 'boliche', 'bar', 'cerveza', 'birra', 'teatro', 'recital', 'concierto', 'museo', 'parque', 'diversión', 'diversion', 'escape room', 'bowling', 'karaoke', 'billar', 'arcade', 'fútbol', 'futbol', 'cancha', 'paddle', 'padel', 'pileta', 'club', 'after', 'previa', 'joda', 'trago', 'drink', 'vino', 'fernet', 'bebida'] },
  { name: 'Fiestas y Eventos', icon: 'celebration', keywords: ['fiesta', 'fiestas', 'evento', 'eventos', 'cumpleaños', 'cumple', 'casamiento', 'boda', 'bautismo', 'comunión', 'comunion', '15 años', 'quince', 'graduación', 'graduacion', 'despedida', 'celebración', 'celebracion', 'brindis', 'cotillón', 'cotillon', 'decoración', 'decoracion', 'catering', 'DJ', 'dj', 'salón', 'salon', 'quincho', 'reunión', 'reunion', 'asado amigos'] },
  { name: 'Ropa', icon: 'checkroom', keywords: ['ropa', 'zapatillas', 'zapatos', 'remera', 'pantalón', 'pantalon', 'campera', 'jean', 'buzo', 'vestido', 'zara', 'nike', 'adidas', 'tienda', 'calzado', 'bota', 'ojotas', 'bermuda', 'short', 'gorra', 'mochila', 'cartera', 'bolso', 'lentes de sol', 'reloj', 'accesorio', 'bijou', 'peluquería', 'peluqueria', 'barbería', 'barberia', 'corte', 'tintura'] },
  { name: 'Educación', icon: 'school', keywords: ['universidad', 'facultad', 'curso', 'clase', 'libro', 'cuaderno', 'udemy', 'platzi', 'educación', 'educacion', 'colegio', 'escuela', 'matrícula', 'matricula', 'apunte', 'taller', 'workshop', 'seminario', 'certificación', 'certificacion', 'capacitación', 'capacitacion', 'idioma', 'inglés', 'ingles', 'instituto', 'beca', 'examen'] },
  { name: 'Servicios', icon: 'build', keywords: ['celular', 'teléfono', 'telefono', 'plan', 'personal', 'claro', 'movistar', 'seguro', 'impuesto', 'monotributo', 'contador', 'abogado', 'trámite', 'tramite', 'escribano', 'gestoría', 'gestoria', 'patente', 'VTV', 'vtv', 'registro', 'DNI', 'dni', 'pasaporte', 'visa', 'comisión', 'comision', 'mantenimiento', 'técnico', 'tecnico'] },
  { name: 'Suscripciones', icon: 'subscriptions', keywords: ['suscripción', 'suscripcion', 'membresía', 'membresia', 'premium', 'pro', 'plus', 'mensual', 'anual', 'renovación', 'renovacion', 'chatgpt', 'claude', 'notion', 'canva', 'amazon prime', 'apple', 'icloud', 'google one', 'crunchyroll', 'twitch', 'patreon', 'github'] },
  { name: 'Regalos', icon: 'redeem', keywords: ['regalo', 'presente', 'sorpresa', 'obsequio', 'navidad', 'amigo invisible', 'día del padre', 'día de la madre', 'san valentín', 'san valentin', 'souvenir'] },
  { name: 'Viajes', icon: 'flight', keywords: ['hotel', 'hostel', 'airbnb', 'booking', 'viaje', 'vacaciones', 'excursión', 'excursion', 'valija', 'turismo', 'tour', 'guía', 'guia', 'mapa', 'seguro viajero', 'aeropuerto', 'terminal', 'camping', 'cabaña', 'cabana', 'resort'] },
  { name: 'Mascotas', icon: 'pets', keywords: ['veterinario', 'vet', 'mascota', 'perro', 'gato', 'alimento mascota', 'pipeta', 'collar', 'correa', 'pecera', 'pez', 'antiparasitario'] },
  { name: 'Trabajo', icon: 'work', keywords: ['oficina', 'cowork', 'coworking', 'herramienta', 'software', 'hosting', 'dominio', 'freelance', 'impresora', 'tinta', 'escritorio', 'silla', 'monitor', 'teclado', 'mouse', 'notebook', 'computadora', 'pc', 'webcam', 'auriculares'] },
  { name: 'Transferencia', icon: 'swap_horiz', keywords: ['transferencia', 'transferí', 'transferi', 'envié', 'envie', 'presté', 'preste', 'préstamo', 'prestamo', 'devolución', 'devolucion', 'mandé', 'mande', 'giré', 'gire', 'mercadopago', 'mp'] },
  { name: 'Compras', icon: 'shopping_bag', keywords: ['compra', 'compras', 'shopping', 'online', 'mercadolibre', 'amazon', 'shein', 'temu', 'aliexpress', 'pedido', 'encargo', 'envío', 'envio'] },
  { name: 'Otros', icon: 'category', keywords: [] },
];

/** Obtiene todas las categorías disponibles: predefinidas + custom del usuario */
export const getAllCategories = (customCategories?: string[]): string[] => {
  const predefined = DEFAULT_CATEGORIES.map(c => c.name);
  const custom = customCategories || [];
  return [...new Set([...predefined, ...custom])];
};

/** Obtiene el ícono de una categoría */
export const getCategoryIcon = (categoryName: string): string => {
  const found = DEFAULT_CATEGORIES.find(c => c.name === categoryName);
  return found?.icon || 'category';
};

/** Clasifica automáticamente un texto en una categoría */
export const guessCategory = (text: string, type: 'income' | 'expense'): string => {
  if (type === 'income') return 'Ingreso';
  const lower = text.toLowerCase();
  
  for (const cat of DEFAULT_CATEGORIES) {
    if (cat.keywords.some(kw => lower.includes(kw))) {
      return cat.name;
    }
  }
  
  return 'Otros';
};

/** Intenta reclasificar una transacción que está en "Otros" usando las keywords expandidas */
export const tryReclassify = (description: string): string | null => {
  const lower = description.toLowerCase();
  for (const cat of DEFAULT_CATEGORIES) {
    if (cat.name === 'Otros') continue;
    if (cat.keywords.some(kw => lower.includes(kw))) {
      return cat.name;
    }
  }
  return null;
};

// ============================================================
// MESES Y FECHAS
// ============================================================

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/** Retorna "Marzo 2026" desde un key "2026-03" */
export const formatMonthKey = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  const monthIndex = parseInt(month, 10) - 1;
  return `${MONTH_NAMES[monthIndex]} ${year}`;
};

/** Retorna el monthKey actual, ej: "2026-03" */
export const getCurrentMonthKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** Retorna el monthKey anterior dado uno, ej: "2026-03" → "2026-02" */
export const getPrevMonthKey = (monthKey: string): string => {
  const [year, month] = monthKey.split('-').map(Number);
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** Retorna el monthKey siguiente dado uno, ej: "2026-03" → "2026-04" */
export const getNextMonthKey = (monthKey: string): string => {
  const [year, month] = monthKey.split('-').map(Number);
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
