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

$data           = json_decode(file_get_contents("php://input"), true);
$token          = isset($data['token'])          ? trim($data['token'])          : '';
$nuevaContrasena = isset($data['nuevaContrasena']) ? trim($data['nuevaContrasena']) : '';

if (empty($token) || empty($nuevaContrasena)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Token y nueva contraseña son requeridos."]);
    exit;
}

// CONFIGURACIÓN DEL PROYECTO SRX-Tech-Ecommerce
$supabase_url = 'https://wcnobggfbmpisahxihfu.supabase.co';
$service_key  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjbm9iZ2dmYm1waXNhaHhpaGZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQ1NzgxOCwiZXhwIjoyMDk1MDMzODE4fQ.GlGdzK1LUB13BhRHOaRRfCu5BAZ_JOVYkh4o9UmZA_s';

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

// ─── PASO 2 (NUEVO): GET previo para verificar el email real del user_id ─────
// Esto blinda contra user_id incorrecto y genera un log auditable.
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

// Si Supabase no devuelve el usuario o devuelve error, detenemos todo
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

// Log auditable: quién va a recibir el cambio de clave
file_put_contents(
    __DIR__ . '/auth_debug.log',
    "[" . date('Y-m-d H:i:s') . "] Intentando cambiar clave al usuario: " . $user_email . " con ID: " . $user_id . "\n",
    FILE_APPEND
);

// ─── PASO 3: Actualizar la contraseña en Supabase Auth Admin (PUT) ───────────
$update_url = rtrim($supabase_url, '/') . '/auth/v1/admin/users/' . $user_id;

// email_confirm: true evita que el usuario quede en estado 'unconfirmed'
// lo que bloquearía el login incluso con clave correcta.
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

// Log de la respuesta cruda de Supabase para diagnóstico
file_put_contents(
    __DIR__ . '/auth_debug.log',
    "[" . date('Y-m-d H:i:s') . "] Respuesta PUT Supabase (HTTP " . $update_code . "): " . $update_response . "\n",
    FILE_APPEND
);

// ─── CORTE DE ÉXITO FALSO ─────────────────────────────────────────────────────
// Se exige HTTP 200 Y que la respuesta contenga el 'id' del usuario modificado.
// Si Supabase devuelve cualquier otra cosa, abortamos con error detallado.
if ($update_code !== 200 || !isset($update_data['id'])) {
    http_response_code(400);
    echo json_encode([
        "success"           => false,
        "error"             => "Supabase Auth Admin no confirmó el cambio de clave. Revisar auth_debug.log.",
        "supabase_http"     => $update_code,
        "supabase_response" => $update_data
    ]);
    exit;
}

// Verificación extra: que el ID devuelto coincida con el que queríamos modificar
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

file_put_contents(
    __DIR__ . '/auth_debug.log',
    "[" . date('Y-m-d H:i:s') . "] Contraseña actualizada con éxito para: " . $user_email . " (" . $user_id . ")\n\n",
    FILE_APPEND
);

// ─── RESPUESTA FINAL DE ÉXITO VERIFICADO ─────────────────────────────────────
echo json_encode([
    "success"  => true,
    "message"  => "Contraseña modificada correctamente en la base de datos.",
    "affected" => $user_email
]);
