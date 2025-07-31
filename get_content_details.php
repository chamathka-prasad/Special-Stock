<?php
require_once 'config/config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid content ID']);
    exit;
}

$contentId = intval($_GET['id']);
$isAdmin = isset($_GET['admin']) && $_GET['admin'] === '1';

try {
    $pdo = getDBConnection();
    
    // Base query
    $query = "
        SELECT 
            c.id,
            c.title,
            c.description,
            c.file_type,
            c.file_extension,
            c.original_filename,
            c.file_path,
            c.watermarked_path,
            c.thumbnail_path,
            c.file_size,
            c.width,
            c.height,
            c.duration,
            c.is_free,
            c.price,
            c.status,
            c.rejection_reason,
            c.downloads_count,
            c.created_at,
            u.id as seller_id,
            u.first_name,
            u.last_name,
            u.email as seller_email
        FROM content c
        JOIN users u ON c.seller_id = u.id
        WHERE c.id = ?
    ";
    
    // Add status filter for non-admin users
    if (!$isAdmin) {
        $query .= " AND c.status = 'approved'";
    }
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([$contentId]);
    $content = $stmt->fetch();
    
    if (!$content) {
        echo json_encode(['success' => false, 'message' => 'Content not found']);
        exit;
    }
    
    // Get tags
    $tagStmt = $pdo->prepare("
        SELECT t.name 
        FROM tags t 
        JOIN content_tags ct ON t.id = ct.tag_id 
        WHERE ct.content_id = ?
    ");
    $tagStmt->execute([$contentId]);
    $tags = $tagStmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Format the data
    $formattedContent = [
        'id' => $content['id'],
        'title' => htmlspecialchars($content['title']),
        'description' => htmlspecialchars($content['description']),
        'file_type' => $content['file_type'],
        'file_extension' => $content['file_extension'],
        'original_filename' => $content['original_filename'],
        'file_path' => $content['file_path'],
        'watermarked_path' => $content['watermarked_path'],
        'thumbnail_path' => $content['thumbnail_path'],
        'file_size' => intval($content['file_size']),
        'width' => $content['width'] ? intval($content['width']) : null,
        'height' => $content['height'] ? intval($content['height']) : null,
        'duration' => $content['duration'] ? intval($content['duration']) : null,
        'is_free' => (bool)$content['is_free'],
        'price' => floatval($content['price']),
        'status' => $content['status'],
        'rejection_reason' => $content['rejection_reason'],
        'downloads_count' => intval($content['downloads_count']),
        'created_at' => $content['created_at'],
        'seller_id' => $content['seller_id'],
        'seller_name' => htmlspecialchars($content['first_name'] . ' ' . $content['last_name']),
        'seller_email' => $isAdmin ? $content['seller_email'] : null,
        'tags' => $tags
    ];
    
    echo json_encode([
        'success' => true,
        'content' => $formattedContent
    ]);
    
} catch (Exception $e) {
    error_log("Get content details error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error loading content details'
    ]);
}
?>