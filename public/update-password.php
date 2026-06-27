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
//  Validación de campos requeridos
// ─────────────────────────────────────────────
$token          = isset($data['token'])          ? trim($data['token'])          : '';
$nuevaContrasena = isset($data['nuevaContrasena']) ? $data['nuevaContrasena']      : '';

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

// ─────────────────────────────────────────────
//  TODO: Lógica de base de datos
//
//  Aquí debes conectarte a tu base de datos (PDO recomendado) y ejecutar
//  los siguientes pasos en orden:
//
//  1. BUSCAR el token en la tabla `password_resets`:
//     $stmt = $pdo->prepare(
//         "SELECT email, expires_at FROM password_resets WHERE token = ? LIMIT 1"
//     );
//     $stmt->execute([hash('sha256', $token)]);
//     $row = $stmt->fetch(PDO::FETCH_ASSOC);
//
//  2. VERIFICAR que el token existe y no ha expirado:
//     if (!$row) { /* responder error "Token inválido." */ }
//     if (strtotime($row['expires_at']) < time()) { /* responder error "Token expirado." */ }
//
//  3. ACTUALIZAR la contraseña del usuario de forma segura con password_hash():
//     $hashedPassword = password_hash($nuevaContrasena, PASSWORD_BCRYPT);
//     $stmt = $pdo->prepare(
//         "UPDATE users SET password = ? WHERE email = ?"
//     );
//     $stmt->execute([$hashedPassword, $row['email']]);
//
//  4. ELIMINAR (o invalidar) el token ya usado para evitar reutilización:
//     $stmt = $pdo->prepare("DELETE FROM password_resets WHERE token = ?");
//     $stmt->execute([hash('sha256', $token)]);
//
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
//  Respuesta exitosa
// ─────────────────────────────────────────────
http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'Contraseña actualizada con éxito.',
]);
