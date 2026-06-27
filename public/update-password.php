<?php
$allowed_origins = ['http://localhost:5173', 'https://srxtech.net'];
if (isset($_SERVER['HTTP_ORIGIN']) && in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins)) {
    header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
}
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, apikey");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

$data = json_decode(file_get_contents("php://input"), true);
$token = isset($data['token']) ? trim($data['token']) : '';
$nuevaContrasena = isset($data['nuevaContrasena']) ? trim($data['nuevaContrasena']) : '';

if (empty($token) || empty($nuevaContrasena)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Token y nueva contraseña son requeridos."]);
    exit;
}

// CONFIGURACIÓN REAL DEL PROYECTO SRX-Tech-Ecommerce
$supabase_url = 'https://wcnobggfbmpisahxihfu.supabase.co';
$service_key  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjbm9iZ2dmYm1waXNhaHhpaGZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQ1NzgxOCwiZXhwIjoyMDk1MDMzODE4fQ.GlGdzK1LUB13BhRHOaRRfCu5BAZ_JOVYkh4o9UmZA_s';

// PASO 1: Buscar el token en la tabla password_resets
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

// SI SUPABASE DEVUELVE UN ARREGLO VACÍO O UN ERROR, DETENEMOS TODO DE INMEDIATO
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

// PASO 2: Actualizar la contraseña en la API de administración de Supabase
$update_url     = rtrim($supabase_url, '/') . '/auth/v1/admin/users/' . $user_id;
$update_payload = json_encode(["password" => $nuevaContrasena]);

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

if ($update_code !== 200) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error"   => "Supabase Auth Admin rechazó el cambio de clave.",
        "details" => $update_data
    ]);
    exit;
}

// PASO 3: Destruir el token usado para evitar reutilización
$delete_url = rtrim($supabase_url, '/') . '/rest/v1/password_resets?token=eq.' . urlencode($token);
$ch3 = curl_init();
curl_setopt_array($ch3, [
    CURLOPT_URL           => $delete_url,
    CURLOPT_CUSTOMREQUEST => "DELETE",
    CURLOPT_HTTPHEADER    => [
        "Authorization: Bearer " . $service_key,
        "apikey: "               . $service_key
    ]
]);
curl_exec($ch3);
curl_close($ch3);

// RESPUESTA REAL DE ÉXITO TOTAL
echo json_encode(["success" => true, "message" => "Contraseña modificada correctamente en la base de datos."]);
