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
    
    $status = isset($_GET['status']) ? $_GET['status'] : 'all';
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
    $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
    
    // Build query based on status filter
    $whereClause = "WHERE seller_id = ?";
    $params = [$userId];
    
    if ($status !== 'all') {
        $whereClause .= " AND status = ?";
        $params[] = $status;
    }
    
    $stmt = $pdo->prepare("
        SELECT 
            id,
            title,
            description,
            file_type,
            file_extension,
            file_path,
            watermarked_path,
            thumbnail_path,
            file_size,
            width,
            height,
            is_free,
            price,
            status,
            rejection_reason,
            downloads_count,
            created_at
        FROM content
        $whereClause
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    ");
    
    $params[] = $limit;
    $params[] = $offset;
    
    $stmt->execute($params);
    $content = $stmt->fetchAll();
    
    // Format the data
    $formattedContent = array_map(function($item) {
        return [
            'id' => $item['id'],
            'title' => htmlspecialchars($item['title']),
            'description' => htmlspecialchars($item['description']),
            'file_type' => $item['file_type'],
            'file_extension' => $item['file_extension'],
            'file_path' => $item['file_path'],
            'watermarked_path' => $item['watermarked_path'],
            'thumbnail_path' => $item['thumbnail_path'],
            'file_size' => intval($item['file_size']),
            'width' => $item['width'] ? intval($item['width']) : null,
            'height' => $item['height'] ? intval($item['height']) : null,
            'is_free' => (bool)$item['is_free'],
            'price' => floatval($item['price']),
            'status' => $item['status'],
            'rejection_reason' => $item['rejection_reason'],
            'downloads_count' => intval($item['downloads_count']),
            'created_at' => $item['created_at']
        ];
    }, $content);
    
    echo json_encode([
        'success' => true,
        'content' => $formattedContent,
        'total' => count($formattedContent)
    ]);
    
} catch (Exception $e) {
    error_log("Get my content error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error loading content',
        'content' => []
    ]);
}
?>