<?php
require_once 'config/config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
    exit;
}

// Validate required fields
if (empty($input['email']) || empty($input['password'])) {
    echo json_encode(['success' => false, 'message' => 'Email and password are required']);
    exit;
}

$email = filter_var(trim($input['email']), FILTER_SANITIZE_EMAIL);
$password = $input['password'];
$rememberMe = isset($input['remember_me']) && $input['remember_me'];

// Validate email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Invalid email format']);
    exit;
}

try {
    $pdo = getDBConnection();
    
    // Get user by email
    $stmt = $pdo->prepare("
        SELECT id, email, password_hash, first_name, last_name, role, is_active, email_verified 
        FROM users 
        WHERE email = ?
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
        exit;
    }
    
    // Check password
    if (!password_verify($password, $user['password_hash'])) {
        echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
        exit;
    }
    
    // Check if user is active
    if (!$user['is_active']) {
        echo json_encode(['success' => false, 'message' => 'Account has been deactivated']);
        exit;
    }
    
    // Check if email is verified (skip for now)
    // if (!$user['email_verified']) {
    //     echo json_encode(['success' => false, 'message' => 'Please verify your email address']);
    //     exit;
    // }
    
    // Generate session token
    $sessionToken = generateRandomString(64);
    $expiresAt = date('Y-m-d H:i:s', time() + SESSION_LIFETIME);
    
    // Store session in database
    $stmt = $pdo->prepare("
        INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent) 
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $user['id'],
        $sessionToken,
        $expiresAt,
        $_SERVER['REMOTE_ADDR'] ?? null,
        $_SERVER['HTTP_USER_AGENT'] ?? null
    ]);
    
    // Set session variables
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_email'] = $user['email'];
    $_SESSION['user_role'] = $user['role'];
    $_SESSION['session_token'] = $sessionToken;
    $_SESSION['login_time'] = time();
    
    // Set cookie if remember me is checked
    if ($rememberMe) {
        $cookieExpire = time() + (30 * 24 * 60 * 60); // 30 days
        setcookie('remember_token', $sessionToken, $cookieExpire, '/', '', false, true);
    }
    
    // Clean up old sessions for this user
    $stmt = $pdo->prepare("DELETE FROM user_sessions WHERE user_id = ? AND expires_at < NOW()");
    $stmt->execute([$user['id']]);
    
    // Prepare user data for response (without sensitive info)
    $userData = [
        'id' => $user['id'],
        'email' => $user['email'],
        'first_name' => $user['first_name'],
        'last_name' => $user['last_name'],
        'role' => $user['role']
    ];
    
    // Log successful login
    error_log("User logged in: {$user['email']} (ID: {$user['id']})");
    
    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'user' => $userData
    ]);
    
} catch (PDOException $e) {
    error_log("Login error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Login failed. Please try again.']);
} catch (Exception $e) {
    error_log("Login error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Login failed. Please try again.']);
}
?>