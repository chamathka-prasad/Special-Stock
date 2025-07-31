<?php
require_once 'config/config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

requireLogin();

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['content_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Content ID is required']);
    exit;
}

$contentId = intval($input['content_id']);
$downloadType = $input['type'] ?? 'purchased'; // 'free' or 'purchased'
$userId = $_SESSION['user_id'];

try {
    $pdo = getDBConnection();
    
    // Get content details
    $stmt = $pdo->prepare("
        SELECT c.*, u.first_name, u.last_name 
        FROM content c 
        JOIN users u ON c.seller_id = u.id 
        WHERE c.id = ? AND c.status = 'approved'
    ");
    $stmt->execute([$contentId]);
    $content = $stmt->fetch();
    
    if (!$content) {
        echo json_encode(['success' => false, 'message' => 'Content not found']);
        exit;
    }
    
    $canDownload = false;
    $transactionId = null;
    
    if ($content['is_free'] && $downloadType === 'free') {
        // Free content - anyone can download
        $canDownload = true;
        
        // Check if user already has download record, create if not
        $stmt = $pdo->prepare("SELECT id, transaction_id FROM user_downloads WHERE user_id = ? AND content_id = ?");
        $stmt->execute([$userId, $contentId]);
        $downloadRecord = $stmt->fetch();
        
        if (!$downloadRecord) {
            // Create download record for free content
            $stmt = $pdo->prepare("
                INSERT INTO user_downloads (user_id, content_id, transaction_id, download_count, first_downloaded_at) 
                VALUES (?, ?, NULL, 0, NOW())
            ");
            $stmt->execute([$userId, $contentId]);
        }
        
    } elseif (!$content['is_free'] && $downloadType === 'purchased') {
        // Paid content - check if user has purchased it
        $stmt = $pdo->prepare("
            SELECT ud.id, ud.transaction_id 
            FROM user_downloads ud 
            WHERE ud.user_id = ? AND ud.content_id = ?
        ");
        $stmt->execute([$userId, $contentId]);
        $downloadRecord = $stmt->fetch();
        
        if ($downloadRecord) {
            $canDownload = true;
            $transactionId = $downloadRecord['transaction_id'];
        }
    }
    
    if (!$canDownload) {
        echo json_encode(['success' => false, 'message' => 'You do not have access to download this content']);
        exit;
    }
    
    // Update download count
    $stmt = $pdo->prepare("
        UPDATE user_downloads 
        SET download_count = download_count + 1, last_downloaded_at = NOW() 
        WHERE user_id = ? AND content_id = ?
    ");
    $stmt->execute([$userId, $contentId]);
    
    // Update content's total download count
    $stmt = $pdo->prepare("UPDATE content SET downloads_count = downloads_count + 1 WHERE id = ?");
    $stmt->execute([$contentId]);
    
    // Generate secure download URL
    $originalFilePath = UPLOAD_DIR . $content['file_path'];
    
    if (!file_exists($originalFilePath)) {
        echo json_encode(['success' => false, 'message' => 'File not found on server']);
        exit;
    }
    
    // For security, we'll use a token-based download system
    $downloadToken = generateRandomString(32);
    $expiry = time() + 3600; // 1 hour expiry
    
    // Store download token in session for verification
    $_SESSION['download_tokens'][$downloadToken] = [
        'content_id' => $contentId,
        'user_id' => $userId,
        'expires' => $expiry,
        'file_path' => $content['file_path']
    ];
    
    // Clean up old tokens
    if (isset($_SESSION['download_tokens'])) {
        foreach ($_SESSION['download_tokens'] as $token => $data) {
            if ($data['expires'] < time()) {
                unset($_SESSION['download_tokens'][$token]);
            }
        }
    }
    
    $downloadUrl = SITE_URL . "/secure_download.php?token=" . $downloadToken;
    $filename = $content['original_filename'] ?: ($content['title'] . '.' . $content['file_extension']);
    
    // Log the download
    error_log("Content downloaded: User {$userId}, Content {$contentId}, Type: {$downloadType}");
    
    echo json_encode([
        'success' => true,
        'download_url' => $downloadUrl,
        'filename' => $filename,
        'file_size' => intval($content['file_size']),
        'expires_in' => 3600 // seconds
    ]);
    
} catch (Exception $e) {
    error_log("Download content error: " . $e->getMessage());
    echo json_encode([
        'success' => false, 
        'message' => 'Download failed. Please try again.'
    ]);
}
?>