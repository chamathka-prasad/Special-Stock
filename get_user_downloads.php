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
    
    // Get user's downloaded content
    $stmt = $pdo->prepare("
        SELECT 
            ud.content_id,
            ud.transaction_id,
            ud.download_count,
            ud.first_downloaded_at,
            ud.last_downloaded_at,
            c.title,
            c.file_type,
            c.file_extension,
            c.file_path,
            c.watermarked_path,
            c.thumbnail_path,
            c.file_size,
            c.is_free,
            c.price,
            u.first_name,
            u.last_name
        FROM user_downloads ud
        JOIN content c ON ud.content_id = c.id
        JOIN users u ON c.seller_id = u.id
        WHERE ud.user_id = ?
        ORDER BY ud.first_downloaded_at DESC
    ");
    
    $stmt->execute([$userId]);
    $downloads = $stmt->fetchAll();
    
    // Format the data
    $formattedDownloads = array_map(function($item) {
        return [
            'content_id' => $item['content_id'],
            'transaction_id' => $item['transaction_id'],
            'download_count' => intval($item['download_count']),
            'first_downloaded_at' => $item['first_downloaded_at'],
            'last_downloaded_at' => $item['last_downloaded_at'],
            'title' => htmlspecialchars($item['title']),
            'file_type' => $item['file_type'],
            'file_extension' => $item['file_extension'],
            'file_path' => $item['file_path'],
            'watermarked_path' => $item['watermarked_path'],
            'thumbnail_path' => $item['thumbnail_path'],
            'file_size' => intval($item['file_size']),
            'is_free' => (bool)$item['is_free'],
            'price' => floatval($item['price']),
            'seller_name' => htmlspecialchars($item['first_name'] . ' ' . $item['last_name'])
        ];
    }, $downloads);
    
    echo json_encode([
        'success' => true,
        'downloads' => $formattedDownloads,
        'total' => count($formattedDownloads)
    ]);
    
} catch (Exception $e) {
    error_log("Get user downloads error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error loading downloads',
        'downloads' => []
    ]);
}
?>