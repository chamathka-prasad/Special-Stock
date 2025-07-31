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
if (empty($input['items']) || empty($input['total']) || empty($input['payment_id'])) {
    echo json_encode(['success' => false, 'message' => 'Missing required payment information']);
    exit;
}

$items = $input['items'];
$total = floatval($input['total']);
$paymentId = sanitizeInput($input['payment_id']);
$paymentMethod = sanitizeInput($input['payment_method'] ?? 'paypal');
$billing = $input['billing'] ?? [];

try {
    $pdo = getDBConnection();
    $pdo->beginTransaction();
    
    $userId = $_SESSION['user_id'];
    $processedItems = [];
    $totalVerification = 0;
    
    // Verify each item and calculate total
    foreach ($items as $item) {
        $contentId = intval($item['id']);
        $itemPrice = floatval($item['price']);
        
        // Get content details from database
        $stmt = $pdo->prepare("
            SELECT c.*, u.first_name, u.last_name 
            FROM content c 
            JOIN users u ON c.seller_id = u.id 
            WHERE c.id = ? AND c.status = 'approved'
        ");
        $stmt->execute([$contentId]);
        $content = $stmt->fetch();
        
        if (!$content) {
            throw new Exception("Content item {$contentId} not found or not available");
        }
        
        if ($content['is_free']) {
            throw new Exception("Free content cannot be purchased");
        }
        
        if (abs($content['price'] - $itemPrice) > 0.01) {
            throw new Exception("Price mismatch for item {$contentId}");
        }
        
        // Check if user already owns this content
        $stmt = $pdo->prepare("
            SELECT id FROM user_downloads 
            WHERE user_id = ? AND content_id = ?
        ");
        $stmt->execute([$userId, $contentId]);
        
        if ($stmt->fetch()) {
            throw new Exception("You already own: {$content['title']}");
        }
        
        $processedItems[] = [
            'content' => $content,
            'price' => $itemPrice
        ];
        
        $totalVerification += $itemPrice;
    }
    
    // Calculate expected total (same logic as frontend)
    $subtotal = $totalVerification;
    $platformFee = $subtotal * 0.05; // 5% platform fee
    $taxAmount = ($subtotal + $platformFee) * 0.08; // 8% tax
    $expectedTotal = $subtotal + $platformFee + $taxAmount;
    
    // Verify total amount
    if (abs($total - $expectedTotal) > 0.01) {
        throw new Exception("Total amount verification failed");
    }
    
    // Process each purchase
    foreach ($processedItems as $item) {
        $content = $item['content'];
        $price = $item['price'];
        
        // Create transaction record
        $stmt = $pdo->prepare("
            INSERT INTO transactions (
                buyer_id, seller_id, content_id, amount, 
                paypal_payment_id, status, created_at
            ) VALUES (?, ?, ?, ?, ?, 'completed', NOW())
        ");
        $stmt->execute([
            $userId,
            $content['seller_id'],
            $content['id'],
            $price,
            $paymentId
        ]);
        
        $transactionId = $pdo->lastInsertId();
        
        // Grant access to content
        $stmt = $pdo->prepare("
            INSERT INTO user_downloads (
                user_id, content_id, transaction_id, 
                download_count, first_downloaded_at
            ) VALUES (?, ?, ?, 0, NOW())
        ");
        $stmt->execute([
            $userId,
            $content['id'],
            $transactionId
        ]);
        
        // Update content download count
        $stmt = $pdo->prepare("
            UPDATE content 
            SET downloads_count = downloads_count + 1 
            WHERE id = ?
        ");
        $stmt->execute([$content['id']]);
    }
    
    $pdo->commit();
    
    // Log successful payment
    error_log("Payment processed: User {$userId}, Payment ID: {$paymentId}, Total: {$total}");
    
    echo json_encode([
        'success' => true,
        'message' => 'Payment processed successfully',
        'payment_id' => $paymentId,
        'items_purchased' => count($processedItems),
        'total_amount' => $total
    ]);
    
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollback();
    }
    
    error_log("Payment processing error: " . $e->getMessage());
    echo json_encode([
        'success' => false, 
        'message' => $e->getMessage()
    ]);
}
?>