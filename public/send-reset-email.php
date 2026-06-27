<?php
// 1. Cabeceras CORS
$allowed_origins = ['http://localhost:5173', 'https://srxtech.net'];
if (isset($_SERVER['HTTP_ORIGIN']) && in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins)) {
    header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
}
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, apikey");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

// 2. Leer Email
$data = json_decode(file_get_contents("php://input"), true);
$email = isset($data['email']) ? trim($data['email']) : '';

if (empty($email)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Email requerido."]);
    exit;
}

// CONFIGURACIÓN - Carga dinámica desde entorno o archivo .env para proteger credenciales
$envPath = dirname(__DIR__) . '/.env';
$envVars = [];
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $envVars[trim($parts[0])] = trim($parts[1]);
        }
    }
}

// Asignar variables buscando en getenv() primero, luego en el archivo .env cargado, y finalmente con valores fallback
$supabase_url = getenv('SUPABASE_URL') ?: getenv('VITE_SUPABASE_URL') ?: ($envVars['SUPABASE_URL'] ?? $envVars['VITE_SUPABASE_URL'] ?? 'https://wcnobggfbmpisahxihfu.supabase.co');
$service_key  = getenv('SUPABASE_SERVICE_ROLE_KEY') ?: getenv('VITE_SUPABASE_SERVICE_ROLE_KEY') ?: ($envVars['SUPABASE_SERVICE_ROLE_KEY'] ?? $envVars['VITE_SUPABASE_SERVICE_ROLE_KEY'] ?? 'TU_SERVICE_ROLE_KEY_AQUI');
$resend_key   = getenv('RESEND_API_KEY') ?: getenv('VITE_RESEND_API_KEY') ?: ($envVars['RESEND_API_KEY'] ?? $envVars['VITE_RESEND_API_KEY'] ?? 're_NyPW1t5R_ChUxtARKZTfP7ohVTo5qqJ8T');

if (empty($supabase_url) || $service_key === 'TU_SERVICE_ROLE_KEY_AQUI' || empty($service_key)) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Configuración incompleta en el servidor. Asegúrate de configurar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en las variables de entorno o archivo .env."
    ]);
    exit;
}

// 3. Buscar usuario usando el filtro oficial de Supabase Admin API
// Nota: Pasamos el filtro por email en la URL para evitar listar todo de golpe
$url = rtrim($supabase_url, '/') . '/auth/v1/admin/users?email=' . urlencode($email);

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
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
    echo json_encode([
        "success" => false,
        "error" => "Error de conexión cURL al buscar usuario: " . $curlError
    ]);
    exit;
}

$res_data = json_decode($response, true);

// Si falla la API de Supabase, escupimos el error real para saber qué pasa
if ($http_code !== 200) {
    http_response_code(400);
    echo json_encode([
        "success" => false, 
        "error" => "Error en Supabase Admin API (Código $http_code)", 
        "details" => $res_data
    ]);
    exit;
}

// Verificar si encontramos al usuario en el arreglo devuelto
$user = null;
if (isset($res_data['users']) && count($res_data['users']) > 0) {
    $user = $res_data['users'][0];
} elseif (isset($res_data[0])) {
    $user = $res_data[0];
}

if (!$user) {
    http_response_code(404);
    echo json_encode(["success" => false, "error" => "No se encontró ningún usuario con ese correo."]);
    exit;
}

$user_id = $user['id'];
$token = bin2hex(random_bytes(32));
$expires_at = date('c', strtotime('+1 hour'));

// 4. Insertar en la tabla public.password_resets
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
    echo json_encode([
        "success" => false,
        "error" => "Error de conexión cURL al registrar token: " . $ins_error
    ]);
    exit;
}

if ($ins_code < 200 || $ins_code >= 300) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error" => "Error al registrar el token en password_resets.",
        "details" => json_decode($ins_response, true)
    ]);
    exit;
}

// 5. Enviar Email con Resend
$resetLink = "https://srxtech.net/#/reset-password?token=" . $token;
$email_payload = json_encode([
    "from" => "SRX Tech | Tienda Oficial <info@srxtech.net>",
    "to" => [$email],
    "subject" => "Restablecer tu contraseña - SRX Tech",
    "html" => "<div style='font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background-color:#0f172a;color:#ffffff;border-radius:8px;'><h2 style='color:#3b82f6;text-align:center;'>SRX Tech</h2><p>Haz clic abajo para restablecer tu clave:</p><br><a href='{$resetLink}' style='background-color:#3b82f6;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;'>Restablecer Contraseña</a></div>"
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
curl_exec($ch3);
curl_close($ch3);

echo json_encode(["success" => true, "message" => "Enlace enviado con éxito."]);
