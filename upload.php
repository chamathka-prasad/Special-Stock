<?php
require_once 'config/config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Check if user is logged in
requireLogin();

// Validate CSRF token
if (!isset($_POST['csrf_token']) || !verifyCSRFToken($_POST['csrf_token'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Invalid CSRF token']);
    exit;
}

// Validate required fields
$requiredFields = ['title', 'pricing_type'];
foreach ($requiredFields as $field) {
    if (empty($_POST[$field])) {
        echo json_encode(['success' => false, 'message' => 'Required fields are missing']);
        exit;
    }
}

// Validate file upload
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'message' => 'File upload error']);
    exit;
}

$file = $_FILES['file'];

// Validate file size
if ($file['size'] > MAX_FILE_SIZE) {
    echo json_encode(['success' => false, 'message' => 'File size exceeds maximum limit (50MB)']);
    exit;
}

// Validate file type
$fileType = $file['type'];
$isImage = in_array($fileType, ALLOWED_IMAGE_TYPES);
$isVideo = in_array($fileType, ALLOWED_VIDEO_TYPES);

if (!$isImage && !$isVideo) {
    echo json_encode(['success' => false, 'message' => 'Unsupported file type']);
    exit;
}

// Sanitize input data
$title = sanitizeInput($_POST['title']);
$description = isset($_POST['description']) ? sanitizeInput($_POST['description']) : '';
$tags = isset($_POST['tags']) ? sanitizeInput($_POST['tags']) : '';
$pricingType = sanitizeInput($_POST['pricing_type']);
$price = 0.00;
$isFree = true;

if ($pricingType === 'paid') {
    if (!isset($_POST['price']) || !is_numeric($_POST['price'])) {
        echo json_encode(['success' => false, 'message' => 'Valid price is required for paid content']);
        exit;
    }
    $price = floatval($_POST['price']);
    if ($price <= 0 || $price > 999.99) {
        echo json_encode(['success' => false, 'message' => 'Price must be between $0.01 and $999.99']);
        exit;
    }
    $isFree = false;
}

try {
    $pdo = getDBConnection();
    $pdo->beginTransaction();
    
    // Generate unique filename
    $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $uniqueFilename = uniqid() . '_' . time() . '.' . $fileExtension;
    $uploadPath = UPLOAD_DIR . $uniqueFilename;
    
    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
        throw new Exception('Failed to save uploaded file');
    }
    
    // Get file dimensions (for images)
    $width = null;
    $height = null;
    $duration = null;
    
    if ($isImage) {
        $imageInfo = getimagesize($uploadPath);
        if ($imageInfo) {
            $width = $imageInfo[0];
            $height = $imageInfo[1];
        }
    }
    
    // Insert content record
    $stmt = $pdo->prepare("
        INSERT INTO content (
            seller_id, title, description, file_type, file_extension, 
            original_filename, file_path, file_size, width, height, duration,
            is_free, price, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    ");
    
    $stmt->execute([
        $_SESSION['user_id'],
        $title,
        $description,
        $isImage ? 'image' : 'video',
        $fileExtension,
        $file['name'],
        $uniqueFilename,
        $file['size'],
        $width,
        $height,
        $duration,
        $isFree ? 1 : 0,
        $price
    ]);
    
    $contentId = $pdo->lastInsertId();
    
    // Process tags
    if (!empty($tags)) {
        $tagList = array_map('trim', explode(',', $tags));
        $tagList = array_filter($tagList); // Remove empty tags
        
        foreach ($tagList as $tagName) {
            $tagName = strtolower($tagName);
            
            // Insert or get tag ID
            $stmt = $pdo->prepare("INSERT IGNORE INTO tags (name) VALUES (?)");
            $stmt->execute([$tagName]);
            
            $stmt = $pdo->prepare("SELECT id FROM tags WHERE name = ?");
            $stmt->execute([$tagName]);
            $tagId = $stmt->fetchColumn();
            
            // Link content with tag
            if ($tagId) {
                $stmt = $pdo->prepare("INSERT INTO content_tags (content_id, tag_id) VALUES (?, ?)");
                $stmt->execute([$contentId, $tagId]);
            }
        }
    }
    
    $pdo->commit();
    
    // Log the upload
    error_log("Content uploaded: ID $contentId by user {$_SESSION['user_id']}");
    
    echo json_encode([
        'success' => true,
        'message' => 'Content uploaded successfully',
        'content_id' => $contentId
    ]);
    
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollback();
    }
    
    // Clean up uploaded file if it exists
    if (isset($uploadPath) && file_exists($uploadPath)) {
        unlink($uploadPath);
    }
    
    error_log("Upload error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Upload failed. Please try again.']);
}
?>