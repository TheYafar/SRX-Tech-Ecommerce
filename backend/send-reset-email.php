<?php
// backend/send-reset-email.php
// Genera token de recuperación en Supabase y envía correo con Resend API

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

$raw_input = file_get_contents('php://input');
$data = json_decode($raw_input, true);

if (json_last_error() !== JSON_ERROR_NONE || empty($data)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Cuerpo de la petición vacío o JSON no válido."]);
    exit;
}

$email = isset($data['email']) ? trim($data['email']) : '';

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Dirección de correo electrónico requerida y válida."]);
    exit;
}

// 3. Credenciales desde entorno o .env
$supabase_url = function_exists('get_backend_env') 
    ? get_backend_env('SUPABASE_URL', 'https://wcnobggfbmpisahxihfu.supabase.co') 
    : (getenv('SUPABASE_URL') ?: 'https://wcnobggfbmpisahxihfu.supabase.co');

$service_key = function_exists('get_backend_env') 
    ? get_backend_env('SUPABASE_SERVICE_ROLE_KEY') 
    : (getenv('SUPABASE_SERVICE_ROLE_KEY') ?: '');

$resend_key = function_exists('get_backend_env') 
    ? get_backend_env('RESEND_API_KEY') 
    : (getenv('RESEND_API_KEY') ?: '');

if (empty($service_key)) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "SUPABASE_SERVICE_ROLE_KEY no configurado en el servidor."]);
    exit;
}

if (empty($resend_key)) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "RESEND_API_KEY no configurado en el servidor."]);
    exit;
}

// 4. Validar existencia del usuario en Supabase GoTrue Admin API
$lookup_url = rtrim($supabase_url, '/') . '/auth/v1/admin/users?email=' . urlencode($email);

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $lookup_url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer " . $service_key,
        "apikey: " . $service_key,
        "Content-Type: application/json"
    ],
    CURLOPT_TIMEOUT => 15,
    CURLOPT_SSL_VERIFYPEER => true
]);
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Error de conexión cURL al validar usuario: " . $curlError]);
    exit;
}

$res_data = json_decode($response, true);

if ($http_code !== 200) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error" => "Error al buscar el usuario en la API de Supabase (Código HTTP $http_code).",
        "details" => $res_data
    ]);
    exit;
}

$user = null;
if (isset($res_data['users']) && is_array($res_data['users'])) {
    foreach ($res_data['users'] as $u) {
        if (strcasecmp(trim($u['email'] ?? ''), trim($email)) === 0) {
            $user = $u;
            break;
        }
    }
} elseif (is_array($res_data)) {
    foreach ($res_data as $u) {
        if (is_array($u) && strcasecmp(trim($u['email'] ?? ''), trim($email)) === 0) {
            $user = $u;
            break;
        }
    }
}

if ($user === null) {
    http_response_code(404);
    echo json_encode([
        "success" => false,
        "error"   => "El correo ingresado no coincide con ningún usuario registrado."
    ]);
    exit;
}

$user_id = $user['id'];
$token = bin2hex(random_bytes(32));
$expires_at = date('c', strtotime('+1 hour'));

// 5. INSERT a la tabla password_resets
$insert_url = rtrim($supabase_url, '/') . '/rest/v1/password_resets';
$insert_payload = json_encode([
    "user_id" => $user_id,
    "token" => $token,
    "expires_at" => $expires_at
]);

$ch2 = curl_init();
curl_setopt_array($ch2, [
    CURLOPT_URL => $insert_url,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $insert_payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer " . $service_key,
        "apikey: " . $service_key,
        "Content-Type: application/json",
        "Prefer: return=minimal"
    ],
    CURLOPT_TIMEOUT => 15,
    CURLOPT_SSL_VERIFYPEER => true
]);
$ins_response = curl_exec($ch2);
$ins_code = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
$ins_error = curl_error($ch2);
curl_close($ch2);

if ($ins_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Error de conexión cURL al registrar token: " . $ins_error]);
    exit;
}

if ($ins_code < 200 || $ins_code >= 300) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error" => "Error al registrar el token de seguridad en la base de datos (Código HTTP $ins_code).",
        "details" => json_decode($ins_response, true)
    ]);
    exit;
}

// 6. Disparar el correo usando Resend API
$resetLink = "https://srxtech.net/#/reset-password?token=" . $token;

$htmlContent = '
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restablecer tu contraseña - SRX Tech</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" max-width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 30px 40px 20px 40px;">
                            <h2 style="color: #3b82f6; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.025em;">SRX Tech</h2>
                            <p style="color: #94a3b8; font-size: 14px; margin: 5px 0 0 0;">Tu tienda de tecnología de confianza</p>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 10px 40px 30px 40px;">
                            <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 25px;">
                                <tr>
                                    <td>
                                        <h3 style="color: #ffffff; font-size: 18px; font-weight: 600; margin-top: 0; margin-bottom: 15px;">¿Olvidaste tu contraseña?</h3>
                                        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-top: 0; margin-bottom: 25px;">Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón de abajo para elegir una nueva:</p>
                                        
                                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 25px;">
                                            <tr>
                                                <td align="center">
                                                    <a href="' . htmlspecialchars($resetLink) . '" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">Restablecer Contraseña</a>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0; text-align: center;">Este enlace es de un solo uso y expirará en <strong>1 hora</strong> por tu seguridad.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding: 0 40px 30px 40px; color: #64748b; font-size: 12px; line-height: 1.5;">
                            <p style="margin: 0 0 5px 0;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
                            <p style="margin: 0;">© 2026 SRX Tech. Todos los derechos reservados.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
';

$email_payload = json_encode([
    "from" => "SRX Tech | Tienda Oficial <info@srxtech.net>",
    "to" => [$email],
    "subject" => "Restablecer tu contraseña - SRX Tech",
    "html" => $htmlContent
]);

$ch3 = curl_init();
curl_setopt_array($ch3, [
    CURLOPT_URL => 'https://api.resend.com/emails',
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $email_payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer " . $resend_key,
        "Content-Type: application/json"
    ],
    CURLOPT_TIMEOUT => 15,
    CURLOPT_SSL_VERIFYPEER => true
]);
$res_email = curl_exec($ch3);
$res_email_code = curl_getinfo($ch3, CURLINFO_HTTP_CODE);
$res_email_error = curl_error($ch3);
curl_close($ch3);

if ($res_email_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Error de conexión cURL al enviar el correo: " . $res_email_error]);
    exit;
}

if ($res_email_code < 200 || $res_email_code >= 300) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error" => "Error al despachar el correo electrónico vía Resend (Código HTTP $res_email_code).",
        "details" => json_decode($res_email, true)
    ]);
    exit;
}

http_response_code(200);
echo json_encode([
    "success" => true,
    "message" => "Enlace de restablecimiento enviado con éxito."
]);
