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

/**
 * Valida un cupón de descuento según sus límites globales y límites por usuario.
 * 
 * @param {string} code - Código del cupón.
 * @param {string|null} userId - ID del usuario autenticado actual.
 * @returns {Promise<{success: boolean, coupon?: object, message?: string}>}
 */
export async function checkAndValidateCoupon(code, userId) {
  try {
    const cleanCode = code.trim().toUpperCase();

    // 1. Obtener datos del cupón
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', cleanCode)
      .eq('is_active', true)
      .single();

    if (error || !coupon) {
      return { success: false, message: 'Cupón inválido o inactivo' };
    }

    // 2. Comprobar expiración
    const now = new Date();
    if (coupon.expires_at && now > new Date(coupon.expires_at)) {
      return { success: false, message: 'El cupón ha expirado' };
    }

    // 3. Comprobar Límite Global (used_count >= max_uses)
    const maxUses = coupon.max_uses !== null && coupon.max_uses !== undefined ? coupon.max_uses : (cleanCode === 'SRXTECH10' ? 10 : null);
    if (maxUses !== null && (coupon.used_count || 0) >= maxUses) {
      return { success: false, message: 'Este cupón ya alcanzó su límite máximo de canjes.' };
    }

    // 4. Comprobar Límite por Usuario (solo si es SRXTECH10 o si tiene restricción de un solo uso por usuario)
    const isSingleUse = coupon.is_single_use || cleanCode === 'SRXTECH10';
    if (isSingleUse) {
      if (!userId) {
        return { success: false, message: 'Debes iniciar sesión para usar este cupón.' };
      }

      const { data: usageData, error: usageError } = await supabase
        .from('coupon_usages')
        .select('*')
        .eq('user_id', userId)
        .eq('coupon_id', Number(coupon.id));

      if (usageError) {
        console.error('Error fetching coupon usages:', usageError);
      }

      if (usageData && usageData.length > 0) {
        return { success: false, message: 'Ya has utilizado este cupón anteriormente.' };
      }
    }

    // 5. Validar que el porcentaje de descuento sea mayor a 0
    const percent = coupon.discount_percent || coupon.discount_percentage || coupon.discount || 0;
    if (percent <= 0) {
      return { success: false, message: 'Cupón con valor de descuento inválido' };
    }

    return { success: true, coupon };
  } catch (error) {
    console.error('Error en checkAndValidateCoupon:', error);
    return { success: false, message: 'Error al validar cupón en el servidor' };
  }
}

/**
 * Registra el consumo de un cupón incrementando used_count e insertando en coupon_usages.
 * 
 * @param {string|number} couponId - ID del cupón.
 * @param {string|null} userId - ID del usuario comprador.
 * @returns {Promise<{success: boolean}>}
 */
export async function registerCouponUsage(couponId, userId) {
  try {
    // 1. Insertar en coupon_usages si hay un usuario autenticado
    if (userId) {
      const { error: usageError } = await supabase
        .from('coupon_usages')
        .insert([{
          user_id: userId,
          coupon_id: Number(couponId)
        }]);

      if (usageError) {
        if (usageError.code === '23505') {
          throw new Error('Ya has utilizado este cupón anteriormente.');
        }
        throw usageError;
      }
    }

    // 2. Incrementar used_count en coupons
    const { data: coupon, error: getError } = await supabase
      .from('coupons')
      .select('used_count, max_uses')
      .eq('id', Number(couponId))
      .single();

    if (getError) throw getError;

    const maxUses = coupon.max_uses !== null && coupon.max_uses !== undefined ? coupon.max_uses : null;
    if (maxUses !== null && coupon.used_count >= maxUses) {
      throw new Error('Este cupón ya alcanzó su límite máximo de canjes.');
    }

    const newUsedCount = (coupon.used_count || 0) + 1;
    const { error: updateError } = await supabase
      .from('coupons')
      .update({ used_count: newUsedCount })
      .eq('id', Number(couponId));

    if (updateError) throw updateError;

    return { success: true };
  } catch (error) {
    console.error('Error en registerCouponUsage:', error);
    throw error;
  }
}
