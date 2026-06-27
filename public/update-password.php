<?php
// ═══════════════════════════════════════════════════════════════════════════════
//  update-password.php
//  Actualiza la contraseña de un usuario usando la Admin API de Supabase.
//  No requiere sesión activa del cliente.
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN — Carga de variables de entorno o constantes fallback
// ═══════════════════════════════════════════════════════════════════════════════

// Intentar cargar variables desde el archivo .env (un nivel arriba del directorio public)
$envPath = dirname(__DIR__) . '/.env';
$envVars = [];
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // Ignorar comentarios
        if (strpos(trim($line), '#') === 0) continue;
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $envVars[trim($parts[0])] = trim($parts[1]);
        }
    }
}

// 1. URL de Supabase (ej: https://wcnobggfbmpisahxihfu.supabase.co)
$supabaseUrl = $envVars['SUPABASE_URL'] ?? $envVars['VITE_SUPABASE_URL'] ?? 'https://wcnobggfbmpisahxihfu.supabase.co';
define('SUPABASE_URL', rtrim($supabaseUrl, '/'));

// 2. SERVICE ROLE KEY de Supabase (Settings → API → service_role)
// NUNCA uses la anon/public key. Esta clave tiene permisos de administrador.
$serviceRoleKey = $envVars['SUPABASE_SERVICE_ROLE_KEY'] ?? 'TU_SERVICE_ROLE_KEY_AQUI';
define('SUPABASE_SERVICE_ROLE_KEY', $serviceRoleKey);



// ═══════════════════════════════════════════════════════════════════════════════
//  LECTURA Y VALIDACIÓN DEL BODY JSON
// ═══════════════════════════════════════════════════════════════════════════════
$rawBody = file_get_contents('php://input');
$data    = json_decode($rawBody, true);

if (json_last_error() !== JSON_ERROR_NONE || empty($data)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'JSON inválido o cuerpo de solicitud vacío.']);
    exit();
}

$token           = isset($data['token'])           ? trim($data['token'])     : '';
$nuevaContrasena = isset($data['nuevaContrasena'])  ? $data['nuevaContrasena'] : '';

if (empty($token)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'El campo "token" es obligatorio.']);
    exit();
}

if (empty($nuevaContrasena) || strlen($nuevaContrasena) < 8) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'La nueva contraseña debe tener al menos 8 caracteres.']);
    exit();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PASO 1 — Validar el token en la base de datos de Supabase
// ═══════════════════════════════════════════════════════════════════════════════

$selectUrl = SUPABASE_URL . '/rest/v1/password_resets?token=eq.' . urlencode($token) . '&select=user_id,expires_at';

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => $selectUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => [
        'Authorization: Bearer ' . SUPABASE_SERVICE_ROLE_KEY,
        'apikey: ' . SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type: application/json'
    ],
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response  = curl_exec($ch);
$httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error de conexión cURL al validar el token: ' . $curlError]);
    exit();
}

if ($httpCode < 200 || $httpCode >= 300) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error'   => 'Error al consultar el token en Supabase.',
        'details' => json_decode($response, true)
    ]);
    exit();
}

$rows = json_decode($response, true);

// ── VALIDACIÓN DEL TOKEN Y ASOCIACIÓN DE USUARIO ──
if (empty($rows) || !is_array($rows) || empty($rows[0]['user_id'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error'   => 'Token inválido o no asociado a un usuario real'
    ]);
    exit();
}

$row = $rows[0];

// ── Verificar que el token no haya expirado ──
if (strtotime($row['expires_at']) < time()) {
    // Eliminación proactiva del token expirado
    $deleteUrl = SUPABASE_URL . '/rest/v1/password_resets?token=eq.' . urlencode($token);
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $deleteUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => 'DELETE',
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . SUPABASE_SERVICE_ROLE_KEY,
            'apikey: ' . SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type: application/json'
        ],
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    curl_exec($ch);
    curl_close($ch);

    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error'   => 'El enlace de recuperación ha expirado. Solicita uno nuevo.'
    ]);
    exit();
}

$userId = $row['user_id'];

// ═══════════════════════════════════════════════════════════════════════════════
//  PASO 2 — Actualizar la contraseña vía GoTrue Admin API de Supabase (Requisito Crítico #1)
// ═══════════════════════════════════════════════════════════════════════════════
$supabaseAdminUrl = SUPABASE_URL . '/auth/v1/admin/users/' . $userId;
$payload = json_encode(['password' => $nuevaContrasena]);

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => $supabaseAdminUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST  => 'PUT', // Obligatorio: PUT para actualizar usuarios en GoTrue Admin API
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . SUPABASE_SERVICE_ROLE_KEY,
        'apikey: '              . SUPABASE_SERVICE_ROLE_KEY,
    ],
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_SSL_VERIFYPEER => true,
]);

// Capturar respuesta cruda de Supabase (Requisito Crítico #3)
$supabaseResponse = curl_exec($ch);
$httpCode         = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError        = curl_error($ch);
curl_close($ch);

// Error de conexión / de red
if ($curlError) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Error de red al conectar con Supabase Auth: ' . $curlError,
    ]);
    exit();
}

// ── INSPECCIÓN DE LA RESPUESTA DE SUPABASE ──
$supabaseData = json_decode($supabaseResponse, true);
$isError = false;
$errorMessage = '';

// Si la respuesta HTTP es un código de error (no 2xx)
if ($httpCode < 200 || $httpCode >= 300) {
    $isError = true;
}

// Analizar la respuesta JSON buscando errores devueltos por Supabase
if (is_array($supabaseData)) {
    if (isset($supabaseData['error'])) {
        $isError = true;
        if (is_array($supabaseData['error'])) {
            $errorMessage = $supabaseData['error']['message'] ?? json_encode($supabaseData['error']);
        } else {
            $errorMessage = $supabaseData['error'];
            if (isset($supabaseData['error_description'])) {
                $errorMessage .= ': ' . $supabaseData['error_description'];
            }
        }
    } elseif (isset($supabaseData['msg'])) {
        $isError = true;
        $errorMessage = $supabaseData['msg'];
    } elseif (isset($supabaseData['message'])) {
        $isError = true;
        $errorMessage = $supabaseData['message'];
    }
}

if ($isError) {
    if (empty($errorMessage)) {
        $errorMessage = 'Error desconocido de Supabase Auth (HTTP ' . $httpCode . ').';
    }
    
    http_response_code($httpCode >= 400 && $httpCode < 600 ? $httpCode : 400);
    echo json_encode([
        'success' => false,
        'error'   => $errorMessage,
        'details' => $supabaseData
    ]);
    exit();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PASO 3 — Invalidador de token (One-Time Use)
// ═══════════════════════════════════════════════════════════════════════════════
$deleteUrl = SUPABASE_URL . '/rest/v1/password_resets?token=eq.' . urlencode($token);
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => $deleteUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST  => 'DELETE',
    CURLOPT_HTTPHEADER     => [
        'Authorization: Bearer ' . SUPABASE_SERVICE_ROLE_KEY,
        'apikey: ' . SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type: application/json'
    ],
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_SSL_VERIFYPEER => true,
]);
curl_exec($ch);
curl_close($ch);

// ═══════════════════════════════════════════════════════════════════════════════
//  RESPUESTA EXITOSA
// ═══════════════════════════════════════════════════════════════════════════════
http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'Contraseña actualizada con éxito.',
]);
