// Profile page functionality
let currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    checkAuthAndInitialize();
});

async function checkAuthAndInitialize() {
    try {
        const response = await fetch('check_login.php');
        const result = await response.json();
        
        if (!result.success || !result.logged_in) {
            showAlert('Please log in to view your profile', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        currentUser = result.user;
        initializeProfile();
    } catch (error) {
        console.error('Auth check error:', error);
        showAlert('Error checking authentication', 'error');
    }
}

function initializeProfile() {
    // Get CSRF token
    fetch('get_csrf_token.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.querySelector('meta[name="csrf-token"]').setAttribute('content', data.token);
            }
        })
        .catch(console.error);

    // Load user profile data
    loadProfileData();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load account summary
    loadAccountSummary();
}

function loadProfileData() {
    if (!currentUser) return;
    
    // Fill profile form
    document.getElementById('firstName').value = currentUser.first_name || '';
    document.getElementById('lastName').value = currentUser.last_name || '';
    document.getElementById('email').value = currentUser.email || '';
    document.getElementById('role').value = currentUser.role || 'buyer';
    
    // Update profile display
    document.getElementById('profile-name').textContent = `${currentUser.first_name} ${currentUser.last_name}`;
    document.getElementById('profile-email').textContent = currentUser.email;
    
    // Show seller actions if user is a seller
    if (currentUser.role === 'seller' || currentUser.role === 'admin') {
        document.getElementById('seller-actions').classList.remove('hidden');
    }
}

function setupEventListeners() {
    const profileForm = document.getElementById('profile-form');
    const passwordForm = document.getElementById('password-form');
    const passwordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmNewPassword');
    const logoutBtn = document.getElementById('logout-btn');
    const exportDataBtn = document.getElementById('export-data-btn');
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

    // Profile form submission
    profileForm.addEventListener('submit', handleProfileUpdate);
    
    // Password form submission
    passwordForm.addEventListener('submit', handlePasswordChange);
    
    // Password strength checker
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        const strength = validatePassword(password);
        const strengthDiv = document.getElementById('passwordStrength');
        
        let strengthText = '';
        let strengthClass = '';
        
        if (password.length === 0) {
            strengthText = '';
        } else if (strength.valid) {
            strengthText = '✓ Strong password';
            strengthClass = 'text-green-600';
        } else {
            const missing = [];
            if (!strength.minLength) missing.push('8+ characters');
            if (!strength.hasUpperCase) missing.push('uppercase letter');
            if (!strength.hasLowerCase) missing.push('lowercase letter');
            if (!strength.hasNumbers) missing.push('number');
            
            strengthText = `Password needs: ${missing.join(', ')}`;
            strengthClass = 'text-red-600';
        }
        
        strengthDiv.textContent = strengthText;
        strengthDiv.className = `mt-2 text-sm ${strengthClass}`;
    });
    
    // Confirm password validation
    confirmPasswordInput.addEventListener('input', function() {
        const password = passwordInput.value;
        const confirmPassword = this.value;
        
        if (confirmPassword && password !== confirmPassword) {
            this.setCustomValidity('Passwords do not match');
        } else {
            this.setCustomValidity('');
        }
    });
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Export data
    exportDataBtn.addEventListener('click', handleExportData);
    
    // Delete account
    deleteAccountBtn.addEventListener('click', function() {
        openModal('delete-modal');
    });
    
    confirmDeleteBtn.addEventListener('click', handleDeleteAccount);
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        showLoading(true);
        
        const response = await fetch('update_profile.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentUser = { ...currentUser, ...result.user };
            document.getElementById('profile-name').textContent = `${currentUser.first_name} ${currentUser.last_name}`;
            
            // Show/hide seller actions based on role
            if (currentUser.role === 'seller' || currentUser.role === 'admin') {
                document.getElementById('seller-actions').classList.remove('hidden');
            } else {
                document.getElementById('seller-actions').classList.add('hidden');
            }
            
            showAlert('Profile updated successfully!', 'success');
        } else {
            throw new Error(result.message || 'Profile update failed');
        }
    } catch (error) {
        console.error('Profile update error:', error);
        showAlert(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function handlePasswordChange(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // Validate new password
    if (!validatePassword(data.new_password).valid) {
        showAlert('New password does not meet requirements', 'error');
        return;
    }
    
    if (data.new_password !== data.confirm_new_password) {
        showAlert('New passwords do not match', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch('change_password.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('password-form').reset();
            document.getElementById('passwordStrength').textContent = '';
            showAlert('Password changed successfully!', 'success');
        } else {
            throw new Error(result.message || 'Password change failed');
        }
    } catch (error) {
        console.error('Password change error:', error);
        showAlert(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function loadAccountSummary() {
    try {
        const response = await fetch('get_user_summary.php');
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('total-purchases').textContent = result.summary.total_purchases.toLocaleString();
            document.getElementById('total-downloads').textContent = result.summary.total_downloads.toLocaleString();
            document.getElementById('join-date').textContent = new Date(result.summary.join_date).toLocaleDateString();
        }
    } catch (error) {
        console.error('Error loading account summary:', error);
    }
}

async function handleLogout() {
    try {
        const response = await fetch('logout.php', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            localStorage.removeItem('user');
            showAlert('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function handleExportData() {
    // Create a form to download user data
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'export_user_data.php';
    form.style.display = 'none';
    
    const csrfInput = document.createElement('input');
    csrfInput.type = 'hidden';
    csrfInput.name = 'csrf_token';
    csrfInput.value = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    form.appendChild(csrfInput);
    
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
    
    showAlert('Data export started. Download will begin shortly.', 'info');
}

async function handleDeleteAccount() {
    const confirmation = document.getElementById('delete-confirmation').value;
    
    if (confirmation !== 'DELETE') {
        showAlert('Please type "DELETE" to confirm', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch('delete_account.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: JSON.stringify({ confirm: 'DELETE' })
        });
        
        const result = await response.json();
        
        if (result.success) {
            localStorage.removeItem('user');
            showAlert('Account deleted successfully', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            throw new Error(result.message || 'Account deletion failed');
        }
    } catch (error) {
        console.error('Delete account error:', error);
        showAlert(error.message, 'error');
    } finally {
        showLoading(false);
        closeModal('delete-modal');
    }
}