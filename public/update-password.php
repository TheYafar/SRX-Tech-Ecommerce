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

// 3. Credenciales de la Base de Datos MySQL
define('DB_HOST',     $envVars['DB_HOST']     ?? 'localhost');
define('DB_NAME',     $envVars['DB_NAME']     ?? 'TU_NOMBRE_DE_BASE_DE_DATOS');
define('DB_USER',     $envVars['DB_USER']     ?? 'TU_USUARIO_DE_BD');
define('DB_PASS',     $envVars['DB_PASS']     ?? 'TU_CONTRASEÑA_DE_BD');
define('DB_CHARSET',  $envVars['DB_CHARSET']  ?? 'utf8mb4');

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
//  PASO 1 — Conectar a MySQL y validar el token
// ═══════════════════════════════════════════════════════════════════════════════
$dsn = sprintf(
    'mysql:host=%s;dbname=%s;charset=%s',
    DB_HOST,
    DB_NAME,
    DB_CHARSET
);

try {
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'No se pudo conectar con la base de datos de recuperación.']);
    exit();
}

// Buscamos el hash SHA-256 del token recibido
$tokenHash = hash('sha256', $token);

try {
    $stmt = $pdo->prepare(
        "SELECT user_id, expires_at FROM password_resets WHERE token = :token LIMIT 1"
    );
    $stmt->execute([':token' => $tokenHash]);
    $row = $stmt->fetch();
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error al consultar el token en la base de datos.']);
    exit();
}

// ── VALIDACIÓN DEL TOKEN Y ASOCIACIÓN DE USUARIO (Requisito Crítico #2) ──
if (!$row || empty($row['user_id'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error'   => 'Token inválido o no asociado a un usuario real'
    ]);
    exit();
}

// ── Verificar que el token no haya expirado ──
if (strtotime($row['expires_at']) < time()) {
    // Eliminación proactiva del token expirado
    try {
        $pdo->prepare("DELETE FROM password_resets WHERE token = :token")
            ->execute([':token' => $tokenHash]);
    } catch (PDOException $e) {
        // Silencioso
    }

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
try {
    $pdo->prepare("DELETE FROM password_resets WHERE token = :token")
        ->execute([':token' => $tokenHash]);
} catch (PDOException $e) {
    // Ignorar fallos de base de datos en esta fase para no bloquear la experiencia del usuario
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RESPUESTA EXITOSA
// ═══════════════════════════════════════════════════════════════════════════════
http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'Contraseña actualizada con éxito.',
]);
