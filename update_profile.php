<?php
require_once 'config/config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

requireLogin();

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
$requiredFields = ['first_name', 'last_name', 'role'];
foreach ($requiredFields as $field) {
    if (empty($input[$field])) {
        echo json_encode(['success' => false, 'message' => 'All fields are required']);
        exit;
    }
}

// Sanitize input
$firstName = sanitizeInput($input['first_name']);
$lastName = sanitizeInput($input['last_name']);
$role = sanitizeInput($input['role']);

// Validate role
$validRoles = ['buyer', 'seller'];
if (!in_array($role, $validRoles)) {
    echo json_encode(['success' => false, 'message' => 'Invalid role selected']);
    exit;
}

try {
    $pdo = getDBConnection();
    $userId = $_SESSION['user_id'];
    
    // Update user profile
    $stmt = $pdo->prepare("
        UPDATE users 
        SET first_name = ?, last_name = ?, role = ?, updated_at = NOW() 
        WHERE id = ?
    ");
    $stmt->execute([$firstName, $lastName, $role, $userId]);
    
    // Update session with new role
    $_SESSION['user_role'] = $role;
    
    // Get updated user data
    $stmt = $pdo->prepare("SELECT id, email, first_name, last_name, role FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    if ($user) {
        echo json_encode([
            'success' => true,
            'message' => 'Profile updated successfully',
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'role' => $user['role']
            ]
        ]);
    } else {
        throw new Exception('Failed to retrieve updated user data');
    }
    
} catch (Exception $e) {
    error_log("Update profile error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Profile update failed. Please try again.']);
}
?>