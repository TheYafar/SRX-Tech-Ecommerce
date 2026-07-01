import { supabase } from '../utils/supabaseClient';

/**
 * Identifica si un error es de conectividad de red y arroja un mensaje amigable,
 * de lo contrario arroja el error original con contexto.
 * 
 * @param {Error|object} error - El error capturado
 * @param {string} defaultMessage - Mensaje por defecto si no es de red
 */
function handleServiceError(error, defaultMessage) {
  console.error('[CouponService Error]', error);

  // Detección robusta de errores de red / conectividad
  const isNetworkError =
    (typeof window !== 'undefined' && window.navigator && !window.navigator.onLine) ||
    (error instanceof TypeError && error.message.includes('Failed to fetch')) ||
    (error.message && (
      error.message.includes('net::ERR_NAME_NOT_RESOLVED') ||
      error.message.includes('net::ERR_CONNECTION_REFUSED') ||
      error.message.includes('net::ERR_INTERNET_DISCONNECTED') ||
      error.message.includes('TypeError: Failed to fetch') ||
      error.message.includes('NetworkError') ||
      error.message.includes('fetch')
    )) ||
    error.status === 0;

  if (isNetworkError) {
    throw new Error('No se pudo conectar con el servidor de Supabase. Por favor, verifica tu conexión a internet e inténtalo de nuevo.');
  }

  throw new Error(error.message || defaultMessage);
}

/**
 * Obtiene los correos electrónicos de todos los usuarios registrados en el sistema.
 * 
 * @returns {Promise<string[]>} Lista de correos filtrados y limpios.
 */
export async function getAllUserEmails() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email');

    if (error) {
      throw error;
    }

    if (!data) return [];

    return data
      .map(u => u.email)
      .filter(email => typeof email === 'string' && email.trim() !== '');
  } catch (error) {
    handleServiceError(error, 'Error al obtener la lista de correos de usuarios.');
  }
}

/**
 * Registra o actualiza un cupón de descuento en la base de datos de Supabase.
 * El cupón tiene una vigencia por defecto de 30 días.
 * 
 * @param {string} code - Código único del cupón.
 * @param {number|string} percent - Porcentaje de descuento.
 * @returns {Promise<{success: boolean}>}
 */
export async function createNewCouponInDB(code, percent) {
  try {
    const cleanCode = code.trim().toUpperCase();
    const discountPercent = parseInt(percent, 10) || 10;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 días de vigencia

    const { error } = await supabase
      .from('coupons')
      .upsert([{
        code: cleanCode,
        discount_percent: discountPercent,
        is_active: true,
        expires_at: expiresAt.toISOString()
      }], { onConflict: 'code' });

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    handleServiceError(error, 'Error al registrar el cupón en la base de datos.');
  }
}

/**
 * Invoca la Edge Function send-mass-coupon para enviar la campaña de correos electrónicos.
 * 
 * @param {string} code - Código del cupón a enviar.
 * @param {number|string} percent - Porcentaje de descuento asociado.
 * @param {string[]} emails - Lista de correos destinatarios.
 * @returns {Promise<object>} Respuesta de la Edge Function.
 */
export async function dispatchMassCampaign(code, percent, emails) {
  try {
    const cleanCode = code.trim().toUpperCase();
    const discountPercent = parseInt(percent, 10) || 10;

    const { data, error } = await supabase.functions.invoke('send-mass-coupon', {
      body: { 
        listaCorreos: emails,
        codigo: cleanCode, 
        porcentaje: discountPercent 
      }
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    handleServiceError(error, 'Error al enviar la campaña de cupones por correo.');
  }
}
