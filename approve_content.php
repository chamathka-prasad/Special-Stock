<?php
require_once 'config/config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

requireAdmin();

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
    exit;
}

// Validate CSRF token
if (!isset($input['csrf_token']) || !verifyCSRFToken($input['csrf_token'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Invalid CSRF token']);
    exit;
}

// Validate required fields
if (empty($input['content_id']) || empty($input['action'])) {
    echo json_encode(['success' => false, 'message' => 'Content ID and action are required']);
    exit;
}

$contentId = intval($input['content_id']);
$action = sanitizeInput($input['action']);
$reason = isset($input['reason']) ? sanitizeInput($input['reason']) : '';

if (!in_array($action, ['approve', 'reject'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
    exit;
}

if ($action === 'reject' && empty($reason)) {
    echo json_encode(['success' => false, 'message' => 'Rejection reason is required']);
    exit;
}

try {
    $pdo = getDBConnection();
    $pdo->beginTransaction();
    
    // Get content details
    $stmt = $pdo->prepare("SELECT * FROM content WHERE id = ? AND status = 'pending'");
    $stmt->execute([$contentId]);
    $content = $stmt->fetch();
    
    if (!$content) {
        throw new Exception('Content not found or already processed');
    }
    
    if ($action === 'approve') {
        // Create watermarked version for approved content
        $watermarkResult = createWatermarkedVersion($content);
        
        if (!$watermarkResult['success']) {
            throw new Exception('Failed to create watermarked version: ' . $watermarkResult['message']);
        }
        
        // Update content status
        $stmt = $pdo->prepare("
            UPDATE content 
            SET status = 'approved', 
                watermarked_path = ?,
                thumbnail_path = ?,
                approved_at = NOW(), 
                approved_by = ? 
            WHERE id = ?
        ");
        $stmt->execute([
            $watermarkResult['watermarked_path'],
            $watermarkResult['thumbnail_path'],
            $_SESSION['user_id'],
            $contentId
        ]);
        
        $message = 'Content approved successfully';
        
    } else { // reject
        // Update content status with rejection reason
        $stmt = $pdo->prepare("
            UPDATE content 
            SET status = 'rejected', 
                rejection_reason = ?,
                approved_at = NOW(), 
                approved_by = ? 
            WHERE id = ?
        ");
        $stmt->execute([$reason, $_SESSION['user_id'], $contentId]);
        
        $message = 'Content rejected';
    }
    
    $pdo->commit();
    
    // Log the action
    error_log("Content {$action}d: ID $contentId by admin {$_SESSION['user_id']}");
    
    echo json_encode([
        'success' => true,
        'message' => $message
    ]);
    
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollback();
    }
    
    error_log("Content approval error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

function createWatermarkedVersion($content) {
    try {
        $originalPath = UPLOAD_DIR . $content['file_path'];
        
        if (!file_exists($originalPath)) {
            return ['success' => false, 'message' => 'Original file not found'];
        }
        
        $watermarkedFilename = 'watermarked_' . $content['file_path'];
        $thumbnailFilename = 'thumb_' . $content['file_path'];
        
        $watermarkedPath = WATERMARKED_DIR . $watermarkedFilename;
        $thumbnailPath = THUMBNAILS_DIR . $thumbnailFilename;
        
        if ($content['file_type'] === 'image') {
            $result = createWatermarkedImage($originalPath, $watermarkedPath, $thumbnailPath);
        } else {
            $result = createWatermarkedVideo($originalPath, $watermarkedPath, $thumbnailPath);
        }
        
        if ($result['success']) {
            return [
                'success' => true,
                'watermarked_path' => 'uploads/watermarked/' . $watermarkedFilename,
                'thumbnail_path' => 'uploads/thumbnails/' . $thumbnailFilename
            ];
        } else {
            return $result;
        }
        
    } catch (Exception $e) {
        return ['success' => false, 'message' => $e->getMessage()];
    }
}

function createWatermarkedImage($originalPath, $watermarkedPath, $thumbnailPath) {
    try {
        // Get image info
        $imageInfo = getimagesize($originalPath);
        if (!$imageInfo) {
            return ['success' => false, 'message' => 'Invalid image file'];
        }
        
        $width = $imageInfo[0];
        $height = $imageInfo[1];
        $type = $imageInfo[2];
        
        // Create image resource based on type
        switch ($type) {
            case IMAGETYPE_JPEG:
                $image = imagecreatefromjpeg($originalPath);
                break;
            case IMAGETYPE_PNG:
                $image = imagecreatefrompng($originalPath);
                break;
            case IMAGETYPE_WEBP:
                $image = imagecreatefromwebp($originalPath);
                break;
            default:
                return ['success' => false, 'message' => 'Unsupported image type'];
        }
        
        if (!$image) {
            return ['success' => false, 'message' => 'Failed to create image resource'];
        }
        
        // Add watermark
        $watermarkText = 'SpecialStock AI';
        $fontSize = max(12, min($width, $height) / 20);
        $textColor = imagecolorallocatealpha($image, 255, 255, 255, 50); // Semi-transparent white
        
        // Calculate text position (center)
        $textBox = imagettfbbox($fontSize, 0, __DIR__ . '/assets/fonts/arial.ttf', $watermarkText);
        $textX = ($width - $textBox[4]) / 2;
        $textY = ($height - $textBox[5]) / 2;
        
        // Add background rectangle for better visibility
        $bgColor = imagecolorallocatealpha($image, 0, 0, 0, 100);
        imagefilledrectangle($image, $textX - 10, $textY - $fontSize - 5, $textX + $textBox[4] + 10, $textY + 5, $bgColor);
        
        // Add text watermark (use imagestring if ttf font not available)
        if (function_exists('imagettftext') && file_exists(__DIR__ . '/assets/fonts/arial.ttf')) {
            imagettftext($image, $fontSize, 0, $textX, $textY, $textColor, __DIR__ . '/assets/fonts/arial.ttf', $watermarkText);
        } else {
            imagestring($image, 5, $textX, $textY - 20, $watermarkText, $textColor);
        }
        
        // Save watermarked image
        $saved = false;
        switch ($type) {
            case IMAGETYPE_JPEG:
                $saved = imagejpeg($image, $watermarkedPath, 85);
                break;
            case IMAGETYPE_PNG:
                $saved = imagepng($image, $watermarkedPath, 8);
                break;
            case IMAGETYPE_WEBP:
                $saved = imagewebp($image, $watermarkedPath, 85);
                break;
        }
        
        if (!$saved) {
            imagedestroy($image);
            return ['success' => false, 'message' => 'Failed to save watermarked image'];
        }
        
        // Create thumbnail
        $thumbWidth = 300;
        $thumbHeight = ($height * $thumbWidth) / $width;
        $thumbnail = imagecreatetruecolor($thumbWidth, $thumbHeight);
        
        // Preserve transparency for PNG
        if ($type === IMAGETYPE_PNG) {
            imagealphablending($thumbnail, false);
            imagesavealpha($thumbnail, true);
        }
        
        imagecopyresampled($thumbnail, $image, 0, 0, 0, 0, $thumbWidth, $thumbHeight, $width, $height);
        
        // Save thumbnail
        switch ($type) {
            case IMAGETYPE_JPEG:
                imagejpeg($thumbnail, $thumbnailPath, 85);
                break;
            case IMAGETYPE_PNG:
                imagepng($thumbnail, $thumbnailPath, 8);
                break;
            case IMAGETYPE_WEBP:
                imagewebp($thumbnail, $thumbnailPath, 85);
                break;
        }
        
        imagedestroy($image);
        imagedestroy($thumbnail);
        
        return ['success' => true];
        
    } catch (Exception $e) {
        return ['success' => false, 'message' => $e->getMessage()];
    }
}

function createWatermarkedVideo($originalPath, $watermarkedPath, $thumbnailPath) {
    // For video watermarking, we would need FFmpeg
    // For now, we'll just copy the original and create a simple thumbnail
    try {
        // Copy original to watermarked (in a real implementation, use FFmpeg to add watermark)
        if (!copy($originalPath, $watermarkedPath)) {
            return ['success' => false, 'message' => 'Failed to create watermarked video'];
        }
        
        // Create a simple video thumbnail (placeholder)
        $thumbnail = imagecreatetruecolor(300, 200);
        $bg = imagecolorallocate($thumbnail, 240, 240, 240);
        $text = imagecolorallocate($thumbnail, 100, 100, 100);
        
        imagefill($thumbnail, 0, 0, $bg);
        imagestring($thumbnail, 5, 120, 90, 'VIDEO', $text);
        imagestring($thumbnail, 3, 110, 110, 'Click to play', $text);
        
        imagejpeg($thumbnail, $thumbnailPath, 85);
        imagedestroy($thumbnail);
        
        return ['success' => true];
        
    } catch (Exception $e) {
        return ['success' => false, 'message' => $e->getMessage()];
    }
}
?>