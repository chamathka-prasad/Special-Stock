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
    
    $status = isset($_GET['status']) ? $_GET['status'] : 'pending';
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
    $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
    
    // Build query based on status filter
    $whereClause = "WHERE 1=1";
    $params = [];
    
    if ($status !== 'all') {
        $whereClause .= " AND c.status = ?";
        $params[] = $status;
    }
    
    $stmt = $pdo->prepare("
        SELECT 
            c.id,
            c.title,
            c.description,
            c.file_type,
            c.file_extension,
            c.file_path,
            c.file_size,
            c.width,
            c.height,
            c.is_free,
            c.price,
            c.status,
            c.rejection_reason,
            c.created_at,
            u.first_name,
            u.last_name
        FROM content c
        JOIN users u ON c.seller_id = u.id
        $whereClause
        ORDER BY c.created_at DESC
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
            'file_size' => intval($item['file_size']),
            'width' => $item['width'] ? intval($item['width']) : null,
            'height' => $item['height'] ? intval($item['height']) : null,
            'is_free' => (bool)$item['is_free'],
            'price' => floatval($item['price']),
            'status' => $item['status'],
            'rejection_reason' => $item['rejection_reason'],
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
    error_log("Get pending content error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error loading content',
        'content' => []
    ]);
}
?>