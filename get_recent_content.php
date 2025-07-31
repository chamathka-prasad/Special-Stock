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
    
    // Get recent approved content
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 8;
    $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
    
    $stmt = $pdo->prepare("
        SELECT 
            c.id,
            c.title,
            c.description,
            c.file_type,
            c.file_extension,
            c.watermarked_path,
            c.thumbnail_path,
            c.is_free,
            c.price,
            c.downloads_count,
            c.created_at,
            u.first_name,
            u.last_name
        FROM content c
        JOIN users u ON c.seller_id = u.id
        WHERE c.status = 'approved'
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
    ");
    
    $stmt->execute([$limit, $offset]);
    $content = $stmt->fetchAll();
    
    // Format the data
    $formattedContent = array_map(function($item) {
        return [
            'id' => $item['id'],
            'title' => htmlspecialchars($item['title']),
            'description' => htmlspecialchars($item['description']),
            'file_type' => $item['file_type'],
            'file_extension' => $item['file_extension'],
            'watermarked_path' => $item['watermarked_path'],
            'thumbnail_path' => $item['thumbnail_path'],
            'is_free' => (bool)$item['is_free'],
            'price' => $item['is_free'] ? 0 : floatval($item['price']),
            'downloads_count' => intval($item['downloads_count']),
            'created_at' => $item['created_at'],
            'seller_name' => htmlspecialchars($item['first_name'] . ' ' . $item['last_name'])
        ];
    }, $content);
    
    echo json_encode([
        'success' => true,
        'content' => $formattedContent,
        'total' => count($formattedContent)
    ]);
    
} catch (Exception $e) {
    error_log("Get recent content error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error loading content',
        'content' => []
    ]);
}
?>