<?php
// backend/update-password.php
// Actualiza la contraseña en Supabase Auth Admin mediante el token de recuperación

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

$data            = json_decode(file_get_contents("php://input"), true);
$token           = isset($data['token'])           ? trim($data['token'])           : '';
$nuevaContrasena = isset($data['nuevaContrasena']) ? trim($data['nuevaContrasena']) : '';

if (empty($token) || empty($nuevaContrasena)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Token y nueva contraseña son requeridos."]);
    exit;
}

// CONFIGURACIÓN DE SUPABASE DESDE VARIABLES DE ENTORNO O .ENV
$supabase_url = function_exists('get_backend_env') 
    ? get_backend_env('SUPABASE_URL', 'https://wcnobggfbmpisahxihfu.supabase.co') 
    : (getenv('SUPABASE_URL') ?: 'https://wcnobggfbmpisahxihfu.supabase.co');

$service_key = function_exists('get_backend_env') 
    ? get_backend_env('SUPABASE_SERVICE_ROLE_KEY') 
    : (getenv('SUPABASE_SERVICE_ROLE_KEY') ?: '');

if (empty($service_key)) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "SUPABASE_SERVICE_ROLE_KEY no configurado en el servidor."]);
    exit;
}

// ─── PASO 1: Buscar el token en la tabla password_resets ──────────────────────
$select_url = rtrim($supabase_url, '/') . '/rest/v1/password_resets?token=eq.' . urlencode($token) . '&select=user_id,expires_at';

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => $select_url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => [
        "Authorization: Bearer " . $service_key,
        "apikey: "               . $service_key,
        "Content-Type: application/json"
    ]
]);
$select_response = curl_exec($ch);
$select_code     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$records = json_decode($select_response, true);

if ($select_code !== 200 || empty($records) || !isset($records[0])) {
    http_response_code(400);
    echo json_encode([
        "success"                     => false,
        "error"                       => "El token de recuperación no existe en la tabla password_resets o expiró.",
        "debug_supabase_api_response" => $records
    ]);
    exit;
}

$user_id    = $records[0]['user_id'];
$expires_at = $records[0]['expires_at'];

// Validar expiración temporal
if (strtotime($expires_at) < time()) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "El enlace ha expirado."]);
    exit;
}

// ─── PASO 2: GET previo para verificar el email real del user_id ─────
$verify_url = rtrim($supabase_url, '/') . '/auth/v1/admin/users/' . $user_id;

$chV = curl_init();
curl_setopt_array($chV, [
    CURLOPT_URL            => $verify_url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => [
        "Authorization: Bearer " . $service_key,
        "apikey: "               . $service_key,
        "Content-Type: application/json"
    ]
]);
$verify_response = curl_exec($chV);
$verify_code     = curl_getinfo($chV, CURLINFO_HTTP_CODE);
curl_close($chV);

$verify_data = json_decode($verify_response, true);

if ($verify_code !== 200 || empty($verify_data) || !isset($verify_data['id'])) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error"   => "No se pudo verificar el usuario en Supabase Auth antes de cambiar la clave.",
        "debug"   => [
            "user_id"        => $user_id,
            "http_code"      => $verify_code,
            "supabase_reply" => $verify_data
        ]
    ]);
    exit;
}

$user_email = $verify_data['email'] ?? 'email-no-disponible';

// ─── PASO 3: Actualizar la contraseña en Supabase Auth Admin (PUT) ───────────
$update_url = rtrim($supabase_url, '/') . '/auth/v1/admin/users/' . $user_id;

$update_payload = json_encode([
    "password"      => $nuevaContrasena,
    "email_confirm" => true
]);

$ch2 = curl_init();
curl_setopt_array($ch2, [
    CURLOPT_URL            => $update_url,
    CURLOPT_CUSTOMREQUEST  => "PUT",
    CURLOPT_POSTFIELDS     => $update_payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => [
        "Authorization: Bearer " . $service_key,
        "apikey: "               . $service_key,
        "Content-Type: application/json"
    ]
]);
$update_response = curl_exec($ch2);
$update_code     = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
curl_close($ch2);

$update_data = json_decode($update_response, true);

if ($update_code !== 200 || !isset($update_data['id'])) {
    http_response_code(400);
    echo json_encode([
        "success"           => false,
        "error"             => "Supabase Auth Admin no confirmó el cambio de clave.",
        "supabase_http"     => $update_code,
        "supabase_response" => $update_data
    ]);
    exit;
}

if ($update_data['id'] !== $user_id) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error"   => "Inconsistencia crítica: el ID devuelto por Supabase no coincide con el user_id del token.",
        "expected_id" => $user_id,
        "returned_id" => $update_data['id']
    ]);
    exit;
}

// ─── PASO 4: Destruir el token usado para evitar reutilización ───────────────
$delete_url = rtrim($supabase_url, '/') . '/rest/v1/password_resets?token=eq.' . urlencode($token);
$ch3 = curl_init();
curl_setopt_array($ch3, [
    CURLOPT_URL           => $delete_url,
    CURLOPT_CUSTOMREQUEST => "DELETE",
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER    => [
        "Authorization: Bearer " . $service_key,
        "apikey: "               . $service_key
    ]
]);
curl_exec($ch3);
curl_close($ch3);

// ─── RESPUESTA FINAL DE ÉXITO VERIFICADO ─────────────────────────────────────
echo json_encode([
    "success"  => true,
    "message"  => "Contraseña modificada correctamente en la base de datos.",
    "affected" => $user_email
]);
