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

// Validate CSRF token
if (!isset($input['csrf_token']) || !verifyCSRFToken($input['csrf_token'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Invalid CSRF token']);
    exit;
}

// Validate required fields
$requiredFields = ['first_name', 'last_name', 'email', 'password', 'confirm_password', 'role'];
foreach ($requiredFields as $field) {
    if (empty($input[$field])) {
        echo json_encode(['success' => false, 'message' => 'All fields are required']);
        exit;
    }
}

// Sanitize input
$firstName = sanitizeInput($input['first_name']);
$lastName = sanitizeInput($input['last_name']);
$email = filter_var(trim($input['email']), FILTER_SANITIZE_EMAIL);
$password = $input['password'];
$confirmPassword = $input['confirm_password'];
$role = sanitizeInput($input['role']);

// Validate email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Invalid email format']);
    exit;
}

// Validate password
if ($password !== $confirmPassword) {
    echo json_encode(['success' => false, 'message' => 'Passwords do not match']);
    exit;
}

if (strlen($password) < 8) {
    echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters long']);
    exit;
}

// Validate role
$validRoles = ['buyer', 'seller'];
if (!in_array($role, $validRoles)) {
    $role = 'buyer'; // Default to buyer if invalid role
}

try {
    $pdo = getDBConnection();
    
    // Check if email already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Email already registered']);
        exit;
    }
    
    // Hash password
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    
    // Generate verification token
    $verificationToken = generateRandomString(64);
    
    // Insert user
    $stmt = $pdo->prepare("
        INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified, created_at) 
        VALUES (?, ?, ?, ?, ?, FALSE, NOW())
    ");
    
    $stmt->execute([$email, $passwordHash, $firstName, $lastName, $role]);
    $userId = $pdo->lastInsertId();
    
    // Store verification token in session for now (in production, send via email)
    $_SESSION['verification_token'] = $verificationToken;
    $_SESSION['verification_user_id'] = $userId;
    
    // For now, we'll auto-verify the user since we don't have email setup
    $stmt = $pdo->prepare("UPDATE users SET email_verified = TRUE WHERE id = ?");
    $stmt->execute([$userId]);
    
    // Log the registration
    error_log("New user registered: $email (ID: $userId)");
    
    echo json_encode([
        'success' => true, 
        'message' => 'Registration successful',
        'user_id' => $userId
    ]);
    
} catch (PDOException $e) {
    error_log("Registration error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Registration failed. Please try again.']);
} catch (Exception $e) {
    error_log("Registration error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Registration failed. Please try again.']);
}
?>