import { Resend } from 'resend';

function getShortId(id) {
  if (!id) return 'N/A';
  return String(id).substring(0, 8).toUpperCase();
}

export default async function handler(req, res) {
  // Verificación de Método: Solo aceptar peticiones de tipo POST.
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { action = 'welcome-coupon', email, couponCode, discount, customerName, orderId } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Falta el parámetro obligatorio: email.' });
  }

  try {
    // Integración con Resend: Inicializar consumiendo process.env.RESEND_API_KEY
    const apiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('Falta la variable de entorno RESEND_API_KEY en el servidor.');
    }

    const resend = new Resend(apiKey);
    const REMITENTE = 'SRX Tech <diego@srxtech.com>';
    let subject = '';
    let html = '';

    if (action === 'welcome-coupon') {
      if (!couponCode || !discount) {
        return res.status(400).json({ error: 'Faltan parámetros obligatorios para welcome-coupon: couponCode o discount.' });
      }

      subject = '¡Tu regalo de bienvenida en SRX Tech está listo!';
      html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #f3f4f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0f19; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #111827; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5); border: 1px solid #1f2937;">
          
          <!-- Header con gradiente premium -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase;">
                SRX TECH
              </h1>
              <p style="color: #e0e7ff; font-size: 16px; margin: 8px 0 0; font-weight: 500;">
                ¡Tu pasaporte al siguiente nivel tecnológico!
              </p>
            </td>
          </tr>

          <!-- Cuerpo del correo -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #ffffff; font-size: 22px; margin-top: 0; margin-bottom: 16px; font-weight: 700; text-align: center;">
                ¡Bienvenido a la Comunidad SRX!
              </h2>
              <p style="color: #9ca3af; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
                Queremos premiar tu interés en nuestra tecnología premium. Por eso, te obsequiamos un cupón de descuento especial para tu próxima compra en nuestra plataforma.
              </p>

              <!-- Tarjeta de Cupón -->
              <div style="background: linear-gradient(135deg, #1e293b, #0f172a); border: 2px dashed #4b5563; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
                <span style="display: block; font-size: 14px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
                  Tu código de descuento
                </span>
                <span style="display: block; font-size: 36px; font-weight: 800; letter-spacing: 4px; color: #fbbf24; margin-bottom: 12px; font-family: monospace;">
                  ${couponCode}
                </span>
                <span style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 16px; font-weight: 700; padding: 8px 20px; border-radius: 9999px;">
                  ${discount}% de DESCUENTO
                </span>
              </div>

              <p style="color: #9ca3af; font-size: 15px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
                Utiliza este código al finalizar tu orden para aplicar el descuento automáticamente. ¡No dejes pasar esta oportunidad!
              </p>

              <div style="text-align: center; margin-top: 32px;">
                <a href="https://srxtech.com" style="background-color: #3b82f6; color: #ffffff; padding: 14px 28px; font-weight: 700; font-size: 16px; border-radius: 8px; text-decoration: none; display: inline-block;">
                  Visitar la Tienda
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 40px; text-align: center; border-top: 1px solid #1f2937;">
              <p style="color: #6b7280; font-size: 13px; margin: 0 0 4px; font-weight: 600;">
                SRX Tech — Equipos y accesorios de alta gama
              </p>
              <p style="color: #4b5563; font-size: 12px; margin: 0;">
                Guacara, Venezuela · srxtech.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;
    } else if (action === 'payment-verified') {
      if (!customerName || !orderId) {
        return res.status(400).json({ error: 'Faltan parámetros obligatorios para payment-verified: customerName o orderId.' });
      }

      const shortId = getShortId(orderId);
      subject = '¡Tu pago ha sido verificado! - SRX Tech';
      html = `
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
              <div style="margin: 0 auto 16px; width: 64px; height: 64px; line-height: 64px; background-color: #ffffff; border-radius: 50%; display: inline-block; text-align: center;">
                <span style="color: #10b981; font-size: 32px; font-weight: bold; font-family: sans-serif;">✓</span>
              </div>
              <h1 style="color:#ffffff; font-size:26px; margin:0; font-weight:700; letter-spacing:-0.5px;">
                ¡Pago Confirmado, ${customerName}!
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
                  <strong>Tu equipo ha entrado en fase de preparación.</strong><br />
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
</html>
      `;
    } else if (action === 'order-ready') {
      if (!customerName || !orderId) {
        return res.status(400).json({ error: 'Faltan parámetros obligatorios para order-ready: customerName o orderId.' });
      }

      const shortId = getShortId(orderId);
      subject = '¡Tu pedido por encargo está listo! - SRX Tech';
      html = `
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
              <div style="margin: 0 auto 16px; width: 64px; height: 64px; line-height: 64px; background-color: #ffffff; border-radius: 50%; display: inline-block; text-align: center;">
                <span style="color: #3b82f6; font-size: 32px; font-weight: bold; font-family: sans-serif;">✓</span>
              </div>
              <h1 style="color:#ffffff; font-size:26px; margin:0; font-weight:700; letter-spacing:-0.5px;">
                ¡Buenas noticias, ${customerName}!
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
                  <strong>Tu pedido está disponible para retiro en nuestro punto de entrega en Guacara</strong> o para coordinación de despacho.<br /><br />
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
                            Listo para Entrega
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
</html>
      `;
    } else {
      return res.status(400).json({ error: `Acción no soportada: ${action}` });
    }

    // Envío de Correo
    const { data, error } = await resend.emails.send({
      from: REMITENTE,
      to: [email],
      subject,
      html,
    });

    if (error) {
      throw error;
    }

    // Respuesta exitosa (estatus 200)
    return res.status(200).json({ success: true, data });
  } catch (error) {
    // Manejo de Errores: Devolver status 500 con el detalle sin tumbar el servidor
    console.error('Error en send-email serverless function:', error);
    return res.status(500).json({ success: false, error: error.message || error });
  }
}
