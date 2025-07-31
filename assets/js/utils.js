// Utility functions for Stock Media Platform

// API helper function
async function apiCall(url, method = 'GET', data = null, includeAuth = true) {
    const config = {
        method,
        headers: {
            'Content-Type': 'application/json',
        }
    };

    // Add CSRF token for POST, PUT, DELETE requests
    if (method !== 'GET' && includeAuth) {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (csrfToken) {
            config.headers['X-CSRF-Token'] = csrfToken;
        }
    }

    if (data) {
        config.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, config);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'API request failed');
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Form submission helper
async function submitForm(formElement, url, onSuccess = null, onError = null) {
    const formData = new FormData(formElement);
    const data = Object.fromEntries(formData.entries());
    
    try {
        showLoading(true);
        const result = await apiCall(url, 'POST', data);
        
        if (result.success) {
            if (onSuccess) {
                onSuccess(result);
            } else {
                showAlert('Success!', 'success');
            }
        } else {
            throw new Error(result.message || 'Form submission failed');
        }
    } catch (error) {
        if (onError) {
            onError(error);
        } else {
            showAlert(error.message, 'error');
        }
    } finally {
        showLoading(false);
    }
}

// File upload helper
async function uploadFile(fileInput, url, additionalData = {}, onProgress = null) {
    const formData = new FormData();
    
    if (fileInput.files.length === 0) {
        throw new Error('No file selected');
    }
    
    formData.append('file', fileInput.files[0]);
    
    // Add additional data
    Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
    });
    
    // Add CSRF token
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (csrfToken) {
        formData.append('csrf_token', csrfToken);
    }
    
    try {
        const xhr = new XMLHttpRequest();
        
        return new Promise((resolve, reject) => {
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    onProgress(percentComplete);
                }
            });
            
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    try {
                        const result = JSON.parse(xhr.responseText);
                        if (result.success) {
                            resolve(result);
                        } else {
                            reject(new Error(result.message || 'Upload failed'));
                        }
                    } catch (e) {
                        reject(new Error('Invalid response format'));
                    }
                } else {
                    reject(new Error('Upload failed'));
                }
            });
            
            xhr.addEventListener('error', () => {
                reject(new Error('Upload failed'));
            });
            
            xhr.open('POST', url);
            xhr.send(formData);
        });
    } catch (error) {
        throw error;
    }
}

// Show/hide loading indicator
function showLoading(show = true) {
    let loader = document.getElementById('global-loader');
    
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.innerHTML = '<div class="spinner"></div> Loading...';
        loader.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            z-index: 9999;
            display: none;
        `;
        document.body.appendChild(loader);
    }
    
    loader.style.display = show ? 'block' : 'none';
}

// Show alert messages
function showAlert(message, type = 'info', duration = 5000) {
    const alertContainer = document.getElementById('alert-container') || createAlertContainer();
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="alert-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    alertContainer.appendChild(alert);
    
    // Auto remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, duration);
    }
}

function createAlertContainer() {
    const container = document.createElement('div');
    container.id = 'alert-container';
    container.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        min-width: 300px;
        max-width: 500px;
    `;
    document.body.appendChild(container);
    return container;
}

// Format currency
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Validate email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validate password strength
function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    return {
        valid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers,
        minLength: password.length >= minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasSpecialChar
    };
}

// Debounce function
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

// Modal helper functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Initialize modal close handlers
document.addEventListener('DOMContentLoaded', function() {
    // Close modal when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
    
    // Close modal with escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal[style*="block"]');
            if (openModal) {
                openModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        }
    });
});

// Shopping cart functions (using localStorage)
const Cart = {
    getItems() {
        return JSON.parse(localStorage.getItem('cart')) || [];
    },
    
    addItem(item) {
        const items = this.getItems();
        const existingItem = items.find(i => i.id === item.id);
        
        if (!existingItem) {
            items.push(item);
            localStorage.setItem('cart', JSON.stringify(items));
            this.updateCartCount();
            showAlert('Item added to cart!', 'success');
        } else {
            showAlert('Item already in cart!', 'info');
        }
    },
    
    removeItem(itemId) {
        const items = this.getItems();
        const filteredItems = items.filter(i => i.id !== itemId);
        localStorage.setItem('cart', JSON.stringify(filteredItems));
        this.updateCartCount();
        showAlert('Item removed from cart!', 'success');
    },
    
    clear() {
        localStorage.removeItem('cart');
        this.updateCartCount();
    },
    
    updateCartCount() {
        const count = this.getItems().length;
        const cartCountElements = document.querySelectorAll('.cart-count');
        cartCountElements.forEach(el => {
            el.textContent = count;
        });
    },
    
    getTotal() {
        const items = this.getItems();
        return items.reduce((total, item) => total + parseFloat(item.price || 0), 0);
    }
};

// Initialize cart count on page load
document.addEventListener('DOMContentLoaded', function() {
    Cart.updateCartCount();
});

// Image preview helper
function previewImage(input, previewElementId) {
    const file = input.files[0];
    const preview = document.getElementById(previewElementId);
    
    if (file && preview) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showAlert('Copied to clipboard!', 'success');
    }).catch(() => {
        showAlert('Failed to copy to clipboard!', 'error');
    });
}

// Confirm action
function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}