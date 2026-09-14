<?php
// ═══════════════════════════════════════════════════════════════════════════════
//  backend/send-purchase-success-email.php
//  Recibe datos de una compra exitosa y envía un correo detallado de confirmación
//  de compra con diseño premium usando la API de Resend.
// ═══════════════════════════════════════════════════════════════════════════════

if (file_exists(__DIR__ . '/env_loader.php')) {
    require_once __DIR__ . '/env_loader.php';
}

if (function_exists('set_cors_headers')) {
    set_cors_headers("POST, OPTIONS");
} else {
    $allowed_origins = ['http://localhost:5173', 'https://srxtech.net', 'https://TheYafar.github.io'];
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    if (in_array($origin, $allowed_origins, true)) {
        header("Access-Control-Allow-Origin: " . $origin);
    } else {
        header("Access-Control-Allow-Origin: https://srxtech.net");
    }
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, apikey, X-Requested-With");
    header("Access-Control-Allow-Credentials: true");
    header("Content-Type: application/json; charset=UTF-8");
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit(0);
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Método no permitido. Solo se acepta POST."]);
    exit;
}

// 2. Leer Body JSON
$rawBody = file_get_contents("php://input");
$data = json_decode($rawBody, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Cuerpo de solicitud JSON inválido."]);
    exit;
}

// 3. Extraer Parámetros
$customer_email   = isset($data['customer_email'])   ? trim($data['customer_email'])   : '';
$customer_name    = isset($data['customer_name'])    ? trim($data['customer_name'])    : 'Cliente';
$customer_phone   = isset($data['customer_phone'])   ? trim($data['customer_phone'])   : '';
$order_ref        = isset($data['order_ref'])        ? trim($data['order_ref'])        : '';
$order_type       = isset($data['order_type'])       ? trim($data['order_type'])       : 'contado';
$payment_method   = isset($data['payment_method'])   ? trim($data['payment_method'])   : '';
$reference_number = isset($data['reference_number']) ? trim($data['reference_number']) : 'N/A';
$items            = isset($data['items'])            ? $data['items']                  : [];
$subtotal         = isset($data['subtotal'])         ? (float)$data['subtotal']        : 0.0;
$discount_percent = isset($data['discount_percent']) ? (int)$data['discount_percent']  : 0;
$discount_amount  = isset($data['discount_amount'])  ? (float)$data['discount_amount']  : 0.0;
$total            = isset($data['total'])            ? (float)$data['total']            : 0.0;

if (empty($customer_email) || !filter_var($customer_email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "El correo electrónico del cliente es obligatorio y debe ser válido."]);
    exit;
}

// 4. Cargar Clave de Resend de forma segura
$resend_key = function_exists('get_backend_env') 
    ? get_backend_env('RESEND_API_KEY') 
    : (getenv('RESEND_API_KEY') ?: '');

if (empty($resend_key)) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Configuración incompleta: RESEND_API_KEY no encontrada en el servidor."]);
    exit;
}

// 5. Constantes de la plantilla HTML
$storeUrl = 'https://srxtech.net';
$logoUrl  = 'https://srxtech.net/Renovacion_logo_SRX_1a_2.png';

// 6. Generar filas de productos en HTML
$itemsHtml = '';
foreach ($items as $item) {
    $name  = isset($item['name']) ? htmlspecialchars($item['name']) : 'Producto';
    $qty   = isset($item['quantity']) ? (int)$item['quantity'] : 1;
    $price = isset($item['price']) ? (float)$item['price'] : 0.0;
    $itemTotal = $price * $qty;
    
    $itemsHtml .= '
    <tr style="border-bottom: 1px solid #1e293b;">
        <td style="padding: 12px 8px; color: #f1f5f9; font-size: 14px;">' . $name . '</td>
        <td align="center" style="padding: 12px 8px; color: #94a3b8; font-size: 14px;">' . $qty . '</td>
        <td align="right" style="padding: 12px 8px; color: #94a3b8; font-size: 14px;">$' . number_format($price, 2) . '</td>
        <td align="right" style="padding: 12px 8px; color: #f1f5f9; font-size: 14px; font-weight: 600;">$' . number_format($itemTotal, 2) . '</td>
    </tr>';
}

// 7. HTML del Email
$htmlContent = '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Compra — SRX Tech</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#080f1e;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#080f1e;padding:36px 16px;">
    <tr>
      <td align="center">

        <table width="620" cellpadding="0" cellspacing="0" border="0"
               style="max-width:620px;width:100%;background-color:#0f172a;border-radius:20px;
                      overflow:hidden;border:1px solid #1e293b;
                      box-shadow:0 30px 70px rgba(0,0,0,0.7);">

          <!-- ░░ HEADER CON GRADIENTE PREMIUM ░░ -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 36px 40px; text-align: center;">
              <img src="' . $logoUrl . '" alt="SRX Tech" width="110" style="display:block;margin:0 auto 16px;width:110px;height:auto;">
              <h1 style="color:#ffffff; font-size:26px; margin:0; font-weight:800; letter-spacing:-0.03em;">
                ¡Gracias por tu compra!
              </h1>
              <p style="color:#e0e7ff; font-size:14px; margin:8px 0 0; font-weight:500; text-transform:uppercase; letter-spacing:0.1em;">
                Orden #' . htmlspecialchars($order_ref) . '
              </p>
            </td>
          </tr>

          <!-- ░░ MENSAJE PRINCIPAL ░░ -->
          <tr>
            <td style="padding: 32px 40px 16px 40px;">
              <p style="color:#f1f5f9; font-size:16px; line-height:1.6; margin:0;">
                Hola <strong>' . htmlspecialchars($customer_name) . '</strong>,
              </p>
              <p style="color:#94a3b8; font-size:15px; line-height:1.6; margin:8px 0 0;">
                Hemos registrado con éxito tu compra. A continuación, encontrarás los detalles de tu orden.
              </p>
            </td>
          </tr>

          <!-- ░░ TABLA DE PRODUCTOS ░░ -->
          <tr>
            <td style="padding: 16px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 2px solid #334155;">
                    <th align="left" style="padding: 8px 8px 12px 8px; color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase;">Producto</th>
                    <th align="center" style="padding: 8px 8px 12px 8px; color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase;">Cant.</th>
                    <th align="right" style="padding: 8px 8px 12px 8px; color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase;">Precio</th>
                    <th align="right" style="padding: 8px 8px 12px 8px; color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ' . $itemsHtml . '
                </tbody>
              </table>
            </td>
          </tr>

          <!-- ░░ DESGLOSE DE COSTOS ░░ -->
          <tr>
            <td style="padding: 16px 40px 24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #1e293b; border-radius: 12px; padding: 18px 24px;">
                <tr>
                  <td style="color:#94a3b8; font-size:14px; padding: 4px 0;">Subtotal:</td>
                  <td align="right" style="color:#f1f5f9; font-size:14px; padding: 4px 0;">$' . number_format($subtotal, 2) . '</td>
                </tr>';

if ($discount_amount > 0) {
    $htmlContent .= '
                <tr>
                  <td style="color:#3b82f6; font-size:14px; padding: 4px 0; font-weight:600;">Descuento (' . $discount_percent . '% OFF):</td>
                  <td align="right" style="color:#3b82f6; font-size:14px; padding: 4px 0; font-weight:600;">-$' . number_format($discount_amount, 2) . '</td>
                </tr>';
}

$htmlContent .= '
                <tr>
                  <td style="height:1px; background-color:#334155; margin: 8px 0; font-size:0; line-height:0;" colspan="2">&nbsp;</td>
                </tr>
                <tr>
                  <td style="color:#ffffff; font-size:18px; font-weight:800; padding: 8px 0 0 0;">Total Final:</td>
                  <td align="right" style="color:#60a5fa; font-size:22px; font-weight:800; padding: 8px 0 0 0;">$' . number_format($total, 2) . ' USD</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ░░ INFORMACIÓN DE PAGO Y ORDEN ░░ -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #334155; border-radius: 12px; padding: 20px;">
                <tr>
                  <td style="padding-bottom: 12px; border-bottom: 1px solid #1e293b;" colspan="2">
                    <h3 style="margin:0; color:#ffffff; font-size:15px; font-weight:700;">Detalles de la Transacción</h3>
                  </td>
                </tr>
                <tr>
                  <td style="color:#94a3b8; font-size:13px; padding: 10px 0 4px 0; width:50%;">Método de Pago:</td>
                  <td align="right" style="color:#f1f5f9; font-size:13px; padding: 10px 0 4px 0; font-weight:600;">' . htmlspecialchars($payment_method) . '</td>
                </tr>
                <tr>
                  <td style="color:#94a3b8; font-size:13px; padding: 4px 0; width:50%;">Referencia / ID Pago:</td>
                  <td align="right" style="color:#f1f5f9; font-size:13px; padding: 4px 0; font-family:monospace;">' . htmlspecialchars($reference_number) . '</td>
                </tr>
                <tr>
                  <td style="color:#94a3b8; font-size:13px; padding: 4px 0; width:50%;">Tipo de Pedido:</td>
                  <td align="right" style="color:#f1f5f9; font-size:13px; padding: 4px 0; text-transform: capitalize;">' . ($order_type === 'mixto' ? 'Contado / Encargo' : htmlspecialchars($order_type)) . '</td>
                </tr>
                <tr>
                  <td style="color:#94a3b8; font-size:13px; padding: 4px 0 0 0; width:50%;">Teléfono de Contacto:</td>
                  <td align="right" style="color:#f1f5f9; font-size:13px; padding: 4px 0 0 0;">' . htmlspecialchars($customer_phone) . '</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ░░ BOTÓN CTA ░░ -->
          <tr>
            <td align="center" style="padding:0 40px 36px 40px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center"
                      style="border-radius:14px;
                             background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);
                             box-shadow:0 10px 30px rgba(59,130,246,0.4);">
                    <a href="' . $storeUrl . '"
                       target="_blank"
                       style="display:inline-block;padding:16px 48px;color:#ffffff;
                              text-decoration:none;font-size:16px;font-weight:700;
                              letter-spacing:0.02em;border-radius:14px;">
                      🛒 Visitar la Tienda
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ░░ PIE DE PÁGINA ░░ -->
          <tr>
            <td align="center" style="padding:22px 40px 32px 40px; border-top: 1px solid #1e293b;">
              <p style="margin:0 0 6px 0;color:#475569;font-size:12px;line-height:1.6;">
                Si tienes alguna pregunta sobre tu pedido, contáctanos respondiendo a este correo.
              </p>
              <p style="margin:0;color:#334155;font-size:11px;">
                &copy; 2026 SRX Tech. Todos los derechos reservados. &bull;
                <a href="' . $storeUrl . '" style="color:#475569;text-decoration:none;">srxtech.net</a>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>';

// 8. Enviar via Resend
$emailPayload = json_encode([
    "from"    => "SRX Tech | Compras <info@srxtech.net>",
    "to"      => [$customer_email],
    "subject" => "Confirmación de Compra — Orden #" . $order_ref . " | SRX Tech",
    "html"    => $htmlContent
], JSON_UNESCAPED_UNICODE);

$chMail = curl_init();
curl_setopt_array($chMail, [
    CURLOPT_URL            => 'https://api.resend.com/emails',
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $emailPayload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => [
        "Authorization: Bearer " . $resend_key,
        "Content-Type: application/json"
    ],
    CURLOPT_TIMEOUT        => 20,
    CURLOPT_SSL_VERIFYPEER => true,
]);
$mailResp = curl_exec($chMail);
$mailCode = curl_getinfo($chMail, CURLINFO_HTTP_CODE);
$mailErr  = curl_error($chMail);
curl_close($chMail);

if ($mailErr) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Error cURL al enviar correo: " . $mailErr]);
    exit;
}

if ($mailCode < 200 || $mailCode >= 300) {
    http_response_code($mailCode);
    echo json_encode([
        "success" => false,
        "error"   => "Resend devolvió HTTP $mailCode",
        "details" => json_decode($mailResp, true)
    ]);
    exit;
}

http_response_code(200);
echo json_encode([
    "success" => true,
    "message" => "Correo de confirmación de compra enviado exitosamente.",
    "details" => json_decode($mailResp, true)
]);
