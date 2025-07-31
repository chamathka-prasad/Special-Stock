-- Stock Media Platform Database Schema
-- Updated: July 30, 2025
-- Complete schema for all 15 processes

CREATE DATABASE IF NOT EXISTS stock_media_platformai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE stock_media_platformai;

-- Users table (Enhanced for all authentication methods)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- NULL for social login only users
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role ENUM('buyer', 'seller', 'admin') DEFAULT 'buyer',
    google_id VARCHAR(255) UNIQUE NULL,
    facebook_id VARCHAR(255) UNIQUE NULL,
    apple_id VARCHAR(255) UNIQUE NULL,
    profile_image VARCHAR(500),
    country VARCHAR(100),
    bio TEXT,
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_notifications BOOLEAN DEFAULT TRUE,
    marketing_emails BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(32),
    last_login TIMESTAMP NULL,
    login_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_social_ids (google_id, facebook_id, apple_id),
    INDEX idx_active (is_active),
    INDEX idx_created (created_at)
);

-- Content table (Enhanced for all content types and metadata)
CREATE TABLE content (
    id INT PRIMARY KEY AUTO_INCREMENT,
    seller_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    keywords TEXT, -- Additional keywords for search
    file_type ENUM('image', 'video') NOT NULL,
    file_extension VARCHAR(10) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    watermarked_path VARCHAR(500),
    thumbnail_path VARCHAR(500),
    file_size BIGINT NOT NULL,
    width INT,
    height INT,
    duration INT, -- for videos in seconds
    aspect_ratio DECIMAL(5,3), -- width/height ratio
    is_free BOOLEAN DEFAULT FALSE,
    price DECIMAL(10,2) DEFAULT 0.00,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    rejection_reason TEXT,
    downloads_count INT DEFAULT 0,
    views_count INT DEFAULT 0,
    likes_count INT DEFAULT 0,
    featured BOOLEAN DEFAULT FALSE,
    mature_content BOOLEAN DEFAULT FALSE,
    license_type ENUM('standard', 'extended', 'editorial') DEFAULT 'standard',
    model_release BOOLEAN DEFAULT FALSE,
    property_release BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    approved_at TIMESTAMP NULL,
    approved_by INT NULL,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_seller (seller_id),
    INDEX idx_status (status),
    INDEX idx_type (file_type),
    INDEX idx_price (is_free, price),
    INDEX idx_created (created_at),
    INDEX idx_featured (featured),
    INDEX idx_downloads (downloads_count),
    INDEX idx_views (views_count),
    FULLTEXT idx_search (title, description, keywords)
);

-- Tags table (Enhanced with usage statistics)
CREATE TABLE tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    usage_count INT DEFAULT 0,
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_slug (slug),
    INDEX idx_usage (usage_count),
    INDEX idx_featured (featured)
);

-- Content tags junction table
CREATE TABLE content_tags (
    content_id INT NOT NULL,
    tag_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (content_id, tag_id),
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    INDEX idx_content (content_id),
    INDEX idx_tag (tag_id)
);

-- Categories table (For content organization)
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    parent_id INT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_name (name),
    INDEX idx_slug (slug),
    INDEX idx_parent (parent_id),
    INDEX idx_active (is_active)
);

-- Content categories junction table
CREATE TABLE content_categories (
    content_id INT NOT NULL,
    category_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (content_id, category_id),
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Transactions table (Enhanced for complete e-commerce)
CREATE TABLE transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    content_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method ENUM('paypal', 'stripe', 'credit_card', 'wallet') DEFAULT 'paypal',
    paypal_transaction_id VARCHAR(255),
    paypal_payment_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    status ENUM('pending', 'completed', 'cancelled', 'refunded', 'failed') DEFAULT 'pending',
    failure_reason TEXT,
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    refund_reason TEXT,
    billing_address JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    refunded_at TIMESTAMP NULL,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
    INDEX idx_transaction_number (transaction_number),
    INDEX idx_buyer (buyer_id),
    INDEX idx_seller (seller_id),
    INDEX idx_content (content_id),
    INDEX idx_status (status),
    INDEX idx_payment_method (payment_method),
    INDEX idx_created (created_at),
    INDEX idx_paypal (paypal_transaction_id)
);

-- User downloads table (Enhanced for complete download tracking)
CREATE TABLE user_downloads (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    content_id INT NOT NULL,
    transaction_id INT NULL, -- NULL for free content
    download_token VARCHAR(64), -- For secure downloads
    download_count INT DEFAULT 0,
    last_download_ip VARCHAR(45),
    last_download_user_agent TEXT,
    first_downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL, -- For limited-time access
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_content (user_id, content_id),
    INDEX idx_user (user_id),
    INDEX idx_content (content_id),
    INDEX idx_transaction (transaction_id),
    INDEX idx_token (download_token),
    INDEX idx_expires (expires_at)
);

-- Shopping cart table (For persistent cart storage)
CREATE TABLE shopping_cart (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL, -- NULL for guest carts
    session_id VARCHAR(128), -- For guest users
    content_id INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 30 DAY),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_content (user_id, content_id),
    UNIQUE KEY unique_session_content (session_id, content_id),
    INDEX idx_user (user_id),
    INDEX idx_session (session_id),
    INDEX idx_content (content_id),
    INDEX idx_expires (expires_at)
);

-- Wishlists table
CREATE TABLE wishlists (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    content_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_content (user_id, content_id),
    INDEX idx_user (user_id),
    INDEX idx_content (content_id)
);

-- Content reviews/ratings table
CREATE TABLE content_reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    content_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    helpful_votes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_content (user_id, content_id),
    INDEX idx_user (user_id),
    INDEX idx_content (content_id),
    INDEX idx_rating (rating),
    INDEX idx_created (created_at)
);

-- Password reset tokens table
CREATE TABLE password_reset_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at),
    INDEX idx_used (used)
);

-- Email verification tokens table
CREATE TABLE email_verification_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at)
);

-- User sessions table (Enhanced for security)
CREATE TABLE user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    refresh_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_info VARCHAR(255),
    location VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (session_token),
    INDEX idx_refresh_token (refresh_token),
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at),
    INDEX idx_active (is_active),
    INDEX idx_last_activity (last_activity)
);

-- Content views tracking table
CREATE TABLE content_views (
    id INT PRIMARY KEY AUTO_INCREMENT,
    content_id INT NOT NULL,
    user_id INT NULL, -- NULL for anonymous views
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer VARCHAR(500),
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_duration INT DEFAULT 0, -- seconds
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_content (content_id),
    INDEX idx_user (user_id),
    INDEX idx_viewed_at (viewed_at),
    INDEX idx_ip (ip_address)
);

-- Search history table
CREATE TABLE search_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    session_id VARCHAR(128),
    search_query VARCHAR(500) NOT NULL,
    results_count INT DEFAULT 0,
    filters_applied JSON,
    clicked_content_id INT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (clicked_content_id) REFERENCES content(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_session (session_id),
    INDEX idx_query (search_query(50)),
    INDEX idx_created (created_at),
    FULLTEXT idx_search_query (search_query)
);

-- Notifications table
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    type ENUM('content_approved', 'content_rejected', 'sale_made', 'purchase_complete', 'system', 'marketing') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSON, -- Additional notification data
    is_read BOOLEAN DEFAULT FALSE,
    is_sent BOOLEAN DEFAULT FALSE, -- For email notifications
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_type (type),
    INDEX idx_read (is_read),
    INDEX idx_created (created_at),
    INDEX idx_expires (expires_at)
);

-- System settings table
CREATE TABLE system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE, -- Can be accessed by frontend
    updated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_key (setting_key),
    INDEX idx_public (is_public)
);

-- Audit log table
CREATE TABLE audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_table (table_name),
    INDEX idx_record (record_id),
    INDEX idx_created (created_at)
);

-- Insert default admin user (password: 'password')
INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified, is_active, created_at) 
VALUES ('admin@stockmedia.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'User', 'admin', TRUE, TRUE, NOW());

-- Insert sample categories
INSERT INTO categories (name, slug, description, icon, sort_order, is_active) VALUES 
('Business', 'business', 'Professional business imagery and concepts', '💼', 1, TRUE),
('Technology', 'technology', 'Tech, gadgets, and digital innovation', '💻', 2, TRUE),
('Nature', 'nature', 'Natural landscapes, wildlife, and outdoor scenes', '🌿', 3, TRUE),
('People', 'people', 'Lifestyle, portraits, and human activities', '👥', 4, TRUE),
('Abstract', 'abstract', 'Abstract art, patterns, and creative designs', '🎨', 5, TRUE),
('Food', 'food', 'Culinary photography and food styling', '🍽️', 6, TRUE),
('Travel', 'travel', 'Destinations, landmarks, and travel experiences', '✈️', 7, TRUE),
('Architecture', 'architecture', 'Buildings, structures, and architectural details', '🏢', 8, TRUE),
('Health', 'health', 'Healthcare, wellness, and medical imagery', '🏥', 9, TRUE),
('Education', 'education', 'Learning, schools, and educational content', '📚', 10, TRUE);

-- Insert sample tags with slugs
INSERT INTO tags (name, slug, usage_count, featured) VALUES 
('business', 'business', 0, TRUE),
('technology', 'technology', 0, TRUE),
('nature', 'nature', 0, TRUE),
('people', 'people', 0, TRUE),
('abstract', 'abstract', 0, TRUE),
('food', 'food', 0, TRUE),
('travel', 'travel', 0, TRUE),
('lifestyle', 'lifestyle', 0, TRUE),
('architecture', 'architecture', 0, TRUE),
('animals', 'animals', 0, FALSE),
('sports', 'sports', 0, FALSE),
('music', 'music', 0, FALSE),
('education', 'education', 0, FALSE),
('healthcare', 'healthcare', 0, FALSE),
('finance', 'finance', 0, FALSE),
('marketing', 'marketing', 0, FALSE),
('design', 'design', 0, FALSE),
('photography', 'photography', 0, FALSE),
('illustration', 'illustration', 0, FALSE),
('vintage', 'vintage', 0, FALSE);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('site_name', 'SpecialStock AI', 'string', 'Website name', TRUE),
('site_tagline', 'Premium Stock Media Platform', 'string', 'Website tagline', TRUE),
('platform_fee_rate', '0.05', 'number', 'Platform fee rate (5%)', FALSE),
('tax_rate', '0.08', 'number', 'Tax rate (8%)', FALSE),
('max_file_size', '52428800', 'number', 'Maximum file size in bytes (50MB)', FALSE),
('allowed_image_types', '["image/jpeg","image/png","image/webp"]', 'json', 'Allowed image MIME types', FALSE),
('allowed_video_types', '["video/mp4","video/avi","video/mov"]', 'json', 'Allowed video MIME types', FALSE),
('email_notifications_enabled', 'true', 'boolean', 'Enable email notifications', FALSE),
('maintenance_mode', 'false', 'boolean', 'Maintenance mode status', TRUE),
('user_registration_enabled', 'true', 'boolean', 'Allow new user registrations', TRUE),
('google_oauth_enabled', 'true', 'boolean', 'Enable Google OAuth login', TRUE),
('paypal_enabled', 'true', 'boolean', 'Enable PayPal payments', TRUE),
('auto_approve_sellers', 'false', 'boolean', 'Auto-approve seller applications', FALSE),
('content_moderation_enabled', 'true', 'boolean', 'Enable content moderation', FALSE),
('watermark_enabled', 'true', 'boolean', 'Enable automatic watermarking', FALSE);

-- Create indexes for better performance
CREATE INDEX idx_content_search ON content(status, file_type, is_free, featured, created_at);
CREATE INDEX idx_transactions_analytics ON transactions(status, created_at, amount);
CREATE INDEX idx_downloads_analytics ON user_downloads(user_id, first_downloaded_at);
CREATE INDEX idx_content_analytics ON content(seller_id, status, downloads_count, views_count);

-- Create views for common queries
CREATE VIEW content_with_stats AS
SELECT 
    c.*,
    u.first_name AS seller_first_name,
    u.last_name AS seller_last_name,
    u.email AS seller_email,
    COUNT(DISTINCT cv.id) AS total_views,
    COUNT(DISTINCT cr.id) AS total_reviews,
    AVG(cr.rating) AS average_rating,
    COUNT(DISTINCT ud.id) AS unique_downloads
FROM content c
LEFT JOIN users u ON c.seller_id = u.id
LEFT JOIN content_views cv ON c.id = cv.content_id
LEFT JOIN content_reviews cr ON c.id = cr.content_id
LEFT JOIN user_downloads ud ON c.id = ud.content_id
GROUP BY c.id;

CREATE VIEW user_stats AS
SELECT 
    u.*,
    COUNT(DISTINCT c.id) AS total_uploads,
    COUNT(DISTINCT CASE WHEN c.status = 'approved' THEN c.id END) AS approved_uploads,
    COUNT(DISTINCT t.id) AS total_sales,
    COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.amount END), 0) AS total_earnings,
    COUNT(DISTINCT ud.id) AS total_purchases,
    COUNT(DISTINCT ud2.id) AS total_downloads
FROM users u
LEFT JOIN content c ON u.id = c.seller_id
LEFT JOIN transactions t ON u.id = t.seller_id
LEFT JOIN transactions t2 ON u.id = t2.buyer_id
LEFT JOIN user_downloads ud ON u.id = ud.user_id AND ud.transaction_id IS NOT NULL
LEFT JOIN user_downloads ud2 ON u.id = ud2.user_id
GROUP BY u.id;

-- Add triggers for maintaining statistics
DELIMITER $$

CREATE TRIGGER update_tag_usage_count 
AFTER INSERT ON content_tags
FOR EACH ROW
BEGIN
    UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
END$$

CREATE TRIGGER decrease_tag_usage_count 
AFTER DELETE ON content_tags
FOR EACH ROW
BEGIN
    UPDATE tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
END$$

CREATE TRIGGER update_content_views_count 
AFTER INSERT ON content_views
FOR EACH ROW
BEGIN
    UPDATE content SET views_count = views_count + 1 WHERE id = NEW.content_id;
END$$

CREATE TRIGGER update_transaction_number 
BEFORE INSERT ON transactions
FOR EACH ROW
BEGIN
    IF NEW.transaction_number IS NULL OR NEW.transaction_number = '' THEN
        SET NEW.transaction_number = CONCAT('TXN-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(LAST_INSERT_ID(), 6, '0'));
    END IF;
END$$

DELIMITER ;

-- Add some sample data for testing (optional)
-- This will be populated when users start using the platform