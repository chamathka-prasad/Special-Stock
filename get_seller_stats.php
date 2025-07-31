<?php
require_once 'config/config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

requireLogin();

try {
    $pdo = getDBConnection();
    $userId = $_SESSION['user_id'];
    
    // Get total uploads
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM content WHERE seller_id = ?");
    $stmt->execute([$userId]);
    $totalUploads = $stmt->fetch()['count'];
    
    // Get approved uploads
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM content WHERE seller_id = ? AND status = 'approved'");
    $stmt->execute([$userId]);
    $approvedUploads = $stmt->fetch()['count'];
    
    // Get total downloads
    $stmt = $pdo->prepare("SELECT SUM(downloads_count) as count FROM content WHERE seller_id = ? AND status = 'approved'");
    $stmt->execute([$userId]);
    $totalDownloads = $stmt->fetch()['count'] ?: 0;
    
    // Get total earnings
    $stmt = $pdo->prepare("SELECT SUM(amount) as earnings FROM transactions WHERE seller_id = ? AND status = 'completed'");
    $stmt->execute([$userId]);
    $totalEarnings = $stmt->fetch()['earnings'] ?: 0;
    
    echo json_encode([
        'success' => true,
        'stats' => [
            'total_uploads' => intval($totalUploads),
            'approved_uploads' => intval($approvedUploads),
            'total_downloads' => intval($totalDownloads),
            'total_earnings' => floatval($totalEarnings)
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Get seller stats error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error loading statistics'
    ]);
}
?>