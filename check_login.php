<?php
require_once 'config/config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $loggedIn = false;
    $userData = null;
    
    if (isLoggedIn()) {
        $pdo = getDBConnection();
        
        // Get user data
        $stmt = $pdo->prepare("
            SELECT id, email, first_name, last_name, role 
            FROM users 
            WHERE id = ? AND is_active = TRUE
        ");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();
        
        if ($user) {
            $loggedIn = true;
            $userData = $user;
            
            // Update last activity
            if (isset($_SESSION['session_token'])) {
                $stmt = $pdo->prepare("UPDATE user_sessions SET last_activity = NOW() WHERE session_token = ?");
                $stmt->execute([$_SESSION['session_token']]);
            }
        } else {
            // User not found or inactive, clear session
            session_destroy();
        }
    }
    
    echo json_encode([
        'success' => true,
        'logged_in' => $loggedIn,
        'user' => $userData
    ]);
    
} catch (Exception $e) {
    error_log("Check login error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'logged_in' => false,
        'message' => 'Error checking login status'
    ]);
}
?>