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
    
    // Get parameters
    $query = isset($_GET['query']) ? trim($_GET['query']) : '';
    $category = isset($_GET['category']) ? trim($_GET['category']) : '';
    $type = isset($_GET['type']) ? trim($_GET['type']) : '';
    $price = isset($_GET['price']) ? trim($_GET['price']) : '';
    $sort = isset($_GET['sort']) ? trim($_GET['sort']) : 'newest';
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(50, max(1, intval($_GET['limit']))) : 12;
    $offset = ($page - 1) * $limit;
    
    // Build WHERE clause
    $whereConditions = ["c.status = 'approved'"];
    $params = [];
    
    // Search query
    if (!empty($query)) {
        $whereConditions[] = "(c.title LIKE ? OR c.description LIKE ? OR EXISTS (
            SELECT 1 FROM content_tags ct 
            JOIN tags t ON ct.tag_id = t.id 
            WHERE ct.content_id = c.id AND t.name LIKE ?
        ))";
        $searchTerm = "%$query%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
    // Category filter (search in tags)
    if (!empty($category)) {
        $whereConditions[] = "EXISTS (
            SELECT 1 FROM content_tags ct 
            JOIN tags t ON ct.tag_id = t.id 
            WHERE ct.content_id = c.id AND t.name = ?
        )";
        $params[] = strtolower($category);
    }
    
    // Type filter
    if (!empty($type) && in_array($type, ['image', 'video'])) {
        $whereConditions[] = "c.file_type = ?";
        $params[] = $type;
    }
    
    // Price filter
    if (!empty($price)) {
        if ($price === 'free') {
            $whereConditions[] = "c.is_free = 1";
        } elseif ($price === 'paid') {
            $whereConditions[] = "c.is_free = 0";
        }
    }
    
    $whereClause = implode(' AND ', $whereConditions);
    
    // Build ORDER BY clause
    $orderClause = "ORDER BY ";
    switch ($sort) {
        case 'oldest':
            $orderClause .= "c.created_at ASC";
            break;
        case 'popular':
            $orderClause .= "c.downloads_count DESC, c.created_at DESC";
            break;
        case 'price_low':
            $orderClause .= "c.is_free DESC, c.price ASC, c.created_at DESC";
            break;
        case 'price_high':
            $orderClause .= "c.is_free ASC, c.price DESC, c.created_at DESC";
            break;
        case 'newest':
        default:
            $orderClause .= "c.created_at DESC";
            break;
    }
    
    // Get total count
    $countQuery = "
        SELECT COUNT(DISTINCT c.id) as total
        FROM content c
        JOIN users u ON c.seller_id = u.id
        WHERE $whereClause
    ";
    
    $countStmt = $pdo->prepare($countQuery);
    $countStmt->execute($params);
    $totalCount = $countStmt->fetch()['total'];
    
    // Get content
    $contentQuery = "
        SELECT DISTINCT
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
        WHERE $whereClause
        $orderClause
        LIMIT ? OFFSET ?
    ";
    
    $params[] = $limit;
    $params[] = $offset;
    
    $stmt = $pdo->prepare($contentQuery);
    $stmt->execute($params);
    $content = $stmt->fetchAll();
    
    // Get tags for each content item
    foreach ($content as &$item) {
        $tagStmt = $pdo->prepare("
            SELECT t.name 
            FROM tags t 
            JOIN content_tags ct ON t.id = ct.tag_id 
            WHERE ct.content_id = ?
        ");
        $tagStmt->execute([$item['id']]);
        $tags = $tagStmt->fetchAll(PDO::FETCH_COLUMN);
        $item['tags'] = $tags;
    }
    
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
            'price' => floatval($item['price']),
            'downloads_count' => intval($item['downloads_count']),
            'created_at' => $item['created_at'],
            'seller_name' => htmlspecialchars($item['first_name'] . ' ' . $item['last_name']),
            'tags' => $item['tags']
        ];
    }, $content);
    
    echo json_encode([
        'success' => true,
        'content' => $formattedContent,
        'total' => intval($totalCount),
        'page' => $page,
        'limit' => $limit,
        'has_more' => count($formattedContent) === $limit
    ]);
    
} catch (Exception $e) {
    error_log("Search error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Search failed',
        'content' => [],
        'total' => 0
    ]);
}
?>