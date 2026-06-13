// ─────────────────────────────────────────────────────────────
// emailService.js — Servicio de correos SRX Tech vía Resend API
// ─────────────────────────────────────────────────────────────
// Utiliza fetch() directo a la API REST de Resend para compatibilidad
// total con Vite (el SDK de Node.js no funciona en el navegador).
// ─────────────────────────────────────────────────────────────

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;
const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const REMITENTE = 'SRX Tech <diego@srxtech.com>';

/**
 * Función interna para enviar un correo vía Resend API REST.
 * @param {Object} payload - { from, to, subject, html }
 * @returns {Promise<Object>} Respuesta de Resend con el ID del envío
 */
async function enviarCorreo(payload) {
  if (!RESEND_API_KEY) {
    throw new Error(
      '🐒 ¡UH OH! Falta la variable VITE_RESEND_API_KEY en el archivo .env'
    );
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Resend API respondió con status ${response.status}: ${errorBody}`
    );
  }

  return response.json();
}

/**
 * Genera el ID corto legible de la orden (primeros 8 caracteres en mayúsculas).
 */
function getShortId(id) {
  if (!id) return 'N/A';
  return String(id).substring(0, 8).toUpperCase();
}

// ═══════════════════════════════════════════════════════════════
// 1️⃣  CORREO: PAGO VERIFICADO
// ═══════════════════════════════════════════════════════════════

/**
 * Envía el correo de confirmación de pago verificado al cliente.
 *
 * @param {string} correoCliente - Email del cliente
 * @param {string} nombreCliente - Nombre del cliente
 * @param {string} orderId       - UUID de la orden
 * @returns {Promise<Object>} Respuesta de Resend { id }
 */
export async function enviarCorreoPagoVerificado(correoCliente, nombreCliente, orderId) {
  const shortId = getShortId(orderId);

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#f0f2f5; font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5; padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header con gradiente verde -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981, #059669); padding:36px 40px; text-align:center;">
              <div style="font-size:48px; margin-bottom:8px;">✅</div>
              <h1 style="color:#ffffff; font-size:26px; margin:0; font-weight:700; letter-spacing:-0.5px;">
                ¡Pago Confirmado, ${nombreCliente}!
              </h1>
            </td>
          </tr>

          <!-- Cuerpo del correo -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 20px;">
                ¡Excelente noticia! Hemos verificado exitosamente tu pago para la orden
                <strong style="color:#059669; font-size:17px;">#${shortId}</strong>.
              </p>

              <div style="background-color:#ecfdf5; border-left:4px solid #10b981; border-radius:8px; padding:20px 24px; margin:24px 0;">
                <p style="color:#065f46; font-size:15px; margin:0; line-height:1.6;">
                  🚀 <strong>Tu equipo ha entrado en fase de preparación.</strong><br />
                  Nuestro equipo está organizando tu pedido con el mayor cuidado. Te notificaremos cuando esté listo para despacho o retiro.
                </p>
              </div>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td style="background-color:#f9fafb; border-radius:12px; padding:20px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#6b7280; font-size:13px; text-transform:uppercase; letter-spacing:1px; padding-bottom:8px;">Orden</td>
                        <td style="color:#6b7280; font-size:13px; text-transform:uppercase; letter-spacing:1px; padding-bottom:8px; text-align:right;">Estado</td>
                      </tr>
                      <tr>
                        <td style="color:#111827; font-size:18px; font-weight:700; font-family:monospace;">#${shortId}</td>
                        <td style="text-align:right;">
                          <span style="background-color:#10b981; color:#ffffff; font-size:13px; font-weight:600; padding:6px 16px; border-radius:20px;">
                            ✓ Pago Verificado
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="color:#6b7280; font-size:14px; line-height:1.6; margin:0;">
                Si tienes alguna pregunta sobre tu pedido, no dudes en contactarnos respondiendo a este correo o a través de nuestras redes sociales.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb; padding:24px 40px; text-align:center; border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af; font-size:13px; margin:0 0 4px;">
                <strong style="color:#6b7280;">SRX Tech</strong> — Tu tienda de tecnología premium
              </p>
              <p style="color:#d1d5db; font-size:12px; margin:0;">
                Guacara, Venezuela · srxtech.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return enviarCorreo({
    from: REMITENTE,
    to: [correoCliente],
    subject: '¡Tu pago ha sido verificado! 🎉 - SRX Tech',
    html,
  });
}

// ═══════════════════════════════════════════════════════════════
// 2️⃣  CORREO: PEDIDO POR ENCARGO LISTO
// ═══════════════════════════════════════════════════════════════

/**
 * Envía el correo de notificación de pedido por encargo listo al cliente.
 *
 * @param {string} correoCliente - Email del cliente
 * @param {string} nombreCliente - Nombre del cliente
 * @param {string} orderId       - UUID de la orden
 * @returns {Promise<Object>} Respuesta de Resend { id }
 */
export async function enviarCorreoPedidoListo(correoCliente, nombreCliente, orderId) {
  const shortId = getShortId(orderId);

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#f0f2f5; font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5; padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header con gradiente azul brillante -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding:36px 40px; text-align:center;">
              <div style="font-size:48px; margin-bottom:8px;">📦</div>
              <h1 style="color:#ffffff; font-size:26px; margin:0; font-weight:700; letter-spacing:-0.5px;">
                ¡Buenas noticias, ${nombreCliente}!
              </h1>
            </td>
          </tr>

          <!-- Cuerpo del correo -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 20px;">
                Tu equipo importado o pedido por encargo correspondiente a la orden
                <strong style="color:#1d4ed8; font-size:17px;">#${shortId}</strong>
                ya llegó a nuestros almacenes en <strong>Guacara</strong> y está listo.
              </p>

              <div style="background-color:#eff6ff; border-left:4px solid #3b82f6; border-radius:8px; padding:20px 24px; margin:24px 0;">
                <p style="color:#1e40af; font-size:15px; margin:0; line-height:1.6;">
                  📍 <strong>Tu pedido está disponible para retiro en nuestro punto de entrega en Guacara</strong> o para coordinación de despacho.<br /><br />
                  Contáctanos para agendar tu retiro o para coordinar el envío a tu dirección.
                </p>
              </div>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td style="background-color:#f9fafb; border-radius:12px; padding:20px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#6b7280; font-size:13px; text-transform:uppercase; letter-spacing:1px; padding-bottom:8px;">Orden</td>
                        <td style="color:#6b7280; font-size:13px; text-transform:uppercase; letter-spacing:1px; padding-bottom:8px; text-align:right;">Estado</td>
                      </tr>
                      <tr>
                        <td style="color:#111827; font-size:18px; font-weight:700; font-family:monospace;">#${shortId}</td>
                        <td style="text-align:right;">
                          <span style="background-color:#3b82f6; color:#ffffff; font-size:13px; font-weight:600; padding:6px 16px; border-radius:20px;">
                            📦 Listo para Entrega
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="color:#6b7280; font-size:14px; line-height:1.6; margin:0;">
                Estamos ansiosos de que recibas tu nuevo equipo. Contáctanos por nuestras redes sociales o responde a este correo si necesitas coordinar la entrega.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb; padding:24px 40px; text-align:center; border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af; font-size:13px; margin:0 0 4px;">
                <strong style="color:#6b7280;">SRX Tech</strong> — Tu tienda de tecnología premium
              </p>
              <p style="color:#d1d5db; font-size:12px; margin:0;">
                Guacara, Venezuela · srxtech.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return enviarCorreo({
    from: REMITENTE,
    to: [correoCliente],
    subject: '¡Tu pedido por encargo está listo! 📦 - SRX Tech',
    html,
  });
}
