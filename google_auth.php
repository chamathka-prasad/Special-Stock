<?php
require_once 'config/config.php';

// Google OAuth 2.0 Configuration
class GoogleAuth {
    private $client_id;
    private $client_secret;
    private $redirect_uri;
    
    public function __construct() {
        $this->client_id = GOOGLE_CLIENT_ID;
        $this->client_secret = GOOGLE_CLIENT_SECRET;
        $this->redirect_uri = GOOGLE_REDIRECT_URI;
    }
    
    public function getAuthUrl() {
        $params = array(
            'client_id' => $this->client_id,
            'redirect_uri' => $this->redirect_uri,
            'scope' => 'email profile',
            'response_type' => 'code',
            'access_type' => 'online',
            'state' => $this->generateState()
        );
        
        return 'https://accounts.google.com/o/oauth2/auth?' . http_build_query($params);
    }
    
    public function handleCallback($code, $state) {
        // Verify state parameter
        if (!$this->verifyState($state)) {
            throw new Exception('Invalid state parameter');
        }
        
        // Exchange code for access token
        $token_data = $this->getAccessToken($code);
        
        if (!$token_data) {
            throw new Exception('Failed to get access token');
        }
        
        // Get user info
        $user_info = $this->getUserInfo($token_data['access_token']);
        
        if (!$user_info) {
            throw new Exception('Failed to get user information');
        }
        
        return $this->processUser($user_info);
    }
    
    private function getAccessToken($code) {
        $data = array(
            'client_id' => $this->client_id,
            'client_secret' => $this->client_secret,
            'redirect_uri' => $this->redirect_uri,
            'grant_type' => 'authorization_code',
            'code' => $code
        );
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://oauth2.googleapis.com/token');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/x-www-form-urlencoded'));
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($http_code !== 200) {
            error_log("Google token request failed: HTTP $http_code - $response");
            return false;
        }
        
        return json_decode($response, true);
    }
    
    private function getUserInfo($access_token) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://www.googleapis.com/oauth2/v2/userinfo');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'Authorization: Bearer ' . $access_token
        ));
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($http_code !== 200) {
            error_log("Google user info request failed: HTTP $http_code - $response");
            return false;
        }
        
        return json_decode($response, true);
    }
    
    private function processUser($user_info) {
        try {
            $pdo = getDBConnection();
            
            // Check if user exists by Google ID
            $stmt = $pdo->prepare("SELECT * FROM users WHERE google_id = ?");
            $stmt->execute([$user_info['id']]);
            $user = $stmt->fetch();
            
            if ($user) {
                // User exists, update their info
                $stmt = $pdo->prepare("
                    UPDATE users 
                    SET first_name = ?, last_name = ?, email = ?, email_verified = TRUE 
                    WHERE google_id = ?
                ");
                $stmt->execute([
                    $user_info['given_name'] ?? '',
                    $user_info['family_name'] ?? '',
                    $user_info['email'],
                    $user_info['id']
                ]);
                
                $userId = $user['id'];
            } else {
                // Check if email exists
                $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
                $stmt->execute([$user_info['email']]);
                $existing_user = $stmt->fetch();
                
                if ($existing_user) {
                    // Link Google account to existing user
                    $stmt = $pdo->prepare("UPDATE users SET google_id = ?, email_verified = TRUE WHERE email = ?");
                    $stmt->execute([$user_info['id'], $user_info['email']]);
                    $userId = $existing_user['id'];
                } else {
                    // Create new user
                    $stmt = $pdo->prepare("
                        INSERT INTO users (email, first_name, last_name, google_id, role, email_verified, created_at) 
                        VALUES (?, ?, ?, ?, 'buyer', TRUE, NOW())
                    ");
                    $stmt->execute([
                        $user_info['email'],
                        $user_info['given_name'] ?? '',
                        $user_info['family_name'] ?? '',
                        $user_info['id']
                    ]);
                    $userId = $pdo->lastInsertId();
                }
            }
            
            // Get complete user data
            $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch();
            
            return $user;
            
        } catch (Exception $e) {
            error_log("Google auth user processing error: " . $e->getMessage());
            throw new Exception('Failed to process user data');
        }
    }
    
    private function generateState() {
        $state = bin2hex(random_bytes(16));
        $_SESSION['google_oauth_state'] = $state;
        return $state;
    }
    
    private function verifyState($state) {
        return isset($_SESSION['google_oauth_state']) && 
               hash_equals($_SESSION['google_oauth_state'], $state);
    }
}

// Handle Google OAuth callback
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['code'])) {
    try {
        $google_auth = new GoogleAuth();
        $user = $google_auth->handleCallback($_GET['code'], $_GET['state'] ?? '');
        
        if ($user) {
            // Create session
            $sessionToken = generateRandomString(64);
            $expiresAt = date('Y-m-d H:i:s', time() + SESSION_LIFETIME);
            
            $pdo = getDBConnection();
            $stmt = $pdo->prepare("
                INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent) 
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $user['id'],
                $sessionToken,
                $expiresAt,
                $_SERVER['REMOTE_ADDR'] ?? null,
                $_SERVER['HTTP_USER_AGENT'] ?? null
            ]);
            
            // Set session variables
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['user_role'] = $user['role'];
            $_SESSION['session_token'] = $sessionToken;
            $_SESSION['login_time'] = time();
            
            // Redirect based on role
            if ($user['role'] === 'admin') {
                header('Location: admin_dashboard.html');
            } elseif ($user['role'] === 'seller') {
                header('Location: seller_dashboard.html');
            } else {
                header('Location: index.html');
            }
            exit;
        }
        
    } catch (Exception $e) {
        error_log("Google OAuth error: " . $e->getMessage());
        header('Location: login.html?error=' . urlencode('Google login failed'));
        exit;
    }
}

// Generate Google auth URL
if ($_SERVER['REQUEST_METHOD'] === 'GET' && !isset($_GET['code'])) {
    try {
        $google_auth = new GoogleAuth();
        $auth_url = $google_auth->getAuthUrl();
        header('Location: ' . $auth_url);
        exit;
    } catch (Exception $e) {
        error_log("Google OAuth URL generation error: " . $e->getMessage());
        header('Location: login.html?error=' . urlencode('Google login unavailable'));
        exit;
    }
}
?>