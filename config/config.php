<?php
// Application configuration
session_start();

// Site configuration
define('SITE_NAME', 'SpecialStock AI');
define('SITE_URL', 'http://localhost/specialStockAi');
define('SITE_EMAIL', 'admin@specialstock.com');

// File upload configuration
define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('WATERMARKED_DIR', __DIR__ . '/../uploads/watermarked/');
define('THUMBNAILS_DIR', __DIR__ . '/../uploads/thumbnails/');
define('MAX_FILE_SIZE', 50 * 1024 * 1024); // 50MB
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/webp']);
define('ALLOWED_VIDEO_TYPES', ['video/mp4', 'video/avi', 'video/mov']);

// PayPal configuration
define('PAYPAL_CLIENT_ID', 'your_paypal_client_id_here');
define('PAYPAL_CLIENT_SECRET', 'your_paypal_client_secret_here');
define('PAYPAL_MODE', 'sandbox'); // 'sandbox' or 'live'

// Google OAuth configuration
define('GOOGLE_CLIENT_ID', 'your_google_client_id_here');
define('GOOGLE_CLIENT_SECRET', 'your_google_client_secret_here');
define('GOOGLE_REDIRECT_URI', SITE_URL . '/auth/google_callback.php');

// Security
define('SESSION_LIFETIME', 86400); // 24 hours
define('CSRF_TOKEN_NAME', 'csrf_token');

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/error.log');

// Timezone
date_default_timezone_set('UTC');

// Include database configuration
require_once __DIR__ . '/database.php';

// Helper functions
function generateCSRFToken() {
    if (!isset($_SESSION[CSRF_TOKEN_NAME])) {
        $_SESSION[CSRF_TOKEN_NAME] = bin2hex(random_bytes(32));
    }
    return $_SESSION[CSRF_TOKEN_NAME];
}

function verifyCSRFToken($token) {
    return isset($_SESSION[CSRF_TOKEN_NAME]) && hash_equals($_SESSION[CSRF_TOKEN_NAME], $token);
}

function isLoggedIn() {
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

function requireLogin() {
    if (!isLoggedIn()) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentication required']);
        exit;
    }
}

function requireAdmin() {
    requireLogin();
    if ($_SESSION['user_role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Admin access required']);
        exit;
    }
}

function sanitizeInput($input) {
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

function generateRandomString($length = 32) {
    return bin2hex(random_bytes($length / 2));
}

// Create upload directories if they don't exist
$directories = [UPLOAD_DIR, WATERMARKED_DIR, THUMBNAILS_DIR, __DIR__ . '/../logs/'];
foreach ($directories as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}
?>