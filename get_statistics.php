<?php
require_once 'config/config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $pdo = getDBConnection();
    
    // Get total images
    $stmt = $pdo->query("
        SELECT COUNT(*) as count 
        FROM content 
        WHERE status = 'approved' AND file_type = 'image'
    ");
    $imageCount = $stmt->fetch()['count'];
    
    // Get total videos
    $stmt = $pdo->query("
        SELECT COUNT(*) as count 
        FROM content 
        WHERE status = 'approved' AND file_type = 'video'
    ");
    $videoCount = $stmt->fetch()['count'];
    
    // Get total contributors (sellers with approved content)
    $stmt = $pdo->query("
        SELECT COUNT(DISTINCT seller_id) as count 
        FROM content 
        WHERE status = 'approved'
    ");
    $contributorCount = $stmt->fetch()['count'];
    
    // Get total downloads
    $stmt = $pdo->query("
        SELECT SUM(downloads_count) as count 
        FROM content 
        WHERE status = 'approved'
    ");
    $downloadCount = $stmt->fetch()['count'] ?: 0;
    
    echo json_encode([
        'success' => true,
        'stats' => [
            'images' => intval($imageCount),
            'videos' => intval($videoCount),
            'contributors' => intval($contributorCount),
            'downloads' => intval($downloadCount)
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Get statistics error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error loading statistics',
        'stats' => [
            'images' => 0,
            'videos' => 0,
            'contributors' => 0,
            'downloads' => 0
        ]
    ]);
}
?>