// ─────────────────────────────────────────────────────────────
// emailService.js — Servicio de correos SRX Tech
// ─────────────────────────────────────────────────────────────
// Redirecciona todos los envíos de correos a la función serverless
// local en /api/send-email para proteger la llave privada de Resend.
// ─────────────────────────────────────────────────────────────

/**
 * Envía el correo de confirmación de pago verificado al cliente.
 *
 * @param {string} correoCliente - Email del cliente
 * @param {string} nombreCliente - Nombre del cliente
 * @param {string} orderId       - UUID de la orden
 * @returns {Promise<Object>} Respuesta { success: true, data } o lanza un error
 */
export async function enviarCorreoPagoVerificado(correoCliente, nombreCliente, orderId) {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'payment-verified',
        email: correoCliente,
        customerName: nombreCliente,
        orderId: orderId,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Error en función serverless (Status ${response.status})`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error(`[emailService:enviarCorreoPagoVerificado] Error al enviar correo a ${correoCliente}:`, error);
    throw error;
  }
}

/**
 * Envía el correo de notificación de pedido por encargo listo al cliente.
 *
 * @param {string} correoCliente - Email del cliente
 * @param {string} nombreCliente - Nombre del cliente
 * @param {string} orderId       - UUID de la orden
 * @returns {Promise<Object>} Respuesta { success: true, data } o lanza un error
 */
export async function enviarCorreoPedidoListo(correoCliente, nombreCliente, orderId) {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'order-ready',
        email: correoCliente,
        customerName: nombreCliente,
        orderId: orderId,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Error en función serverless (Status ${response.status})`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error(`[emailService:enviarCorreoPedidoListo] Error al enviar correo a ${correoCliente}:`, error);
    throw error;
  }
}

/**
 * Envía un correo con un código de cupón de descuento al usuario.
 *
 * @param {string} userEmail        - Email del destinatario
 * @param {string} couponCode       - Código del cupón (Ej: BIENVENIDA10)
 * @param {number} discountPercent  - Porcentaje de descuento (Ej: 10)
 * @returns {Promise<Object>} Respuesta { success: true, data } o { success: false, error }
 */
export async function sendCouponEmail(userEmail, couponCode, discountPercent) {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'welcome-coupon',
        email: userEmail,
        couponCode: couponCode,
        discount: discountPercent,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Error en función serverless (Status ${response.status})`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error(`[emailService:sendCouponEmail] Error al enviar correo de cupón a ${userEmail}:`, error);
    return { success: false, error: error.message || error };
  }
}
