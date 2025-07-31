<?php
require_once 'config/config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

requireAdmin();

try {
    $pdo = getDBConnection();
    
    // Get pending content count
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM content WHERE status = 'pending'");
    $pendingCount = $stmt->fetch()['count'];
    
    // Get approved content count
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM content WHERE status = 'approved'");
    $approvedCount = $stmt->fetch()['count'];
    
    // Get total users count
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM users WHERE role != 'admin'");
    $usersCount = $stmt->fetch()['count'];
    
    // Get total revenue
    $stmt = $pdo->query("SELECT SUM(amount) as revenue FROM transactions WHERE status = 'completed'");
    $revenue = $stmt->fetch()['revenue'] ?: 0;
    
    echo json_encode([
        'success' => true,
        'stats' => [
            'pending' => intval($pendingCount),
            'approved' => intval($approvedCount),
            'users' => intval($usersCount),
            'revenue' => floatval($revenue)
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Get admin stats error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error loading statistics'
    ]);
}
?>