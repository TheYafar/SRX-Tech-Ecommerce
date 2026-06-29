<?php
// ═══════════════════════════════════════════════════════════════════════════════
//  send-coupon-email.php
//  Recibe parámetros del cupón, obtiene TODOS los usuarios registrados desde
//  Supabase GoTrue Admin API y envía un correo masivo de cupón con diseño
//  premium (compatible Gmail/Outlook) usando la API de Resend.
// ═══════════════════════════════════════════════════════════════════════════════

// 1. Cabeceras CORS
$allowed_origins = ['http://localhost:5173', 'https://srxtech.net'];
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if (in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: " . $origin);
    header("Access-Control-Allow-Credentials: true");
} else {
    header("Access-Control-Allow-Origin: https://srxtech.net");
}
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, apikey");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
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

$couponCode   = isset($data['code'])             ? strtoupper(trim($data['code']))  : '';
$discount     = isset($data['discount'])         ? (int)$data['discount']           : 0;
$expiration   = isset($data['expiration'])       ? trim($data['expiration'])        : null;
$bannerUrl    = isset($data['banner_url'])       ? trim($data['banner_url'])        : '';
$singleRcpt   = isset($data['single_recipient']) ? trim($data['single_recipient'])  : '';
$designOrder  = isset($data['design_order'])     ? trim($data['design_order'])      : 'banner_arriba';

// Asunto y mensaje personalizados (con fallback corporativo)
$emailSubjectRaw = isset($data['email_subject']) ? trim($data['email_subject']) : '';
$emailMessageRaw = isset($data['email_message']) ? trim($data['email_message']) : '';

$email_subject = !empty($emailSubjectRaw)
    ? $emailSubjectRaw
    : "\xF0\x9F\x8E\x81 " . $discount . "% de descuento — Cupón " . strtoupper(trim($data['code'] ?? '')) . " | SRX Tech";

$email_message_html = !empty($emailMessageRaw)
    ? nl2br(htmlspecialchars($emailMessageRaw, ENT_QUOTES, 'UTF-8'))
    : 'Preparamos este cupón exclusivo para tu próxima compra en<br><strong style="color:#60a5fa;">SRX Tech</strong>.';

// Normalizar: solo valores permitidos
if (!in_array($designOrder, ['banner_arriba', 'cupon_arriba'], true)) {
    $designOrder = 'banner_arriba';
}

if (empty($couponCode) || $discount < 1 || $discount > 100) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Los campos 'code' y 'discount' (1-100) son obligatorios."]);
    exit;
}

// 3. Credenciales de producción (hardcoded + fallback .env)
$supabase_url = 'https://wcnobggfbmpisahxihfu.supabase.co';
$service_key  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjbm9iZ2dmYm1waXNhaHhpaGZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQ1NzgxOCwiZXhwIjoyMDk1MDMzODE4fQ.GlGdzK1LUB13BhRHOaRRfCu5BAZ_JOVYkh4o9UmZA_s';
$resend_key   = 're_NyPW1t5R_ChUxtARKZTfP7ohVTo5qqJ8T';

// Fallback desde archivo .env local si existe
$envPath = dirname(__DIR__) . '/.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $envVars = [];
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $envVars[trim($parts[0])] = trim($parts[1]);
        }
    }
    $supabase_url = getenv('SUPABASE_URL') ?: ($envVars['SUPABASE_URL'] ?? $envVars['VITE_SUPABASE_URL'] ?? $supabase_url);
    $service_key  = getenv('SUPABASE_SERVICE_ROLE_KEY') ?: ($envVars['SUPABASE_SERVICE_ROLE_KEY'] ?? $envVars['VITE_SUPABASE_SERVICE_ROLE_KEY'] ?? $service_key);
    $resend_key   = getenv('RESEND_API_KEY') ?: ($envVars['RESEND_API_KEY'] ?? $envVars['VITE_RESEND_API_KEY'] ?? $resend_key);
}

// 4. Determinar lista de destinatarios
if (!empty($singleRcpt)) {
    // Modo individual: solo un destinatario
    if (!filter_var($singleRcpt, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "El campo 'single_recipient' no es un correo válido."]);
        exit;
    }
    $recipients = [$singleRcpt];
} else {
    // Modo masivo: obtener todos los usuarios de Supabase GoTrue Admin API (paginado)
    $recipients = [];
    $page       = 1;
    $perPage    = 1000; // máximo permitido por Supabase

    do {
        $usersUrl = rtrim($supabase_url, '/') . '/auth/v1/admin/users?page=' . $page . '&per_page=' . $perPage;

        $chU = curl_init();
        curl_setopt_array($chU, [
            CURLOPT_URL            => $usersUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => [
                "Authorization: Bearer " . $service_key,
                "apikey: " . $service_key,
                "Content-Type: application/json"
            ],
            CURLOPT_TIMEOUT        => 20,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $usersResp = curl_exec($chU);
        $usersCode = curl_getinfo($chU, CURLINFO_HTTP_CODE);
        $usersErr  = curl_error($chU);
        curl_close($chU);

        if ($usersErr) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Error cURL al obtener usuarios: " . $usersErr]);
            exit;
        }

        if ($usersCode !== 200) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "error"   => "Supabase devolvió HTTP $usersCode al listar usuarios.",
                "details" => json_decode($usersResp, true)
            ]);
            exit;
        }

        $usersData = json_decode($usersResp, true);

        // Supabase devuelve { users: [...] } o directamente un array
        $batch = [];
        if (isset($usersData['users']) && is_array($usersData['users'])) {
            $batch = $usersData['users'];
        } elseif (is_array($usersData)) {
            $batch = $usersData;
        }

        foreach ($batch as $u) {
            $email = trim($u['email'] ?? '');
            if (!empty($email) && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $recipients[] = $email;
            }
        }

        $fetchedCount = count($batch);
        $page++;

    } while ($fetchedCount === $perPage);

    $recipients = array_unique($recipients);

    if (empty($recipients)) {
        http_response_code(404);
        echo json_encode(["success" => false, "error" => "No se encontraron usuarios con correo registrado."]);
        exit;
    }
}

// 5. Constantes de la plantilla HTML
$storeUrl      = 'https://srxtech.net';
$logoUrl       = 'https://srxtech.net/Renovacion_logo_SRX_1a_2.png';
$defaultBanner = 'https://srxtech.net/srx3.jpg';
$finalBanner   = !empty($bannerUrl) ? $bannerUrl : $defaultBanner;

// Formatear fecha de expiración
$expiryLine = '';
if (!empty($expiration)) {
    $ts = strtotime($expiration);
    if ($ts !== false) {
        $expiryLine = 'Válido hasta el <strong style="color:#f1f5f9;">' . date('d/m/Y', $ts) . '</strong>';
    }
}

// ─── Bloques HTML reutilizables ────────────────────────────────────────────
$bannerBlock = '
          <!-- ░░ BANNER (τοπ or bottom, depending on design_order) ░░ -->
          <tr>
            <td style="padding:0;line-height:0;">
              <img src="' . htmlspecialchars($finalBanner) . '"
                   alt="Oferta Especial SRX Tech"
                   width="620"
                   style="display:block;width:100%;max-width:620px;height:220px;
                          object-fit:cover;">
            </td>
          </tr>';

$couponBlock = '
          <!-- ░░ LOGO ░░ -->
          <tr>
            <td align="center" style="padding:28px 40px 8px 40px;">
              <img src="' . $logoUrl . '"
                   alt="SRX Tech"
                   width="110"
                   style="display:block;margin:0 auto;width:110px;height:auto;">
            </td>
          </tr>

          <!-- ░░ SUBTÍTULO DEL LOGO ░░ -->
          <tr>
            <td align="center" style="padding:0 40px 20px 40px;">
              <p style="margin:8px 0 0 0;color:#64748b;font-size:11px;
                        letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">
                Tu tienda de tecnología de confianza
              </p>
            </td>
          </tr>

          <!-- ░░ SEPARADOR GRADIENTE ░░ -->
          <tr>
            <td style="padding:0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height:1px;background:linear-gradient(90deg,transparent 0%,#334155 50%,transparent 100%);font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ░░ HEADLINE Y MENSAJE PERSONALIZADO ░░ -->
          <tr>
            <td align="center" style="padding:28px 40px 8px 40px;">
              <h1 style="margin:0 0 10px 0;font-size:32px;font-weight:800;color:#ffffff;
                         letter-spacing:-0.04em;line-height:1.2;">
                🎁 ¡Tenemos un regalo para ti!
              </h1>
              <p style="margin:0;color:#94a3b8;font-size:15px;line-height:1.75;">
                ' . $email_message_html . '
              </p>
            </td>
          </tr>

          <!-- ░░ TARJETA DEL CUPÓN ░░ -->
          <tr>
            <td style="padding:24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center"
                      style="background:linear-gradient(135deg,#0c2340 0%,#1e293b 50%,#0c2340 100%);
                             border:2px dashed #3b82f6;border-radius:16px;padding:36px 24px;">

                    <p style="margin:0 0 4px 0;color:#93c5fd;font-size:11px;font-weight:700;
                               letter-spacing:0.2em;text-transform:uppercase;">
                      Descuento Exclusivo
                    </p>

                    <p style="margin:0 0 18px 0;font-size:80px;font-weight:900;color:#3b82f6;
                               line-height:1;letter-spacing:-0.05em;">
                      ' . $discount . '<span style="font-size:42px;vertical-align:middle;">%</span>
                    </p>

                    <p style="margin:0 0 10px 0;color:#94a3b8;font-size:12px;font-weight:600;
                               letter-spacing:0.14em;text-transform:uppercase;">
                      Ingresa este código al hacer checkout
                    </p>

                    <!-- Código destacado -->
                    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                      <tr>
                        <td align="center"
                            style="background-color:#060d1a;border:1px solid #3b82f6;
                                   border-radius:12px;padding:16px 36px;">
                          <span style="font-size:30px;font-weight:900;color:#f1f5f9;
                                       letter-spacing:0.25em;
                                       font-family:\'Courier New\',Courier,monospace;">
                            ' . htmlspecialchars($couponCode) . '
                          </span>
                        </td>
                      </tr>
                    </table>

                    <!-- Vigencia -->
                    <p style="margin:18px 0 0 0;color:#64748b;font-size:13px;">
                      ' . (!empty($expiryLine) ? $expiryLine : 'Sin fecha de vencimiento') . '
                    </p>

                  </td>
                </tr>
              </table>
            </td>
          </tr>';

// ─── Seleccionar orden según design_order ──────────────────────────────────
if ($designOrder === 'cupon_arriba') {
    // Cupón primero (logo + copy + código), banner al final
    $orderedContent = $couponBlock . $bannerBlock;
} else {
    // banner_arriba (default): banner encabeza, cupón debajo
    $orderedContent = $bannerBlock . $couponBlock;
}

$htmlContent = '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cupón Exclusivo SRX Tech — ' . $discount . '% OFF</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#080f1e;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#080f1e;padding:36px 16px;">
    <tr>
      <td align="center">

        <table width="620" cellpadding="0" cellspacing="0" border="0"
               style="max-width:620px;width:100%;background-color:#0f172a;border-radius:20px;
                      overflow:hidden;border:1px solid #1e293b;
                      box-shadow:0 30px 70px rgba(0,0,0,0.7);">

          ' . $orderedContent . '

          <!-- ░░ BOTÓN CTA ░░ -->
          <tr>
            <td align="center" style="padding:0 40px 32px 40px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center"
                      style="border-radius:14px;
                             background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);
                             box-shadow:0 10px 30px rgba(59,130,246,0.5);">
                    <a href="' . $storeUrl . '"
                       target="_blank"
                       style="display:inline-block;padding:18px 52px;color:#ffffff;
                              text-decoration:none;font-size:17px;font-weight:800;
                              letter-spacing:0.02em;border-radius:14px;">
                      🛍️ Ir a la Tienda
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ░░ INSTRUCCIONES ░░ -->
          <tr>
            <td style="padding:0 40px 28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:#1a2540;border-radius:14px;border:1px solid #2d3f60;">
                <tr>
                  <td style="padding:22px 26px;">
                    <p style="margin:0 0 14px 0;color:#e2e8f0;font-size:14px;font-weight:700;
                               letter-spacing:0.01em;">
                      ¿Cómo usar tu cupón?
                    </p>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr><td style="padding:4px 0;color:#94a3b8;font-size:13px;line-height:1.65;">
                        <span style="color:#3b82f6;font-weight:800;">1. </span>
                        Visita <a href="' . $storeUrl . '" style="color:#60a5fa;text-decoration:none;font-weight:600;">srxtech.net</a> y elige tus productos favoritos.
                      </td></tr>
                      <tr><td style="padding:4px 0;color:#94a3b8;font-size:13px;line-height:1.65;">
                        <span style="color:#3b82f6;font-weight:800;">2. </span>
                        Agrega los artículos a tu carrito de compra.
                      </td></tr>
                      <tr><td style="padding:4px 0;color:#94a3b8;font-size:13px;line-height:1.65;">
                        <span style="color:#3b82f6;font-weight:800;">3. </span>
                        En el checkout, ingresa el código <strong style="color:#f1f5f9;font-family:monospace;
                        letter-spacing:0.1em;">' . htmlspecialchars($couponCode) . '</strong>.
                      </td></tr>
                      <tr><td style="padding:4px 0;color:#94a3b8;font-size:13px;line-height:1.65;">
                        <span style="color:#3b82f6;font-weight:800;">4. </span>
                        ¡Disfruta tu descuento de <strong style="color:#f1f5f9;">' . $discount . '%</strong>!
                      </td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ░░ SEPARADOR ░░ -->
          <tr>
            <td style="padding:0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height:1px;background:linear-gradient(90deg,transparent 0%,#334155 50%,transparent 100%);font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ░░ PIE DE PÁGINA ░░ -->
          <tr>
            <td align="center" style="padding:22px 40px 32px 40px;">
              <p style="margin:0 0 6px 0;color:#475569;font-size:12px;line-height:1.6;">
                Recibiste este correo por tener una cuenta registrada en SRX Tech.
              </p>
              <p style="margin:0;color:#334155;font-size:11px;">
                &copy; 2026 SRX Tech. Todos los derechos reservados. &bull;
                <a href="' . $storeUrl . '" style="color:#475569;text-decoration:none;">srxtech.net</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- /Tarjeta -->

      </td>
    </tr>
  </table>

</body>
</html>';

// 6. Envío via Resend: un correo por destinatario
$errors       = [];
$successCount = 0;

foreach ($recipients as $recipientEmail) {
    $emailPayload = json_encode([
        "from"    => "SRX Tech | Ofertas Exclusivas <info@srxtech.net>",
        "to"      => [$recipientEmail],
        "subject" => $email_subject,
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
        $errors[] = ["email" => $recipientEmail, "error" => "cURL: " . $mailErr];
    } elseif ($mailCode < 200 || $mailCode >= 300) {
        $errors[] = [
            "email"   => $recipientEmail,
            "error"   => "Resend HTTP $mailCode",
            "details" => json_decode($mailResp, true)
        ];
    } else {
        $successCount++;
    }
}

// 7. Respuesta final
if ($successCount === 0 && !empty($errors)) {
    http_response_code(500);
    echo json_encode([
        "success"    => false,
        "error"      => "No se pudo enviar ningún correo.",
        "sent_count" => 0,
        "total"      => count($recipients),
        "errors"     => $errors
    ]);
    exit;
}

http_response_code(200);
echo json_encode([
    "success"    => true,
    "message"    => "Campaña despachada. $successCount correo(s) enviados exitosamente.",
    "sent_count" => $successCount,
    "total"      => count($recipients),
    "errors"     => $errors
]);
