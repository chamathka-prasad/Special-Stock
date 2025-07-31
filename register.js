// Registration functionality
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordStrengthDiv = document.getElementById('passwordStrength');
    const googleRegisterBtn = document.getElementById('googleRegister');

    // Get CSRF token
    fetch('get_csrf_token.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.querySelector('meta[name="csrf-token"]').setAttribute('content', data.token);
            }
        })
        .catch(console.error);

    // Password strength checker
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        const strength = validatePassword(password);
        
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
        
        passwordStrengthDiv.textContent = strengthText;
        passwordStrengthDiv.className = `mt-2 text-sm ${strengthClass}`;
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

    // Form submission
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const data = Object.fromEntries(formData.entries());
        
        // Validate form
        if (!validateEmail(data.email)) {
            showAlert('Please enter a valid email address', 'error');
            return;
        }
        
        if (!validatePassword(data.password).valid) {
            showAlert('Password does not meet requirements', 'error');
            return;
        }
        
        if (data.password !== data.confirm_password) {
            showAlert('Passwords do not match', 'error');
            return;
        }
        
        if (!data.agree_terms) {
            showAlert('Please agree to the Terms of Service', 'error');
            return;
        }

        try {
            showLoading(true);
            
            const response = await fetch('register.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showAlert('Registration successful! Please check your email to verify your account.', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                showAlert(result.message || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showAlert('Registration failed. Please try again.', 'error');
        } finally {
            showLoading(false);
        }
    });

    // Google registration
    googleRegisterBtn.addEventListener('click', function() {
        window.location.href = 'google_auth.php';
    });
});

// Email validation on blur
document.getElementById('email').addEventListener('blur', async function() {
    const email = this.value.trim();
    
    if (!email || !validateEmail(email)) {
        return;
    }
    
    try {
        const response = await fetch('check_email.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({email: email})
        });
        
        const result = await response.json();
        
        if (!result.available) {
            showAlert('This email is already registered', 'error');
            this.focus();
        }
    } catch (error) {
        console.error('Email check error:', error);
    }
});