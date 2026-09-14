<?php
// backend/send-email.php
// Envío de correos generales a través de la API de Resend

if (file_exists(__DIR__ . '/env_loader.php')) {
    require_once __DIR__ . '/env_loader.php';
}

if (function_exists('set_cors_headers')) {
    set_cors_headers("POST, GET, OPTIONS");
} else {
    $allowed_origins = ['http://localhost:5173', 'https://srxtech.net', 'https://TheYafar.github.io'];
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    if (in_array($origin, $allowed_origins, true)) {
        header("Access-Control-Allow-Origin: " . $origin);
    } else {
        header("Access-Control-Allow-Origin: https://srxtech.net");
    }
    header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
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
    exit();
}

$rawBody = file_get_contents("php://input");
$data    = json_decode($rawBody, true);

if (json_last_error() !== JSON_ERROR_NONE || empty($data)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "JSON inválido o cuerpo de solicitud vacío."]);
    exit();
}

$to      = isset($data['to'])      ? trim($data['to'])      : '';
$subject = isset($data['subject']) ? trim($data['subject']) : '';
$html    = isset($data['html'])    ? $data['html']          : '';

if (empty($to) || empty($subject) || empty($html)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Los campos 'to', 'subject' y 'html' son obligatorios."]);
    exit();
}

$resendApiKey = function_exists('get_backend_env') 
    ? get_backend_env('RESEND_API_KEY') 
    : (getenv('RESEND_API_KEY') ?: '');

if (empty($resendApiKey)) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Configuración incompleta: RESEND_API_KEY no encontrada en el servidor."]);
    exit();
}

$resendUrl = 'https://api.resend.com/emails';

$payload = json_encode([
    "from"    => "SRX Tech <info@srxtech.net>",
    "to"      => [$to],
    "subject" => $subject,
    "html"    => $html
]);

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => $resendUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => [
        "Authorization: Bearer " . $resendApiKey,
        "Content-Type: application/json"
    ],
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response   = curl_exec($ch);
$httpCode   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError  = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Error de conexión cURL: " . $curlError]);
    exit();
}

$resendResponse = json_decode($response, true);
if ($httpCode < 200 || $httpCode >= 300) {
    http_response_code($httpCode);
    echo json_encode(["success" => false, "error" => "Resend devolvió un error", "details" => $resendResponse]);
    exit();
}

http_response_code(200);
echo json_encode(["success" => true, "message" => "Correo enviado exitosamente.", "data" => $resendResponse]);
