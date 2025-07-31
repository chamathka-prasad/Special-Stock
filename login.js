// Login functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const googleLoginBtn = document.getElementById('googleLogin');

    // Get CSRF token
    fetch('get_csrf_token.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.querySelector('meta[name="csrf-token"]').setAttribute('content', data.token);
            }
        })
        .catch(console.error);

    // Check if user is already logged in
    checkLoginStatus();

    // Form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const data = Object.fromEntries(formData.entries());
        
        // Validate form
        if (!validateEmail(data.email)) {
            showAlert('Please enter a valid email address', 'error');
            return;
        }
        
        if (!data.password) {
            showAlert('Password is required', 'error');
            return;
        }

        try {
            showLoading(true);
            
            const response = await fetch('login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showAlert('Login successful!', 'success');
                
                // Store user info in localStorage for client-side access
                localStorage.setItem('user', JSON.stringify(result.user));
                
                setTimeout(() => {
                    // Redirect based on user role
                    if (result.user.role === 'admin') {
                        window.location.href = 'admin_dashboard.html';
                    } else if (result.user.role === 'seller') {
                        window.location.href = 'seller_dashboard.html';
                    } else {
                        window.location.href = 'index.html';
                    }
                }, 1000);
            } else {
                showAlert(result.message || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showAlert('Login failed. Please try again.', 'error');
        } finally {
            showLoading(false);
        }
    });

    // Google login
    googleLoginBtn.addEventListener('click', function() {
        window.location.href = 'google_auth.php';
    });
});

// Check if user is already logged in
async function checkLoginStatus() {
    try {
        const response = await fetch('check_login.php');
        const result = await response.json();
        
        if (result.success && result.logged_in) {
            // User is already logged in, redirect to appropriate dashboard
            if (result.user.role === 'admin') {
                window.location.href = 'admin_dashboard.html';
            } else if (result.user.role === 'seller') {
                window.location.href = 'seller_dashboard.html';
            } else {
                window.location.href = 'index.html';
            }
        }
    } catch (error) {
        console.error('Login status check error:', error);
    }
}

// Auto-fill form if user details are in URL params (for testing)
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('email')) {
    document.getElementById('email').value = urlParams.get('email');
}
if (urlParams.has('password')) {
    document.getElementById('password').value = urlParams.get('password');
}