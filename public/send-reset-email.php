<?php
// ─────────────────────────────────────────────
//  CORS — Dynamic Origin Whitelist
// ─────────────────────────────────────────────
$allowedOrigins = [
    'http://localhost:5173',
    'https://srxtech.net',
];

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
}

header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");

// ─────────────────────────────────────────────
//  Preflight (OPTIONS) — respuesta inmediata
// ─────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ─────────────────────────────────────────────
//  Solo se acepta POST
// ─────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido. Solo se acepta POST.']);
    exit();
}

// ─────────────────────────────────────────────
//  Lectura y decodificación del body JSON
// ─────────────────────────────────────────────
$rawBody = file_get_contents('php://input');
$data    = json_decode($rawBody, true);

if (json_last_error() !== JSON_ERROR_NONE || empty($data)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'JSON inválido o cuerpo de solicitud vacío.']);
    exit();
}

// ─────────────────────────────────────────────
//  Validación del campo email
// ─────────────────────────────────────────────
$email = isset($data['email']) ? trim($data['email']) : '';

if (empty($email)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'El campo "email" es obligatorio.']);
    exit();
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'El correo electrónico no tiene un formato válido.']);
    exit();
}

// ─────────────────────────────────────────────
//  Generación de token seguro + expiración
// ─────────────────────────────────────────────
$resetToken  = bin2hex(random_bytes(32));           // 64 caracteres hex criptográficamente seguros
$expiresAt   = date('Y-m-d H:i:s', time() + 3600); // Expira en 1 hora

// TODO: Guardar $resetToken, $email y $expiresAt en la base de datos.
// Ejemplo (PDO):
//   $stmt = $pdo->prepare("INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)");
//   $stmt->execute([$email, hash('sha256', $resetToken), $expiresAt]);

// HashRouter requiere el prefijo /# para que React maneje la ruta en cliente
$resetLink = 'https://srxtech.net/#/reset-password?token=' . urlencode($resetToken);

// ─────────────────────────────────────────────
//  Configuración de Resend
// ─────────────────────────────────────────────
$resendApiKey = 're_NyPW1t5R_ChUxtARKZTfP7ohVTo5qqJ8T';
$resendUrl    = 'https://api.resend.com/emails';

// ─────────────────────────────────────────────
//  Plantilla HTML del correo
// ─────────────────────────────────────────────
$htmlBody = <<<HTML
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Restablecer contraseña — SRX Tech</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background-color:#1e293b;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.4);">

          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 28px;border-bottom:1px solid #334155;text-align:center;">
              <span style="font-size:26px;font-weight:800;color:#f8fafc;letter-spacing:-0.5px;">
                <span style="color:#3b82f6;">SRX</span>
                <span style="color:#64748b;margin:0 6px;">|</span>
                <span>Tech</span>
              </span>
              <p style="margin:10px 0 0;font-size:13px;color:#94a3b8;letter-spacing:0.5px;text-transform:uppercase;">
                Tienda Oficial
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#f1f5f9;line-height:1.3;">
                ¿Olvidaste tu contraseña?
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.7;">
                Recibimos una solicitud para restablecer la contraseña de la cuenta asociada a
                <strong style="color:#e2e8f0;">{$email}</strong>.
                Si fuiste tú, haz clic en el botón de abajo para crear una nueva contraseña.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td align="center"
                      style="background:linear-gradient(135deg,#3b82f6,#2563eb);
                             border-radius:10px;
                             box-shadow:0 4px 14px rgba(59,130,246,0.4);">
                    <a href="{$resetLink}"
                       target="_blank"
                       style="display:inline-block;
                              padding:14px 36px;
                              font-size:15px;
                              font-weight:700;
                              color:#ffffff;
                              text-decoration:none;
                              letter-spacing:0.3px;">
                      Restablecer contraseña &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:0 0 8px;font-size:13px;color:#64748b;line-height:1.6;">
                Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:
              </p>
              <p style="margin:0 0 28px;font-size:12px;word-break:break-all;">
                <a href="{$resetLink}" style="color:#60a5fa;text-decoration:underline;">{$resetLink}</a>
              </p>

              <!-- Warning -->
              <div style="background-color:#0f172a;border-left:3px solid #f59e0b;border-radius:6px;padding:14px 18px;">
                <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
                  ⚠️ &nbsp;Este enlace es válido por <strong style="color:#fbbf24;">1 hora</strong>.
                  Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #334155;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#475569;">
                © 2025 SRX Tech — Todos los derechos reservados.
              </p>
              <p style="margin:0;font-size:12px;color:#334155;">
                Este es un correo automático, por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;

// ─────────────────────────────────────────────
//  Construcción del payload para Resend
// ─────────────────────────────────────────────
$payload = json_encode([
    'from'    => 'SRX Tech | Tienda Oficial <info@srxtech.net>',
    'to'      => [$email],
    'subject' => 'Restablece tu contraseña — SRX Tech',
    'html'    => $htmlBody,
]);

// ─────────────────────────────────────────────
//  Envío vía cURL hacia la API de Resend
// ─────────────────────────────────────────────
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => $resendUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => [
        'Authorization: Bearer ' . $resendApiKey,
        'Content-Type: application/json',
    ],
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response  = curl_exec($ch);
$httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// ─────────────────────────────────────────────
//  Manejo de errores de cURL
// ─────────────────────────────────────────────
if ($curlError) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error de conexión cURL: ' . $curlError]);
    exit();
}

// ─────────────────────────────────────────────
//  Evaluación de la respuesta de Resend
// ─────────────────────────────────────────────
$resendResponse = json_decode($response, true);

if ($httpCode < 200 || $httpCode >= 300) {
    http_response_code($httpCode);
    echo json_encode([
        'success' => false,
        'error'   => 'Resend devolvió un error.',
        'details' => $resendResponse,
    ]);
    exit();
}

// ─────────────────────────────────────────────
//  Respuesta exitosa
// ─────────────────────────────────────────────
http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'Correo de recuperación enviado exitosamente.',
]);
