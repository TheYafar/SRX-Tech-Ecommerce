<?php
// backend/env_loader.php
// Carga segura de variables de entorno y cabeceras CORS para SRX Tech

if (!function_exists('get_backend_env')) {
    function get_backend_env($key, $default = '') {
        $val = getenv($key);
        if ($val !== false && $val !== '') {
            return $val;
        }
        if (isset($_ENV[$key]) && $_ENV[$key] !== '') {
            return $_ENV[$key];
        }
        if (isset($_SERVER[$key]) && $_SERVER[$key] !== '') {
            return $_SERVER[$key];
        }

        static $fileEnv = null;
        if ($fileEnv === null) {
            $fileEnv = [];
            $envPaths = [__DIR__ . '/.env', dirname(__DIR__) . '/.env'];
            foreach ($envPaths as $path) {
                if (file_exists($path)) {
                    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                    foreach ($lines as $line) {
                        $line = trim($line);
                        if ($line === '' || strpos($line, '#') === 0) continue;
                        $parts = explode('=', $line, 2);
                        if (count($parts) === 2) {
                            $k = trim($parts[0]);
                            $v = trim($parts[1]);
                            if ((str_starts_with($v, '"') && str_ends_with($v, '"')) || (str_starts_with($v, "'") && str_ends_with($v, "'"))) {
                                $v = substr($v, 1, -1);
                            }
                            if (!isset($fileEnv[$k])) {
                                $fileEnv[$k] = $v;
                            }
                        }
                    }
                    break;
                }
            }
        }

        return isset($fileEnv[$key]) ? $fileEnv[$key] : $default;
    }
}

if (!function_exists('set_cors_headers')) {
    function set_cors_headers($allowed_methods = "POST, OPTIONS") {
        $allowed_origins = [
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'https://srxtech.net',
            'https://TheYafar.github.io'
        ];

        $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
        if (in_array($origin, $allowed_origins, true)) {
            header("Access-Control-Allow-Origin: " . $origin);
        } else {
            header("Access-Control-Allow-Origin: https://srxtech.net");
        }

        header("Access-Control-Allow-Methods: " . $allowed_methods);
        header("Access-Control-Allow-Headers: Content-Type, Authorization, apikey, X-Requested-With");
        header("Access-Control-Allow-Credentials: true");
        header("Content-Type: application/json; charset=UTF-8");

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit(0);
        }
    }
}
