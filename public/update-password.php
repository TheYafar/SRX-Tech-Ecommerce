<?php
// ═══════════════════════════════════════════════════════════════════════════════
//  update-password.php
//  Recibe token y nueva contraseña, verifica validez y expiración en la DB,
//  actualiza la contraseña del usuario vía GoTrue Admin API y elimina el token.
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
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
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

$token = isset($data['token']) ? trim($data['token']) : '';
$nuevaContrasena = isset($data['nuevaContrasena']) ? $data['nuevaContrasena'] : '';

if (empty($token)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "El token de recuperación es obligatorio."]);
    exit;
}

if (empty($nuevaContrasena) || strlen($nuevaContrasena) < 8) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "La nueva contraseña debe tener al menos 8 caracteres."]);
    exit;
}

$supabase_url = 'https://wcnobggfbmpisahxihfu.supabase.co';
$service_key  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjbm9iZ2dmYm1waXNhaHhpaGZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQ1NzgxOCwiZXhwIjoyMDk1MDMzODE4fQ.GlGdzK1LUB13BhRHOaRRfCu5BAZ_JOVYkh4o9UmZA_s'; // Clave de administrador de producción

// Carga dinámica de fallback desde archivo .env para máxima tolerancia
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

// Cargar desde entornos locales/globales o fallback
$supabase_url = getenv('SUPABASE_URL') ?: getenv('VITE_SUPABASE_URL') ?: ($envVars['SUPABASE_URL'] ?? $envVars['VITE_SUPABASE_URL'] ?? $supabase_url);
$service_key  = getenv('SUPABASE_SERVICE_ROLE_KEY') ?: getenv('VITE_SUPABASE_SERVICE_ROLE_KEY') ?: ($envVars['SUPABASE_SERVICE_ROLE_KEY'] ?? $envVars['VITE_SUPABASE_SERVICE_ROLE_KEY'] ?? $service_key);

if ($service_key === 'sb_secret_AQUI_DEBES_PEGAR_TU_SERVICE_ROLE_KEY' || empty($service_key)) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "SUPABASE_SERVICE_ROLE_KEY no configurado. Reemplaza el placeholder directamente en update-password.php o en el archivo .env."
    ]);
    exit;
}

// 4. Validar token en la tabla public.password_resets
$select_url = rtrim($supabase_url, '/') . '/rest/v1/password_resets?token=eq.' . urlencode($token) . '&select=user_id,expires_at';

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $select_url,
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
    echo json_encode(["success" => false, "error" => "Error de conexión cURL al consultar token: " . $curlError]);
    exit;
}

if ($http_code < 200 || $http_code >= 300) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error" => "Error al consultar el token en la base de datos (Código HTTP $http_code).",
        "details" => json_decode($response, true)
    ]);
    exit;
}

$rows = json_decode($response, true);

if (empty($rows) || !is_array($rows) || empty($rows[0]['user_id'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Enlace de recuperación inválido, expirado o ya utilizado."]);
    exit;
}

$row = $rows[0];
$user_id = $row['user_id'];
$expires_at = $row['expires_at'];

// Verificar expiración del token
if (strtotime($expires_at) < time()) {
    // Eliminación proactiva del token expirado para mantener limpia la DB
    $delete_url = rtrim($supabase_url, '/') . '/rest/v1/password_resets?token=eq.' . urlencode($token);
    $ch_del = curl_init();
    curl_setopt_array($ch_del, [
        CURLOPT_URL => $delete_url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => 'DELETE',
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer " . $service_key,
            "apikey: " . $service_key,
            "Content-Type: application/json"
        ],
        CURLOPT_TIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true
    ]);
    curl_exec($ch_del);
    curl_close($ch_del);

    http_response_code(400);
    echo json_encode(["success" => false, "error" => "El enlace de recuperación ha expirado. Por favor, solicita uno nuevo."]);
    exit;
}

// 5. PUT a Supabase Auth Admin para actualizar la clave del usuario
$admin_url = rtrim($supabase_url, '/') . '/auth/v1/admin/users/' . $user_id;
$update_payload = json_encode(["password" => $nuevaContrasena]);

$ch2 = curl_init();
curl_setopt_array($ch2, [
    CURLOPT_URL => $admin_url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => 'PUT',
    CURLOPT_POSTFIELDS => $update_payload,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer " . $service_key,
        "apikey: " . $service_key,
        "Content-Type: application/json"
    ],
    CURLOPT_TIMEOUT => 15,
    CURLOPT_SSL_VERIFYPEER => true
]);
$update_response = curl_exec($ch2);
$update_code = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
$update_error = curl_error($ch2);
curl_close($ch2);

if ($update_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Error de conexión cURL al actualizar contraseña: " . $update_error]);
    exit;
}

$update_data = json_decode($update_response, true);
$isError = ($update_code < 200 || $update_code >= 300);
$errorMessage = '';

// Inspeccionar respuesta buscando estructuras de error en la API de GoTrue
if (is_array($update_data)) {
    if (isset($update_data['error'])) {
        $isError = true;
        if (is_array($update_data['error'])) {
            $errorMessage = $update_data['error']['message'] ?? json_encode($update_data['error']);
        } else {
            $errorMessage = $update_data['error'];
            if (isset($update_data['error_description'])) {
                $errorMessage .= ': ' . $update_data['error_description'];
            }
        }
    } elseif (isset($update_data['msg'])) {
        $isError = true;
        $errorMessage = $update_data['msg'];
    } elseif (isset($update_data['message'])) {
        $isError = true;
        $errorMessage = $update_data['message'];
    }
}

if ($isError) {
    if (empty($errorMessage)) {
        $errorMessage = "Error desconocido de Supabase Auth Admin API (Código HTTP $update_code).";
    }
    http_response_code($update_code >= 400 && $update_code < 600 ? $update_code : 400);
    echo json_encode([
        "success" => false,
        "error" => $errorMessage,
        "details" => $update_data
    ]);
    exit;
}

// 6. Eliminar token usado de la tabla password_resets (One-Time Use)
$delete_url = rtrim($supabase_url, '/') . '/rest/v1/password_resets?token=eq.' . urlencode($token);

$ch3 = curl_init();
curl_setopt_array($ch3, [
    CURLOPT_URL => $delete_url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => 'DELETE',
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer " . $service_key,
        "apikey: " . $service_key,
        "Content-Type: application/json"
    ],
    CURLOPT_TIMEOUT => 15,
    CURLOPT_SSL_VERIFYPEER => true
]);
curl_exec($ch3);
$delete_code = curl_getinfo($ch3, CURLINFO_HTTP_CODE);
curl_close($ch3);

// 7. Respuesta Exitosa
http_response_code(200);
echo json_encode([
    "success" => true,
    "message" => "Contraseña actualizada con éxito."
]);
