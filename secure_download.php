<?php
require_once 'config/config.php';

if (!isset($_GET['token'])) {
    http_response_code(400);
    die('Invalid download request');
}

$token = $_GET['token'];

// Check if token exists and is valid
if (!isset($_SESSION['download_tokens'][$token])) {
    http_response_code(403);
    die('Invalid or expired download token');
}

$downloadData = $_SESSION['download_tokens'][$token];

// Check if token has expired
if ($downloadData['expires'] < time()) {
    unset($_SESSION['download_tokens'][$token]);
    http_response_code(403);
    die('Download token has expired');
}

// Verify user is still logged in and matches the token
if (!isLoggedIn() || $_SESSION['user_id'] !== $downloadData['user_id']) {
    http_response_code(403);
    die('Unauthorized download request');
}

$filePath = UPLOAD_DIR . $downloadData['file_path'];

// Check if file exists
if (!file_exists($filePath)) {
    http_response_code(404);
    die('File not found');
}

try {
    $pdo = getDBConnection();
    
    // Get content details for proper filename
    $stmt = $pdo->prepare("SELECT title, original_filename, file_extension, file_size FROM content WHERE id = ?");
    $stmt->execute([$downloadData['content_id']]);
    $content = $stmt->fetch();
    
    if (!$content) {
        http_response_code(404);
        die('Content not found');
    }
    
    // Determine filename
    $filename = $content['original_filename'] ?: ($content['title'] . '.' . $content['file_extension']);
    $filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $filename); // Sanitize filename
    
    // Get file info
    $fileSize = filesize($filePath);
    $mimeType = mime_content_type($filePath);
    
    // Set headers for download
    header('Content-Type: ' . $mimeType);
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Content-Length: ' . $fileSize);
    header('Cache-Control: no-cache, must-revalidate');
    header('Expires: 0');
    
    // Prevent any output before file
    if (ob_get_level()) {
        ob_end_clean();
    }
    
    // Read and output file in chunks to handle large files
    $chunkSize = 8192; // 8KB chunks
    $handle = fopen($filePath, 'rb');
    
    if ($handle === false) {
        http_response_code(500);
        die('Error reading file');
    }
    
    while (!feof($handle)) {
        $chunk = fread($handle, $chunkSize);
        echo $chunk;
        flush();
    }
    
    fclose($handle);
    
    // Remove the token after successful download
    unset($_SESSION['download_tokens'][$token]);
    
    // Log successful download
    error_log("File downloaded: User {$downloadData['user_id']}, Content {$downloadData['content_id']}, File: {$filename}");
    
} catch (Exception $e) {
    error_log("Secure download error: " . $e->getMessage());
    http_response_code(500);
    die('Download failed');
}
?>